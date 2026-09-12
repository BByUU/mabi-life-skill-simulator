export const RANKS = ['F','E','D','C','B','A','9','8','7','6','5','4','3','2','1'];
export function recipeOptions(task) {
  const options=[];
  if(task.recipe) options.push({recipe:task.recipe,materials:task.materials,unresolvedMaterials:task.unresolvedMaterials,materialStatus:task.materialStatus});
  for(const option of task.recipeVariants??[]) if(!options.some(o=>o.recipe===option.recipe)) options.push(option);
  return options;
}
const EPS = 1e-9;
export function numberInRange(value, min, max, label) {
  const n = Number(value);
  if (value === '' || value == null || !Number.isFinite(n) || n < min || n > max) throw new Error(`${label}請填入 ${min} 至 ${max} 的數值。`);
  return n;
}
export function calculateMultipliers({countFactors=[],countEvent=1,reforge=1,homestead=1,valuePet=false,valueEvent=1}) {
  const rawCount = countFactors.reduce((n,f)=>n*numberInRange(f,1,100,'次數加成'),1)*numberInRange(countEvent,1,100,'活動次數倍率');
  const count = Math.min(8,rawCount);
  const value = numberInRange(reforge,1,10,'細工倍率')*numberInRange(homestead,1,10,'農場等修練倍率')*(valuePet?2:1)*numberInRange(valueEvent,1,100,'活動修練值倍率');
  return {count,rawCount,value,combined:count*value};
}
export function taskPlan(task, remainingPoints, countMultiplier, valueMultiplier, completedCount=0) {
  const completed=numberInRange(completedCount,0,task.maxCount,'已計數次數');
  const remainingCount=Math.max(0,task.maxCount-completed);
  const count=numberInRange(countMultiplier,1,8,'次數倍率');
  const value=numberInRange(valueMultiplier,1,10000,'修練值倍率');
  if(remainingPoints<=EPS||remainingCount<=EPS||task.baseValue<=0) return {actions:0,counted:0,points:0,remainingCount};
  const actions=Math.min(Math.ceil(remainingPoints/(task.baseValue*value*count)-EPS),Math.ceil(remainingCount/count-EPS));
  const counted=Math.min(remainingCount,actions*count);
  return {actions,counted,points:counted*task.baseValue*value,remainingCount};
}
export function simulateSkill(skill,config) {
  const startIndex=RANKS.indexOf(config.startRank),targetIndex=RANKS.indexOf(config.targetRank);
  if(startIndex<0||targetIndex<0||startIndex>targetIndex) throw new Error('目標 Rank 必須高於或等於目前 Rank。');
  const progress=numberInRange(config.progress??0,0,100,'目前修練值');
  const countMultiplier=numberInRange(config.countMultiplier,1,8,'次數倍率'),valueMultiplier=numberInRange(config.valueMultiplier,1,10000,'修練值倍率');
  const materialTotals=new Map();let totalActions=0,unknownTasks=0,resultDependentTasks=0;const stages=[];
  for(let index=startIndex;index<targetIndex;index++){
    const rank=skill.ranks.find(r=>r.rank===RANKS[index]);
    if(!rank){stages.push({rank:RANKS[index],nextRank:RANKS[index+1],missing:true,reachable:false,points:0,deficit:100,tasks:[],actions:0});continue;}
    let points=index===startIndex?progress:0;const startingPoints=points,tasksById=new Map();
    // Source recommendations first; additional selected tasks fill remaining gaps.
    const ordered=[...rank.tasks.filter(t=>t.recommended),...rank.tasks.filter(t=>!t.recommended)];
    for(const task of ordered){
      const included=config.enabled?.[task.id]??task.recommended;
      const completed=index===startIndex&&progress>0?(config.completed?.[task.id]??0):0;
      const calculation=taskPlan(task,included?Math.max(0,100-points):0,countMultiplier,valueMultiplier,completed);
      const variants=recipeOptions(task);
      const variant=variants.find(v=>v.recipe===config.recipes?.[task.id]);
      const materials=variant?variant.materials:task.materials;
      const materialStatus=variant?(variant.materialStatus??(variant.unresolvedMaterials?.length?'partial':materials.length?'provided':'not-provided')):task.materialStatus;
      const planned={...task,...calculation,included,completed,recipe:variant?.recipe??task.recipe,recipeVariants:variants,materials,materialStatus};
      points+=calculation.points;totalActions+=calculation.actions;
      if(calculation.actions>0){
        if(materialStatus!=='provided')unknownTasks++;
        if(task.outcome!=='attempt')resultDependentTasks++;
        for(const m of materials)materialTotals.set(m.name,(materialTotals.get(m.name)??0)+m.perAction*calculation.actions);
      }
      tasksById.set(task.id,planned);
    }
    const tasks=rank.tasks.map(t=>tasksById.get(t.id)),deficit=Math.max(0,100-points);
    stages.push({...rank,nextRank:RANKS[index+1],startingPoints,points,deficit,reachable:deficit<=EPS,tasks,actions:tasks.reduce((n,t)=>n+t.actions,0)});
  }
  const blockedStages=stages.filter(s=>!s.reachable).length;
  return {stages,totalActions,materials:Array.from(materialTotals,([name,quantity])=>({name,quantity})).sort((a,b)=>b.quantity-a.quantity||a.name.localeCompare(b.name,'zh-Hant')),unknownTasks,resultDependentTasks,blockedStages,reachable:blockedStages===0,countMultiplier,valueMultiplier};
}
