import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RANKS,calculateMultipliers,simulateSkill,taskPlan,recipeOptions} from '../dist/calculator.js';
const data=JSON.parse(readFileSync(new URL('../dist/data/skills.json',import.meta.url),'utf8'));
const skill=id=>data.skills.find(s=>s.id===id);
const task=id=>data.skills.flatMap(s=>s.ranks).flatMap(r=>r.tasks).find(t=>t.id===id);
const config={startRank:'F',targetRank:'E',progress:0,countMultiplier:8,valueMultiplier:1};
test('次數倍率封頂8，修練值倍率獨立',()=>assert.deepEqual(calculateMultipliers({countFactors:[2,2,2,2],reforge:1.2}),{rawCount:16,count:8,value:1.2,combined:9.6}));
test('打鐵F成功一次最多計數3，得120而非320',()=>assert.equal(taskPlan(task('blacksmith-F-9'),100,8,1).points,120));
test('手工藝紙鶴1倍值封頂90，1.2倍值7次得100.8',()=>{
  const t=task('handicraft-F-9');assert.equal(taskPlan(t,100,8,1).points,90);assert.equal(taskPlan(t,100,8,1).actions,8);
  assert.equal(taskPlan(t,100,8,1.2).actions,7);assert.ok(Math.abs(taskPlan(t,100,8,1.2).points-100.8)<1e-9);
});
test('材料依達成次數計，不乘修練倍率或除2',()=>{const r=simulateSkill(skill('blacksmith'),config);assert.equal(r.totalActions,1);assert.deepEqual(r.materials,[{name:'鐵塊',quantity:1}]);});
test('目標階排除，Rank1到1與已達100均無新增操作',()=>{
  assert.equal(simulateSkill(skill('blacksmith'),{...config,startRank:'2',targetRank:'1'}).stages.length,1);
  assert.equal(simulateSkill(skill('blacksmith'),{...config,startRank:'1',targetRank:'1'}).totalActions,0);
  assert.equal(simulateSkill(skill('blacksmith'),{...config,progress:100}).totalActions,0);
});
test('既有值不放大，已計數從上限扣除',()=>{
  const t=task('blacksmith-F-9');assert.equal(taskPlan(t,60,8,1,2).points,40);
  const r=simulateSkill(skill('blacksmith'),{...config,progress:40,valueMultiplier:2,completed:{[t.id]:2}});
  assert.equal(r.stages[0].startingPoints,40);assert.equal(r.stages[0].points,120);
});
test('空值負值非有限值與反向Rank拒絕計算',()=>{
  assert.throws(()=>calculateMultipliers({countEvent:''}));assert.throws(()=>simulateSkill(skill('blacksmith'),{...config,progress:-1}));
  assert.throws(()=>simulateSkill(skill('blacksmith'),{...config,countMultiplier:Infinity}));assert.throws(()=>simulateSkill(skill('blacksmith'),{...config,startRank:'1',targetRank:'F'}));
});
test('全部取消時回報不足',()=>{const enabled=Object.fromEntries(skill('blacksmith').ranks[0].tasks.map(t=>[t.id,false]));const r=simulateSkill(skill('blacksmith'),{...config,enabled});assert.equal(r.reachable,false);assert.equal(r.totalActions,0);assert.equal(r.stages[0].deficit,100);});
test('缺配方保留未知材料',()=>{const enabled=Object.fromEntries(skill('blacksmith').ranks[0].tasks.map(t=>[t.id,t.id==='blacksmith-F-8']));const r=simulateSkill(skill('blacksmith'),{...config,enabled});assert.equal(r.unknownTasks,1);assert.equal(r.reachable,false);});
test('換配方共用原項目上限，材料重新計算',()=>{const s=skill('stationery-craft'),t=s.ranks[0].tasks.find(t=>t.recommended);const r=simulateSkill(s,{...config,recipes:{[t.id]:'柔軟的羊皮紙(優)'}});assert.deepEqual(r.materials,[{name:'優皮',quantity:2}]);});
test('配方選項包含主配方與單一替代，切回時材料一致',()=>{
  const t=task('magic-craft-8-47');assert.equal(recipeOptions(t)[0].recipe,'神秘的香草粉');assert.ok(recipeOptions(t).some(v=>v.recipe==='淨化的兔子腳'));
  for(const s of data.skills)for(const rank of s.ranks)for(const item of rank.tasks){const options=recipeOptions(item);if(item.recipe)assert.ok(options.some(v=>v.recipe===item.recipe));}
});
test('進度歸零後不使用隱藏的舊計數',()=>{
  const r=simulateSkill(skill('blacksmith'),{...config,completed:{'blacksmith-F-9':3}});assert.equal(r.stages[0].points,120);assert.deepEqual(r.materials,[{name:'鐵塊',quantity:1}]);
});
test('9技能所有資料與倍率組合計算一致、次數不越界',()=>{
  assert.equal(data.skills.length,9);const ids=new Set();
  for(const s of data.skills){
    for(const c of [1,2,8])for(const v of [1,1.2,2]){
      const r=simulateSkill(s,{...config,targetRank:'1',countMultiplier:c,valueMultiplier:v});assert.equal(r.stages.length,RANKS.length-1);
      for(const stage of r.stages)for(const t of stage.tasks){assert.ok(Number.isInteger(t.actions)&&t.actions>=0);assert.ok(t.counted<=t.maxCount);assert.ok(Number.isFinite(t.points));}
      for(const m of r.materials)assert.ok(Number.isFinite(m.quantity)&&m.quantity>0);
    }
    for(const rank of s.ranks)for(const t of rank.tasks){assert.ok(!ids.has(t.id));ids.add(t.id);}
  }
});
