import { calculateMultipliers, numberInRange } from './calculator.js';

// Ordinary Training EXP affixes are distinct from success-rate affixes and Limit Breaks.
export const BONUS_RULES = {
  checkedAt: '2026-09-12',
  region: 'Mabinogi World／北美版',
  countCap: 8,
  sources: [
    { title: '技能倍率與 8 倍上限', url: 'https://wiki.mabinogiworld.com/view/Category:Skills', revision: 984770 },
    { title: '普通綜合修練水', url: 'https://wiki.mabinogiworld.com/view/Complete_Skill_EXP_Potion', revision: 934559 },
    { title: '皇家綜合修練水', url: 'https://wiki.mabinogiworld.com/view/Royal_Complete_Skill_EXP_Potion_(1_Day)', revision: 1003193 },
    { title: 'NEXT 官方藥水疊加修正', url: 'https://mabinogi.nexon.net/news/78002/next-new-beast-update' },
    { title: '技能修練 EXP 細工', url: 'https://wiki.mabinogiworld.com/view/Reforge/Life' },
    { title: '黃色回音石', url: 'https://wiki.mabinogiworld.com/view/Yellow_Echostone' },
    { title: '銀色回音石', url: 'https://wiki.mabinogiworld.com/view/Silver_Echostone' },
    { title: '農場工房研究效果', url: 'https://wiki.mabinogiworld.com/view/Homestead_Houses', revision: 935716 },
    { title: 'Catsidhe 才能效果', url: 'https://wiki.mabinogiworld.com/view/Blooming_Nostalgia', revision: 1016197 },
    { title: '寵物訓練才能技能表', url: 'https://wiki.mabinogiworld.com/view/Pet_Training_(Talent)' },
    { title: 'Blue Prism', url: 'https://wiki.mabinogiworld.com/view/Blue_Prism', revision: 934652 },
    { title: "Druid's Mark 徽章", url: 'https://wiki.mabinogiworld.com/view/Druid%27s_Mark' },
    { title: '回音與細工相同效果', url: 'https://wiki.mabinogiworld.com/view/Echostone#Awakening' },
    { title: '修練稱號', url: 'https://wiki.mabinogiworld.com/view/Titles', revision: 1040386 },
    { title: '星座效果範例', url: 'https://wiki.mabinogiworld.com/view/Virgo_Starbright_Potion', revision: 738293 }
  ]
};

export const SKILL_BONUS_PROFILES = {
  blacksmith: { talent: '打鐵', reforgeMax: 10, echoMax: 10, echoColor: '黃色', workshop: true, catTalent: 'Blacksmithing', catType: '生活才能' },
  'fynn-bead-burnishing': { talent: '寵物訓練', reforgeMax: 0, echoMax: 0, workshop: false, catTalent: 'Pet Training', catType: '生活才能' },
  tailoring: { talent: '裁縫', reforgeMax: 10, echoMax: 10, echoColor: '黃色', workshop: true, catTalent: 'Tailoring', catType: '生活才能' },
  'fynn-craft': { talent: '寵物訓練', reforgeMax: 10, echoMax: 10, echoColor: '銀色', workshop: false, catTalent: 'Pet Training', catType: '生活才能' },
  enchant: { talent: '魔法', reforgeMax: 0, echoMax: 0, badge: true, workshop: false, catTalent: 'Magic', catType: '戰鬥才能' },
  'magic-craft': { talent: '寵物訓練', reforgeMax: 0, echoMax: 10, echoColor: '黃色', workshop: false, catTalent: 'Pet Training', catType: '生活才能' },
  'hillwen-engineering': { talent: '寵物訓練', reforgeMax: 0, echoMax: 10, echoColor: '黃色', workshop: false, catTalent: 'Pet Training', catType: '生活才能' },
  handicraft: { talent: '木工', reforgeMax: 10, echoMax: 10, echoColor: '黃色', workshop: true, catTalent: 'Carpentry', catType: '生活才能' },
  'stationery-craft': { talent: '符文書寫', reforgeMax: 0, echoMax: 0, workshop: false, catTalent: 'Glyphwright', catType: '生活才能' }
};

