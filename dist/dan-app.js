import {calculateBundle} from './dan-calculator.js';
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n).toLocaleString('zh-TW',{maximumFractionDigits:2});
const skills=[{id:'blacksmith',name:'打鐵',icon:'⚒'},{id:'tailoring',name:'衣物製作',icon:'✂'},{id:'magic-craft',name:'魔法製造',icon:'⌘'},{id:'hillwen-engineering',name:'稀原工學',icon:'⚙'}];
let data,state,result;
function current(){const sheet=data.sheets.find(s=>s.id===state.sheetId);const section=sheet.sections.find(s=>s.id===state.sectionId);return {sheet,section,view:section.views.find(v=>v.id===state.viewId)};}
function resetMaterials(){state.quantities={};state.stacks={};state.repetitions=1;}
function chooseSkill(id){state.skillId=id;const sheet=data.sheets.find(s=>s.skillId===id);chooseSheet(sheet.id);}
function chooseSheet(id){state.sheetId=id;const sheet=data.sheets.find(s=>s.id===id);chooseSection(sheet.sections[0].id);}
function chooseSection(id){state.sectionId=id;state.viewId=current().section.views[0].id;resetMaterials();}
function chooseView(id){state.viewId=id;resetMaterials();}
function options(entries,selected){return entries.map(e=>`<option value="${esc(e.id)}" ${e.id===selected?'selected':''}>${esc(e.label??e.name)}</option>`).join('');}
function render(){
  const {sheet,section,view}=current();const skill=skills.find(s=>s.id===state.skillId);
  $('skill-nav').innerHTML=skills.map(s=>`<button class="skill-button ${s.id===state.skillId?'active':''}" data-skill="${s.id}" type="button" aria-pressed="${s.id===state.skillId}"><span class="skill-icon" aria-hidden="true">${s.icon}</span>${s.name}</button>`).join('');
  $('skill-title').textContent=`${skill.name}升段`;document.title=`${skill.name}升段材料｜艾爾琳練習簿`;
  $('source-sheet').innerHTML=options(data.sheets.filter(s=>s.skillId===state.skillId),sheet.id);
  $('source-section').innerHTML=options(sheet.sections,section.id);
  $('source-view').innerHTML=options(section.views,view.id);
  $('repetitions').value=state.repetitions;
  $('selection-title').textContent=section.name;
  $('selection-subtitle').textContent=`${sheet.name} · ${view.label}`;
  $('source-range').href=sheet.sourceUrl+`&range=${encodeURIComponent(view.sourceRange)}`;
  $('source-range').textContent=`原表 ${view.sourceRange} ↗`;
  const removed=section.status==='removed';
  $('exam-status').className=`exam-status ${removed?'removed':''}`;
  $('exam-status').textContent=removed?'已移除的考題':'原表備料參考';
  $('selection-notes').innerHTML=[section.note,...(view.notes??[])].filter(Boolean).map(n=>`<p>${esc(n)}</p>`).join('');
  const rules=data.examRules?.[state.skillId];
  $('exam-rules').innerHTML=rules?`<h3>考試版本核對</h3><p>${esc(rules.summary)}</p>${rules.requirements?.length?`<ul>${rules.requirements.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>`:''}<p><a href="${esc(rules.url)}" target="_blank" rel="noreferrer">查閱考題更新 ↗</a></p>`:'';
  update(true);
}
function stackLabel(row){
  if(row.quantity==null)return '個數待確認';
  if(row.stackSize==null)return '上限待確認';
  if(row.quantity===0)return '0 組';
  return `${row.fullStacks?`${fmt(row.fullStacks)} 組`:''}${row.fullStacks&&row.remainder?' ＋ ':''}${row.remainder?`${fmt(row.remainder)} 個`:''}`;
}
function sourceLabel(row){return row.sourceText|| (row.sourceGroups!=null?`${fmt(row.sourceGroups)} 組`:'未提供組數');}
function update(rebuild=false){
  try{
    const {view}=current();result=calculateBundle(view,data.items,state.repetitions,state.stacks,state.quantities);
    $('error-message').hidden=true;
    $('summary').innerHTML=`<article class="stat-card"><span>本步驟材料</span><strong>${result.rows.length}<small>種</small></strong><p>只統計目前選取的備料步驟</p></article><article class="stat-card"><span>待確認換算</span><strong>${result.unknownStacks}<small>種</small></strong><p>${result.unknownQuantities?'部分原表數量或單位不足':'每項均保留來源與單位'}</p></article><article class="stat-card accent"><span>${result.unknownStacks?'已知材料堆疊':'材料堆疊合計'}</span><strong>${fmt(result.occupiedStacks)}<small>組</small></strong><p>含未滿組；不等於背包格數</p></article>`;
    if(rebuild){
      $('material-rows').innerHTML=result.rows.map((r,i)=>`<tr><th scope="row"><span>${esc(r.name)}</span>${r.item.expandedName&&r.item.expandedName!==r.name?`<small>${esc(r.item.expandedName)}</small>`:''}<details class="row-evidence"><summary>換算依據</summary><p>${esc(r.basis||'原表未提供足夠的數量與單位，請依考場需求填寫個數。')}</p>${r.warning?`<p class="warning">${esc(r.warning)}</p>`:''}<p>來源位置：${esc(r.sourceCell??'—')}</p>${r.oldStack?`<p>原表換算單位：${fmt(r.oldStack)} 個／組。</p>`:''}${r.item.url?`<a href="${esc(r.item.url)}" target="_blank" rel="noreferrer">${esc(r.item.region||'Wiki')}堆疊來源 ↗</a>`:'<p>尚未核實目前堆疊上限。</p>'}</details></th><td class="source-quantity">${esc(sourceLabel(r))}<small>${esc(r.sourceCell)}</small></td><td><input data-quantity="${esc(r.id)}" type="number" min="0" step="1" value="${r.quantity??''}" placeholder="待確認" aria-label="${esc(r.name)}材料個數"><small id="quantity-note-${i}">${r.quantityOverridden?'手動個數':'依原表換算'}</small></td><td><input data-stack="${esc(r.name)}" type="number" min="1" step="1" value="${r.stackSize??''}" placeholder="待確認" aria-label="${esc(r.name)}每組上限"><small id="stack-note-${i}">${r.overridden?'手動上限':r.stackSize==null?'尚未核實':'已查來源'}</small></td><td class="current-stacks"><strong id="stack-value-${i}">${stackLabel(r)}</strong><small id="occupied-${i}">${r.occupiedStacks==null?'':'佔 '+fmt(r.occupiedStacks)+' 組'}</small></td></tr>`).join('');
    }else result.rows.forEach((r,i)=>{ $(`stack-value-${i}`).textContent=stackLabel(r);$(`occupied-${i}`).textContent=r.occupiedStacks==null?'':'佔 '+fmt(r.occupiedStacks)+' 組';$(`quantity-note-${i}`).textContent=r.quantityOverridden?'手動個數':'依原表換算';$(`stack-note-${i}`).textContent=r.overridden?'手動上限':r.stackSize==null?'尚未核實':'已查來源';});
  }catch(error){result=null;$('error-message').hidden=false;$('error-message').textContent=error.message;$('summary').innerHTML='<p class="muted">請修正材料個數或堆疊上限後重新計算。</p>';document.querySelectorAll('.current-stacks strong').forEach(el=>el.textContent='等待有效數值');document.querySelectorAll('.current-stacks small').forEach(el=>el.textContent='');}
}
function events(){
  $('skill-nav').addEventListener('click',event=>{const el=event.target.closest('[data-skill]');if(el){chooseSkill(el.dataset.skill);render();}});
  $('source-sheet').addEventListener('change',event=>{chooseSheet(event.target.value);render();});
  $('source-section').addEventListener('change',event=>{chooseSection(event.target.value);render();});
  $('source-view').addEventListener('change',event=>{chooseView(event.target.value);render();});
  $('repetitions').addEventListener('change',event=>{state.repetitions=event.target.value;state.quantities={};update(true);});
  $('reset-materials').addEventListener('click',()=>{resetMaterials();render();});
  $('material-rows').addEventListener('change',event=>{const el=event.target;if(el.dataset.quantity)state.quantities[el.dataset.quantity]=el.value;else if(el.dataset.stack)state.stacks[el.dataset.stack]=el.value;update();});
}
function registerTools(){
  if(!document.modelContext?.registerTool)return;
  const lifecycle=new AbortController();window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
  const choices=data.sheets.flatMap(sheet=>sheet.sections.flatMap(section=>section.views.map(view=>({id:view.id,sheet,section,view}))));
  const tool={name:'configure_dan_material_plan',title:'選擇升段備料步驟',description:'選擇原表備料步驟與份數，重設手動個數及堆疊上限並更新畫面。',inputSchema:{type:'object',properties:{viewId:{type:'string',enum:choices.map(c=>c.id)},repetitions:{type:'integer',minimum:1,maximum:100}},required:['viewId','repetitions'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute(input){
    const choice=choices.find(c=>c.id===input?.viewId);
    if(!choice||!Number.isSafeInteger(input?.repetitions)||input.repetitions<1||input.repetitions>100||Object.keys(input).some(k=>!['viewId','repetitions'].includes(k)))throw new Error('請提供有效的備料步驟與 1 至 100 份。');
    state={skillId:choice.sheet.skillId,sheetId:choice.sheet.id,sectionId:choice.section.id,viewId:choice.id,repetitions:input.repetitions,quantities:{},stacks:{}};render();return {viewId:choice.id,materials:result.rows.map(r=>({name:r.name,quantity:r.quantity,stackSize:r.stackSize,occupiedStacks:r.occupiedStacks})),unknown:result.unknownStacks};
  }};
  try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{/* Optional browser standard. */}
}
async function init(){try{
  const response=await fetch('./data/dan.json');if(!response.ok)throw new Error('升段資料載入失敗，請重新整理。');data=await response.json();
  state={skillId:'blacksmith',quantities:{},stacks:{},repetitions:1};chooseSkill(state.skillId);
  $('source-date').textContent=`堆疊查核 ${data.checkedAt}`;
  $('dataset-note').textContent=`收錄 ${data.sheets.length} 張原表分頁。原表未載更新日期；考題與堆疊查核於 ${data.checkedAt}。`;
  events();render();registerTools();
}catch(error){$('error-message').hidden=false;$('error-message').textContent=error.message;}}
init();
