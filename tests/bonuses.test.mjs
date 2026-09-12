import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaultBonusSettings,bonusesAfterSkillChange,calculateSkillBonuses,equipmentOptions,SKILL_BONUS_PROFILES,COUNT_BONUSES} from '../dist/bonuses.js';
const base=()=>defaultBonusSettings();
test('初始為無加成，不假設活動、才能、藥水或寵物生效',()=>{
  for(const id of Object.keys(SKILL_BONUS_PROFILES)){
    const result=calculateSkillBonuses(id,base());assert.equal(result.count,1);assert.equal(result.value,1);
  }
  assert.ok(!COUNT_BONUSES.some(b=>b.id==='pet'));
});
test('2倍與3倍水只能選一種，沒有重複相乘路徑',()=>{
  assert.equal(calculateSkillBonuses('blacksmith',{...base(),potion:'complete'}).count,2);
  assert.equal(calculateSkillBonuses('blacksmith',{...base(),potion:'royal'}).count,3);
  assert.throws(()=>calculateSkillBonuses('blacksmith',{...base(),potion:['complete','royal']}));
});
test('藥水、才能與稜鏡的次數封頂8，修練值仍可超過8',()=>{
  const settings={...base(),potion:'royal',checked:{talent:true,'blue-prism':true},equipment:'echo:10',valuePet:true};
  const result=calculateSkillBonuses('blacksmith',settings);
  assert.equal(result.rawCount,12);assert.equal(result.count,8);assert.equal(result.value,4);assert.equal(result.combined,32);
});
test('一般修練詞條上限10，未列技能不得套用其他技能的詞條',()=>{
  assert.equal(calculateSkillBonuses('magic-craft',{...base(),equipment:'echo:10'}).value,2);
  assert.throws(()=>calculateSkillBonuses('magic-craft',{...base(),equipment:'reforge:10'}));
  assert.throws(()=>calculateSkillBonuses('blacksmith',{...base(),equipment:'echo:20'}));
  assert.throws(()=>calculateSkillBonuses('fynn-bead-burnishing',{...base(),equipment:'echo:1'}));
  assert.ok(!equipmentOptions('enchant').some(o=>o.id.startsWith('reforge:')));
});
test('徽章僅提供已核實相符的魔力賦予Druid選項',()=>{
  assert.equal(calculateSkillBonuses('enchant',{...base(),equipment:'druid-badge'}).value,1.5);
  assert.throws(()=>calculateSkillBonuses('tailoring',{...base(),equipment:'druid-badge'}));
});
test('農場固定1.2或1.5且只涵蓋對應才能',()=>{
  assert.equal(calculateSkillBonuses('handicraft',{...base(),location:'workshop-1'}).value,1.2);
  assert.equal(calculateSkillBonuses('blacksmith',{...base(),location:'workshop-2',valuePet:true}).value,3);
  assert.throws(()=>calculateSkillBonuses('hillwen-engineering',{...base(),location:'workshop-2'}));
});
test('Cat只增加修練值，魔工希工依現版Pet Training保留',()=>{
  for(const id of ['magic-craft','hillwen-engineering']){
    assert.equal(SKILL_BONUS_PROFILES[id].catTalent,'Pet Training');
    const result=calculateSkillBonuses(id,{...base(),valuePet:true});assert.equal(result.count,1);assert.equal(result.value,2);
  }
  assert.equal(SKILL_BONUS_PROFILES.enchant.catType,'戰鬥才能');
});
test('自訂倍率明確獨立，未選取時不使用隱藏數值',()=>{
  assert.equal(calculateSkillBonuses('blacksmith',{...base(),equipmentCustom:8,locationCustom:8}).value,1);
  assert.equal(calculateSkillBonuses('blacksmith',{...base(),equipment:'custom',equipmentCustom:2.3}).value,2.3);
  assert.throws(()=>calculateSkillBonuses('blacksmith',{...base(),equipment:'custom',equipmentCustom:''}));
});
test('目前收錄9技能均有倍率profile，拒絕不明技能',()=>{
  const data=JSON.parse(readFileSync(new URL('../dist/data/skills.json',import.meta.url),'utf8'));
  assert.deepEqual(data.skills.map(s=>s.id).sort(),Object.keys(SKILL_BONUS_PROFILES).sort());
  assert.throws(()=>calculateSkillBonuses('unknown',base()));
});
test('切換技能重設限定效果，保留綜合水、稜鏡與活動',()=>{
  const before={...base(),potion:'royal',checked:{talent:true,title:true,astrology:true,'blue-prism':true},equipment:'reforge:10',location:'workshop-2',valuePet:true,countEvent:2,valueEvent:1.5};
  const after=bonusesAfterSkillChange(before);
  assert.equal(after.equipment,'none');assert.equal(after.location,'none');assert.equal(after.valuePet,false);
  assert.deepEqual(after.checked,{talent:false,title:false,astrology:false,'blue-prism':true});
  assert.equal(after.potion,'royal');assert.equal(after.countEvent,2);assert.equal(after.valueEvent,1.5);
  assert.equal(bonusesAfterSkillChange({...before,potion:'talent'}).potion,'none');
  assert.equal(calculateSkillBonuses('enchant',after).combined,12);
});