export const COUNT_BONUSES = [
  { id: 'talent', name: '目前為對應修練才能', multiplier: 2 },
  { id: 'title', name: '適用此技能的 2 倍修練稱號', multiplier: 2 },
  { id: 'astrology', name: '相符星座氣球／星座水', multiplier: 2 },
  { id: 'blue-prism', name: '水藍光稜鏡 Blue Prism', multiplier: 2 }
];

export const POTIONS = [
  { id: 'none', name: '未使用', multiplier: 1 },
  { id: 'talent', name: '對應才能修練水 · ×2', multiplier: 2 },
  { id: 'complete', name: '綜合技能修練水 · ×2', multiplier: 2 },
  { id: 'royal', name: '皇家綜合修練水 · ×3', multiplier: 3 }
];

export function defaultBonusSettings() {
  return { checked: Object.fromEntries(COUNT_BONUSES.map(b => [b.id, false])), potion: 'none', countEvent: 1,
    equipment: 'none', equipmentCustom: 1, location: 'none', locationCustom: 1, valuePet: false, valueEvent: 1 };
}

// Effects tied to a talent, skill or equipped tool need confirmation again after switching.
export function bonusesAfterSkillChange(settings) {
  const next = defaultBonusSettings();
  next.potion = settings.potion === 'talent' ? 'none' : settings.potion;
  next.checked['blue-prism'] = Boolean(settings.checked?.['blue-prism']);
  next.countEvent = settings.countEvent;
  next.valueEvent = settings.valueEvent;
  return next;
}

export function equipmentOptions(skillId) {
  const profile = SKILL_BONUS_PROFILES[skillId];
  if (!profile) throw new Error('尚未收錄此技能的倍率規則。');
  const options = [{ id: 'none', name: '無裝備加成', multiplier: 1 }];
  for (let level = 1; level <= profile.reforgeMax; level++) options.push({ id: `reforge:${level}`, name: `修練 EXP 細工 ${level} 級 · ×${1 + level / 10}`, multiplier: 1 + level / 10 });
  for (let level = 1; level <= profile.echoMax; level++) options.push({ id: `echo:${level}`, name: `${profile.echoColor}回音 EXP ${level} 級 · ×${1 + level / 10}`, multiplier: 1 + level / 10 });
  if (profile.badge) options.push({ id: 'druid-badge', name: "Druid's Mark 徽章 · ×1.5", multiplier: 1.5 });
  options.push({ id: 'custom', name: '自訂裝備倍率（依遊戲顯示）' });
  return options;
}

export function calculateSkillBonuses(skillId, settings) {
  const profile = SKILL_BONUS_PROFILES[skillId];
  if (!profile) throw new Error('尚未收錄此技能的倍率規則。');
  const potion = POTIONS.find(p => p.id === settings.potion);
  if (!potion) throw new Error('請選擇一種適用此技能的修練水。');
  const equipment = equipmentOptions(skillId).find(e => e.id === settings.equipment);
  if (!equipment) throw new Error('此技能不適用所選的修練 EXP 裝備加成。');
  const equipmentValue = equipment.id === 'custom' ? numberInRange(settings.equipmentCustom, 1, 10, '自訂裝備倍率') : equipment.multiplier;
  let locationValue = 1;
  if (settings.location === 'workshop-1' || settings.location === 'workshop-2') {
    if (!profile.workshop) throw new Error('Wiki 未列出此技能適用的農場工房。');
    locationValue = settings.location === 'workshop-1' ? 1.2 : 1.5;
  } else if (settings.location === 'custom') locationValue = numberInRange(settings.locationCustom, 1, 10, '自訂場所倍率');
  else if (settings.location !== 'none') throw new Error('請選擇有效的場所修練效果。');
  const countFactors = [potion.multiplier, ...COUNT_BONUSES.filter(b => settings.checked?.[b.id]).map(b => b.multiplier)];
  return { ...calculateMultipliers({ countFactors, countEvent: settings.countEvent, reforge: equipmentValue, homestead: locationValue, valuePet: settings.valuePet, valueEvent: settings.valueEvent }), equipmentValue, locationValue };
}
