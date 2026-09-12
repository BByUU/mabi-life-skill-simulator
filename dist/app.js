import {RANKS,calculateMultipliers,simulateSkill} from './calculator.js';
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n).toLocaleString('zh-TW',{maximumFractionDigits:2});
let data,state,result;let openRanks=new Set(['F']),firstRender=true;
const icons=['⚒','◈','✂','✧','✦','⌘','⚙','⋈','✎'];
function defaults(skillId='blacksmith'){
  return {skillId,startRank:'F',targetRank:'1',progress:0,checked:Object.fromEntries(data.multipliers.count.options.map(o=>[o.id,o.defaultEnabled])),countEvent:2,reforge:1,homestead:1,valuePet:false,valueEvent:1,enabled:{},completed:{},recipes:{}};
}
function bonuses(){return calculateMultipliers({countFactors:data.multipliers.count.options.filter(o=>state.checked[o.id]).map(o=>o.multiplier),countEvent:state.countEvent,reforge:state.reforge,homestead:state.homestead,valuePet:state.valuePet,valueEvent:state.valueEvent});}
function navigation(){
  $('skill-nav').innerHTML=data.skills.map((s,i)=>`<button type="button" class="skill-button ${s.id===state.skillId?'active':''}" data-skill="${s.id}" aria-pressed="${s.id===state.skillId}"><span class="skill-icon" aria-hidden="true">${icons[i]}</span><span>${esc(s.name)}</span><span class="skill-count">${String(i+1).padStart(2,'0')}</span></button>`).join('');
  $('skill-count').textContent=String(data.skills.length).padStart(2,'0');
}
function controls(){
  $('start-rank').innerHTML=RANKS.map(r=>`<option value="${r}" ${r===state.startRank?'selected':''}>${r}</option>`).join('');
  $('target-rank').innerHTML=RANKS.map((r,i)=>`<option value="${r}" ${r===state.targetRank?'selected':''} ${i<RANKS.indexOf(state.startRank)?'disabled':''}>${r}</option>`).join('');
  $('current-progress').value=state.progress;
  $('bonus-controls').innerHTML=`<div><h3 class="bonus-group-title">修練次數<span>最高 8 倍</span></h3>${data.multipliers.count.options.map(o=>`<div class="bonus-option"><label><input type="checkbox" data-bonus="${o.id}" ${state.checked[o.id]?'checked':''}>${esc(o.name)}</label><span>×${fmt(o.multiplier)}</span></div>`).join('')}<label class="bonus-select">活動次數倍率<input id="count-event" type="number" min="1" max="100" step="0.1" value="${state.countEvent}"></label><p class="bonus-help">預設為原表的才能、修練水與活動各 2 倍。請依實際效果調整。</p></div><div><h3 class="bonus-group-title">修練經驗值<span>獨立乘算</span></h3><label class="bonus-select">細工／回音／英雄徽章<select id="reforge"><option value="1">無加成 · ×1</option><option value="1.5" ${Number(state.reforge)===1.5?'selected':''}>英雄徽章 · ×1.5</option>${Array.from({length:20},(_,i)=>{const v=(11+i)/10;return `<option value="${v}" ${Number(state.reforge)===v&&v!==1.5?'selected':''}>細工／回音 ${i+1} 級 · ×${v}</option>`;}).join('')}</select></label><label class="bonus-select">農場／公會／訓練所倍率<input id="homestead" type="number" min="1" max="10" step="0.01" value="${state.homestead}"></label><div class="bonus-option value-pet"><label><input id="value-pet" type="checkbox" ${state.valuePet?'checked':''}>寵物修練值效果</label><span>×2</span></div><label class="bonus-select">活動修練值倍率<input id="value-event" type="number" min="1" max="100" step="0.1" value="${state.valueEvent}"></label><p class="bonus-help">只填適用此技能的效果。英雄徽章與細工／回音擇一。</p></div>`;
}
function update(){
  if(!firstRender)openRanks=new Set([...document.querySelectorAll('.rank-card[open]')].map(el=>el.dataset.rank));
  firstRender=false;const skill=data.skills.find(s=>s.id===state.skillId);
  $('skill-title').textContent=skill.name;document.title=`${skill.name}修練模擬｜艾爾琳練習簿`;
  try{
    const b=bonuses();result=simulateSkill(skill,{...state,countMultiplier:b.count,valueMultiplier:b.value});$('error-message').hidden=true;
    $('combined-bonus').innerHTML=`${fmt(b.combined)}<span>×</span>`;
    $('bonus-breakdown').textContent=`次數 ${fmt(b.count)}× · 經驗值 ${fmt(b.value)}×${b.rawCount>8?'（次數已封頂）':''}`;
    $('summary').innerHTML=`<article class="stat-card"><span>項目達成次數</span><strong>${fmt(result.totalActions)}<small>次</small></strong><p>各項分別估算，未合併同次觸發</p></article><article class="stat-card"><span>已知所需材料</span><strong>${result.materials.length}<small>種</small></strong><p>${result.unknownTasks?`${result.unknownTasks} 項配方資料不完整`:'依所選配方的直接用量估算'}</p></article><article class="stat-card accent"><span>修練加成</span><strong>${fmt(b.combined)}<small>×</small></strong><p>次數 ${fmt(b.count)}× · 經驗值 ${fmt(b.value)}×</p></article>`;
    $('route-caption').textContent=`${result.stages.length} 個階級${result.blockedStages?` · ${result.blockedStages} 階不足`:result.stages.length?' · 可達目標':''}`;
    plan(skill);materials();
  }catch(error){
    result=null;$('error-message').hidden=false;$('error-message').textContent=error.message;
    $('summary').innerHTML='<p class="muted">請修正設定後重新計算。</p>';
    $('plan-panel').innerHTML='';$('materials-panel').innerHTML='';$('route-caption').textContent='';$('combined-bonus').textContent='—';$('bonus-breakdown').textContent='等待有效設定';
  }
}
function plan(skill){
  if(!result.stages.length){$('plan-panel').innerHTML='<div class="empty-state"><strong>已經在目標 Rank</strong>這段路線無須追加修練。<br>目前規劃到達 Rank 1，不包含大師或升段修練。</div>';return;}
  const warning=result.blockedStages?'<p class="rank-warning route-warning">部分階級的已選項目不足 100。請展開並勾選其他項目，或提高修練值倍率；後續階級與總材料為各階可獨立開始時的條件式估算。</p>':'';
  const prior=Number(state.progress)>0&&Number(state.progress)<100?'<p class="rank-note">目前 Rank 已有進度：請填各項「已計數」，用來扣除剩餘次數上限。只填總修練值可能高估可用次數。</p>':'';
  $('plan-panel').innerHTML=warning+prior+result.stages.map((s,i)=>`<details class="rank-card" data-rank="${s.rank}" ${openRanks.has(s.rank)?'open':''}><summary><span class="rank-emblem">${s.rank}</span><div class="rank-title"><h3>Rank ${s.rank} <span aria-hidden="true">→</span> ${s.nextRank}</h3><p>${s.missing?'來源未提供此階資料':`${s.tasks.filter(t=>t.actions>0).length} 項修練 · ${fmt(s.actions)} 次達成`}</p></div><span class="rank-score ${s.reachable?'':'warning'}">${s.reachable?`${fmt(s.points)} / 100`:`尚差 ${fmt(s.deficit)}`}<small>${s.reachable?'滿足修練值':'需補充修練'}</small></span><span class="chevron" aria-hidden="true">⌄</span></summary><div class="rank-detail">${s.missing?'<p class="rank-warning">參考資料未提供此 Rank，無法計算需求。</p>':`<div class="table-scroll"><table class="task-table"><thead><tr><th scope="col">納入修練 / 製作品</th><th scope="col">基礎值<br>次數上限</th>${i===0&&Number(state.progress)>0?'<th scope="col">已計數</th>':''}<th scope="col">需達成</th><th scope="col">修練值</th></tr></thead><tbody>${s.tasks.map(t=>row(t,i)).join('')}</tbody></table></div><div class="progress-track" role="progressbar" aria-label="Rank ${s.rank} 修練值" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.min(100,s.points)}"><div class="progress-fill" style="width:${Math.min(100,Math.max(0,s.points))}%"></div></div><div class="rank-footer"><span>${s.startingPoints?`已有 ${fmt(s.startingPoints)} · 新增 ${fmt(s.points-s.startingPoints)}`:'依原表建議順序填滿修練值'}</span><a href="${esc(skill.sourceUrl)}" target="_blank" rel="noreferrer">查閱 ${esc(s.sourceRange)} ↗</a></div>${s.reachable?'':'<p class="rank-warning">已選項目達次數上限後仍不足，請勾選其他項目或調整加成。</p>'}`}</div></details>`).join('');
}
function row(t,index){
  const recipe=t.recipeVariants?.length>1?`<select class="recipe-select" aria-label="${esc(t.description)}配方" data-recipe="${t.id}">${t.recipeVariants.map(v=>`<option value="${esc(v.recipe)}" ${v.recipe===t.recipe?'selected':''}>${esc(v.recipe)}</option>`).join('')}</select>`:`<small>${esc(t.recipe||'原表未提供配方')}</small>`;
  const note=t.materialStatus!=='provided'?`<small class="warning">${t.materialStatus==='partial'?'材料資料不完整':'材料未提供'}</small>`:'';
  return `<tr class="${t.included?'':'dim'}"><td><label class="task-check"><input type="checkbox" data-task="${t.id}" ${t.included?'checked':''} aria-label="納入${esc(t.description)}"><span class="task-description">${esc(t.description)}</span></label><div class="task-recipe">${recipe}${note}</div></td><td>${fmt(t.baseValue)}<br><small class="muted">上限 ${fmt(t.maxCount)}</small></td>${index===0&&Number(state.progress)>0?`<td><input class="completed-input" data-completed="${t.id}" type="number" min="0" max="${t.maxCount}" step="1" value="${t.completed}" aria-label="${esc(t.description)}已計數次數"></td>`:''}<td class="action-number">${fmt(t.actions)}<small> 次</small></td><td>${fmt(t.points)}</td></tr>`;
}
function materials(){
  const intro='<p class="material-intro">依所選配方與各項達成次數估算。成功、失敗等指定結果未必每次出現；此表未合併同次觸發、未展開中間產物，也未扣除跨階再利用。</p>';
  const missing=result.unknownTasks?`<p class="rank-warning">${result.unknownTasks} 個有需求的修練項目缺少完整材料資料，下方僅列已知用量。</p>`:'';
  const blocked=result.blockedStages?`<p class="rank-warning">有 ${result.blockedStages} 個階級尚未滿足修練值。補足修練後，材料需求可能增加。</p>`:'';
  $('materials-panel').innerHTML=intro+missing+blocked+(result.materials.length?`<div class="materials-grid">${result.materials.map(m=>`<div class="material-item"><span>${esc(m.name)}</span><strong>${fmt(m.quantity)}</strong></div>`).join('')}</div>`:`<div class="empty-state">${result.unknownTasks?'所選項目的材料資料未提供。':result.stages.length?'所選項目目前沒有已知材料用量。':'已到達目標 Rank，無須追加材料。'}</div>`);
}
function setTab(id,focus=false){for(const name of ['plan','materials']){const selected=name===id;$(`${name}-tab`).setAttribute('aria-selected',String(selected));$(`${name}-tab`).tabIndex=selected?0:-1;$(`${name}-tab`).classList.toggle('active',selected);$(`${name}-panel`).hidden=!selected;}if(focus)$(`${id}-tab`).focus();}
function events(){
  $('mobile-bonus-toggle').addEventListener('click',()=>{const panel=document.querySelector('.settings-sidebar');const expanded=panel.classList.toggle('expanded');$('mobile-bonus-toggle').setAttribute('aria-expanded',String(expanded));});
  $('skill-nav').addEventListener('click',event=>{const el=event.target.closest('[data-skill]');if(!el)return;state={...state,skillId:el.dataset.skill,progress:0,enabled:{},completed:{},recipes:{}};firstRender=true;openRanks=new Set([state.startRank]);navigation();controls();update();});
  $('reset').addEventListener('click',()=>{state=defaults(state.skillId);firstRender=true;openRanks=new Set(['F']);controls();update();});
  $('start-rank').addEventListener('change',event=>{state.startRank=event.target.value;state.progress=0;state.completed={};if(RANKS.indexOf(state.targetRank)<RANKS.indexOf(state.startRank))state.targetRank=state.startRank;firstRender=true;openRanks=new Set([state.startRank]);controls();update();});
  $('target-rank').addEventListener('change',event=>{state.targetRank=event.target.value;update();});
  $('current-progress').addEventListener('change',event=>{state.progress=event.target.value;if(Number(state.progress)===0)state.completed={};update();});
  $('bonus-controls').addEventListener('change',event=>{const el=event.target;if(el.dataset.bonus)state.checked[el.dataset.bonus]=el.checked;else if(el.id==='count-event')state.countEvent=el.value;else if(el.id==='reforge')state.reforge=Number(el.value);else if(el.id==='homestead')state.homestead=el.value;else if(el.id==='value-event')state.valueEvent=el.value;else if(el.id==='value-pet')state.valuePet=el.checked;update();});
  $('plan-panel').addEventListener('change',event=>{const el=event.target;if(el.dataset.task)state.enabled[el.dataset.task]=el.checked;else if(el.dataset.recipe)state.recipes[el.dataset.recipe]=el.value;else if(el.dataset.completed){if(el.value===''||!el.checkValidity()){el.reportValidity();$('error-message').hidden=false;$('error-message').textContent='已計數次數請填 0 至該項上限的整數。';return;}state.completed[el.dataset.completed]=el.value;}update();});
  for(const name of ['plan','materials']){$(`${name}-tab`).addEventListener('click',()=>setTab(name));$(`${name}-tab`).addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();setTab(event.key==='Home'?'plan':event.key==='End'?'materials':name==='plan'?'materials':'plan',true);}});}
}
function registerTools(){
  if(!document.modelContext?.registerTool)return;
  const lifecycle=new AbortController();window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
  const tool={name:'configure_training_simulation',title:'設定生活技能修練模擬',description:'設定已收錄技能及Rank區間，更新畫面。保留目前倍率，重設既有進度與配方。',inputSchema:{type:'object',properties:{skillId:{type:'string',enum:data.skills.map(s=>s.id)},startRank:{type:'string',enum:RANKS},targetRank:{type:'string',enum:RANKS}},required:['skillId','startRank','targetRank'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){
    if(!input||typeof input!=='object'||Object.keys(input).some(k=>!['skillId','startRank','targetRank'].includes(k))||!data.skills.some(s=>s.id===input.skillId)||!RANKS.includes(input.startRank)||!RANKS.includes(input.targetRank)||RANKS.indexOf(input.startRank)>RANKS.indexOf(input.targetRank))throw new Error('請提供有效技能與升級區間。');
    bonuses();state={...state,...input,progress:0,enabled:{},completed:{},recipes:{}};firstRender=true;openRanks=new Set([state.startRank]);navigation();controls();update();
    return {skillId:state.skillId,ranks:result.stages.length,totalActions:result.totalActions,materials:result.materials,blockedStages:result.blockedStages};
  }};
  try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{/* Optional browser standard. */}
}
async function init(){try{
  const response=await fetch('./data/skills.json');if(!response.ok)throw new Error('技能資料載入失敗，請重新整理頁面。');data=await response.json();
  if(!Array.isArray(data.skills)||!data.skills.length)throw new Error('技能資料格式不完整。');state=defaults();
  $('source-date').innerHTML=`原表更新 ${esc(data.source.lastUpdated)}<br>擷取 ${esc(data.source.retrievedAt)}`;
  $('method-notes').innerHTML=`<p>資料來源：<a href="${esc(data.source.url)}" target="_blank" rel="noreferrer">${esc(data.source.authorCredit)}的生活技能修練試算表</a>。原表更新於 ${esc(data.source.lastUpdated)}，本工具擷取於 ${esc(data.source.retrievedAt)}，收錄表內 9 種技能，不代表全部生活技能或已核對最新版本。</p><p>每項新增修練值 = 基礎值 × 修練值倍率 × min（剩餘可計數上限，達成次數 × 次數倍率）。次數倍率最高 8 倍；每段以 100 為目標，排除目標 Rank 本身。</p><p>優先依原表建議項目與順序計算，再計入你額外勾選的項目。此路線沒有比較材料價格或保證最低耗材。各項分別估算，單次行動同時觸發的項目尚未合併。</p><p>材料採直接配方，保留原表簡稱。缺漏不視為零耗材。魔法製造部分跨列材料公式已標記不完整；中間產物與跨階再利用尚未抵扣。</p><p>既有修練值不隨新倍率重算。起始 Rank 已有進度時，請另填各項已計數以扣除上限。本版不估算 AP、成功率、升段或大師修練。</p><p><a href="https://mabinogi-event.beanfun.com/EventAD/EventAD?EventADID=15874" target="_blank" rel="noreferrer">台服 NEW RISE 公告</a>已更新 AP 訓練規則。原表部分舊說明不再適用；本工具未套用舊的 10 次限制與角色等級修練值加成。</p>`;
  navigation();controls();events();update();registerTools();
}catch(error){$('error-message').hidden=false;$('error-message').textContent=error.message;$('plan-panel').innerHTML='<div class="empty-state">無法讀取技能資料。請透過網站網址開啟，並重新整理。</div>';}}
init();

