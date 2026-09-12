import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stackBreakdown,materialQuantity,calculateBundle} from '../dist/dan-calculator.js';

test('現版組數保留完整組、零散數與實際堆疊數',()=>{
  assert.deepEqual(stackBreakdown(250,100),{quantity:250,stackSize:100,fullStacks:2,remainder:50,occupiedStacks:3});
  assert.equal(stackBreakdown(200,100).occupiedStacks,2);
  assert.equal(stackBreakdown(0,100).occupiedStacks,0);
});
test('外層舊組數取整前的個數可重算，先合併份數再取整',()=>{
  assert.equal(materialQuantity(7.5),8);
  assert.equal(materialQuantity(7.5,2),15);
  assert.equal(materialQuantity(30),30);
});
test('缺個數或缺現版stack不顯示為零材料',()=>{
  const result=calculateBundle({materials:[{name:'A',quantity:null,sourceGroups:3},{name:'B',quantity:21}]},{A:{currentStack:100}});
  assert.equal(result.unknownQuantities,1);assert.equal(result.unknownStacks,2);
  assert.equal(result.rows[0].quantity,null);assert.equal(result.rows[1].occupiedStacks,null);
});
test('原表組數與現版组數分開，覆寫只改堆疊容量',()=>{
  const bundle={materials:[{name:'鐵塊',quantity:30,sourceGroups:2,oldStack:20}]};
  const result=calculateBundle(bundle,{'鐵塊':{currentStack:100}},2,{'鐵塊':20});
  assert.equal(result.rows[0].quantity,60);assert.equal(result.rows[0].sourceGroups,4);assert.equal(result.rows[0].occupiedStacks,3);
});
test('拒絕零容量、小數份數、空值與溢位',()=>{
  for(const invalid of [0,-1,1.5,'',Infinity])assert.throws(()=>stackBreakdown(10,invalid));
  assert.throws(()=>materialQuantity(10,1.5));assert.throws(()=>materialQuantity(Number.MAX_SAFE_INTEGER,2));
});

const data=JSON.parse(readFileSync(new URL('../dist/data/dan.json',import.meta.url),'utf8'));
const sheet=name=>data.sheets.find(s=>s.name===name);
test('整套明細不重複加入購買摘要，鐵塊107個只佔2組',()=>{
  const view=sheet('打鐵(1)').sections.find(s=>s.name==='迪歐斯').views[0];
  const row=calculateBundle(view,data.items).rows.find(r=>r.name==='鐵塊');
  assert.equal(row.sourceGroups,7);assert.equal(row.quantity,107);assert.equal(row.stackSize,100);
  assert.equal(row.fullStacks,1);assert.equal(row.remainder,7);assert.equal(row.occupiedStacks,2);
  assert.equal(calculateBundle(view,data.items,2).rows.find(r=>r.name==='鐵塊').quantity,213);
});
test('第一輪按官方新目標換算，原表數字仍保留',()=>{
  const sec=sheet('魔製(1)').sections.find(s=>s.name==='希里原');
  assert.equal(calculateBundle(sec.views[0],data.items).rows[0].quantity,75);
  assert.ok(sec.views.some(v=>v.label.startsWith('目標製作')&&v.materials[0].quantity===150));
  const engineering=sheet('工學(1)').sections.find(s=>s.name==='稀原');
  assert.equal(calculateBundle(engineering.views[0],data.items).rows[0].quantity,40);
});
test('缺計算的製作列保持未知，係數衝突保留警示',()=>{
  const ella=sheet('製衣(2)').sections.find(s=>s.name==='愛拉背心短裙');
  const rows=calculateBundle(ella.views[0],data.items).rows;
  assert.ok(rows.filter(r=>['高布','廉絲','優繩'].includes(r.name)).every(r=>r.quantity===null));
  const ninja=sheet('製衣(2)').sections.find(s=>s.name==='柯列斯忍者服');
  const cloth=calculateBundle(ninja.views[0],data.items).rows.find(r=>r.name==='普布');
  assert.equal(cloth.quantity,5);assert.match(cloth.warning,/公式卻用/);
});
test('移除的是皇家武器，保留一般凱爾特考題參考',()=>{
  assert.equal(sheet('打鐵(3)').sections.find(s=>s.name==='凱爾特皇家騎士劍').status,'removed');
  assert.notEqual(sheet('打鐵(2)').sections.find(s=>s.name==='凱爾特鬥錘').status,'removed');
});
test('全部來源步驟可計算，每項材料均有查核紀錄',()=>{
  const viewIds=new Set();
  for(const s of data.sheets)for(const section of s.sections)for(const view of section.views){
    assert.ok(!viewIds.has(view.id));viewIds.add(view.id);
    const result=calculateBundle(view,data.items);
    for(const row of result.rows){assert.ok(Object.hasOwn(data.items,row.name),row.name);assert.ok(row.quantity===null||Number.isSafeInteger(row.quantity));assert.ok(row.occupiedStacks===null||row.occupiedStacks>=0);}
  }
  assert.equal(data.sheets.length,13);
});
test('手動清空保持未定量，填0表示確實不需要',()=>{
  const bundle={materials:[{id:'a',name:'A',quantity:10}]};
  assert.equal(calculateBundle(bundle,{A:{currentStack:100}},1,{}, {a:''}).rows[0].quantity,null);
  assert.equal(calculateBundle(bundle,{A:{currentStack:100}},1,{}, {a:0}).rows[0].quantity,0);
});
