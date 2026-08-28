/* ============ CONFIG ============ */
// Both values can be set once via URL query params and are then cached
// in localStorage, so you never need to hand-edit this file again —
// even if you create a brand new Apps Script deployment later.
//
// First visit:
//   yoursite.com/?token=YOUR_TOKEN&api=https://script.google.com/macros/s/xxx/exec
// Every visit after that, both params are optional — the cached values
// are used automatically.
const qs = new URLSearchParams(location.search);

const TOKEN = qs.get('token') || localStorage.getItem('cal_token') || '';
if (qs.get('token')) localStorage.setItem('cal_token', qs.get('token'));

const GAS_URL = qs.get('api') || localStorage.getItem('cal_api') || '';
if (qs.get('api')) localStorage.setItem('cal_api', qs.get('api'));

// Shows an unmissable full-screen banner instead of failing silently.
// Called directly (not via a 'DOMContentLoaded' listener) because this
// script runs at the end of <body>, where that event has usually
// already fired.
function showFatalError(message){
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;z-index:200;background:#14171C;color:#F5F3EE;'
    + 'display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;'
    + 'font-family:Manrope,sans-serif;font-size:14px;line-height:1.6;';
  el.innerHTML = '<div style="max-width:340px"><div style="font-family:\'Bebas Neue\',sans-serif;'
    + 'font-size:24px;color:#FF6B4A;margin-bottom:10px;">Setup needed</div>' + message + '</div>';
  document.body.appendChild(el);
}

if (!TOKEN || !GAS_URL) {
  showFatalError(
    'Missing token or API URL. Open this page once with '
    + '<code style="color:#FFB627">?token=YOUR_TOKEN&amp;api=YOUR_EXEC_URL</code> '
    + 'in the address bar — after that it\'s remembered on this device.'
    + '<div style="margin-top:16px; font-size:11px; color:#565D6B; word-break:break-all;">'
    + 'Launched with: ' + location.href + '</div>'
  );
}

/* ============ STATE ============ */
let state = {
  selectedDate: todayStr(),
  today: todayStr(),
  availability: new Set(),
  unit: 'g',            // 'g' | 'pct'
  monthCursor: new Date(),
  dayData: null
};

/* ============ HELPERS ============ */
function todayStr(){
  const d = new Date();
  return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
}
function pad(n){ return n<10 ? '0'+n : ''+n; }
function parseDate(s){ const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); }
function toKey(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function mondayOf(d){
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = (day===0? -6 : 1-day);
  const m = new Date(d); m.setDate(d.getDate()+diff);
  return m;
}
function showToast(msg){
  const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2200);
}

async function api(params){
  const url = new URL(GAS_URL);
  url.searchParams.set('token', TOKEN);
  Object.keys(params).forEach(k => url.searchParams.set(k, params[k]));

  let res;
  try{
    res = await fetch(url.toString());
  }catch(networkErr){
    // fetch() itself only throws for network failures or CORS blocks —
    // it does NOT throw for HTTP error statuses (see the res.ok check below).
    throw new Error('NETWORK_OR_CORS: ' + networkErr.message);
  }
  if (!res.ok){
    throw new Error('HTTP_' + res.status);
  }
  const data = await res.json();
  if (data && data.error){
    throw new Error('API: ' + data.error);
  }
  return data;
}

/* ============ INIT ============ */
async function init(){
  if (!TOKEN || !GAS_URL) return; // banner already shown by showFatalError above
  try{
    const avail = await api({ action:'availability' });
    (avail.dates||[]).forEach(d => state.availability.add(d));
  }catch(e){
    console.error('availability fetch failed:', e);
  }
  state.availability.add(state.today); // today always selectable
  renderWeekStrip();
  await loadDay(state.selectedDate);
  // B13: fade out splash, reveal app
  const splash = document.getElementById('splash');
  splash.classList.add('hide');
  document.querySelector('.app').classList.add('ready');
  setTimeout(()=> splash.style.display='none', 500);
}

let currentLoadId = 0;
let debounceTimer = null;

async function loadDay(dateStr){
  state.selectedDate = dateStr;
  renderWeekStrip();
  renderHeader();
  const el = document.getElementById('log-list');
  // B9+B12: show ring-card skeleton, hide real ring immediately on tap
  document.getElementById('ring-card-skeleton').style.display = '';
  document.getElementById('ring-section').style.display = 'none';
  el.innerHTML = '<div style="padding:6px 14px">' +
    '<div class="skel-log"><div class="skel skel-icon"></div><div class="skel-lines"><div class="skel skel-line w60"></div><div class="skel skel-line w40"></div></div><div class="skel" style="width:40px;height:12px;border-radius:6px"></div></div>' +
    '<div class="skel-log"><div class="skel skel-icon"></div><div class="skel-lines"><div class="skel skel-line w60"></div><div class="skel skel-line w40"></div></div><div class="skel" style="width:40px;height:12px;border-radius:6px"></div></div>' +
    '<div class="skel-log"><div class="skel skel-icon"></div><div class="skel-lines"><div class="skel skel-line w60"></div><div class="skel skel-line w40"></div></div><div class="skel" style="width:40px;height:12px;border-radius:6px"></div></div>' +
    '</div>';

  if (debounceTimer) clearTimeout(debounceTimer);

  debounceTimer = setTimeout(async () => {
    const loadId = ++currentLoadId;
    try{
      const data = await api({ action:'data', date: dateStr });
      if (loadId !== currentLoadId) return; // Stale guard: user switched dates mid-flight

      state.dayData = data;
      // B9: hide skeleton, show real ring
      document.getElementById('ring-card-skeleton').style.display = 'none';
      document.getElementById('ring-section').style.display = '';
      renderRing();
      renderMacros();
      renderLogList();
    }catch(e){
      if (loadId !== currentLoadId) return; // Ignore errors from obsolete requests
      console.error('day data fetch failed:', e);
      let msg = 'Could not load. ';
      if (String(e.message).startsWith('API: unauthorized')) {
        msg += 'Your token was rejected — double check it matches TOKEN in code.gs.';
      } else if (String(e.message).startsWith('NETWORK_OR_CORS')) {
        msg += 'Request was blocked (often CORS or an offline/expired deployment) — check the browser console for details.';
      } else {
        msg += 'See browser console for details (' + e.message + ').';
      }
      el.innerHTML = '<div class="empty-state">' + msg + '</div>';
      document.getElementById('ring-card-skeleton').style.display = 'none';
      document.getElementById('ring-section').style.display = '';
    }
  }, 200);
}

/* ============ HEADER ============ */
function renderHeader(){
  const d = parseDate(state.selectedDate);
  const isToday = state.selectedDate === state.today;
  document.getElementById('dow-label').textContent = isToday ? 'Today' :
    d.toLocaleDateString('en-US',{weekday:'long'});
  document.getElementById('date-label').textContent =
    d.toLocaleDateString('en-US',{month:'long', day:'numeric', year:'numeric'});
}

/* ============ WEEK STRIP ============ */
function renderWeekStrip(){
  const strip = document.getElementById('week-strip');
  strip.innerHTML = '';
  const monday = mondayOf(parseDate(state.selectedDate));
  const dows = ['M','T','W','T','F','S','S'];
  for(let i=0;i<7;i++){
    const d = new Date(monday); d.setDate(monday.getDate()+i);
    const key = toKey(d);
    const isToday = key === state.today;
    const isSelected = key === state.selectedDate;
    const hasData = state.availability.has(key);
    const pill = document.createElement('div');
    const isFutureDay = d > new Date(state.today+'T23:59:59');
    pill.className = 'day-pill'
      + (isToday? ' today':'') + (isSelected? ' selected':'') + (isFutureDay && !hasData? ' disabled':'');
    pill.innerHTML = `<span class="dow">${dows[i]}</span><span class="num">${d.getDate()}</span>`
      + (hasData && !isSelected ? '<span class="dot"></span>' : '');
    if(!isFutureDay || hasData){
      pill.addEventListener('click', ()=> loadDay(key));
    }
    strip.appendChild(pill);
  }
}

/* ============ RING ============ */
const CIRC = 2*Math.PI*64;
function renderRing(){
  const t = state.dayData.totals;
  const targets = state.dayData.targets;
  const current = Math.round(t.netCalories);
  const target = targets.calories || 1;
  const ringGroup = document.getElementById('ring-group');
  const ring = document.getElementById('ring-fill');

  ring.style.strokeDasharray = CIRC;

  // B15: negative net → counter-clockwise green from 12 o'clock
  if(current <= 0){
    const absPct = Math.min(1, Math.abs(current) / target);
    const offset = CIRC - absPct * CIRC;
    // Mirror ring-group vertically so stroke fills counter-clockwise from 12 o'clock (since base starts at 90deg rotation)
    ringGroup.setAttribute('transform', 'translate(0, 150) scale(1, -1)');
    ring.style.transition = 'none';
    ring.style.strokeDashoffset = CIRC;
    requestAnimationFrame(()=>{ requestAnimationFrame(()=>{ ring.style.transition = ''; ring.style.strokeDashoffset = offset; }); });
    ring.style.stroke = 'var(--protein)';
  } else {
    ringGroup.removeAttribute('transform');
    const pct = Math.min(1, current / target);
    const offset = CIRC - pct * CIRC;
    ring.style.transition = 'none';
    ring.style.strokeDashoffset = CIRC;
    requestAnimationFrame(()=>{ requestAnimationFrame(()=>{ ring.style.transition = ''; ring.style.strokeDashoffset = offset; }); });
    if(current > target) ring.style.stroke = 'var(--danger)';
    else ring.style.stroke = 'var(--carbs)';
  }

  // B5: show % in ring center when unit toggle is pct
  if(state.unit === 'pct'){
    document.getElementById('cal-current').textContent = Math.round((current/target)*100);
    document.getElementById('cal-target-label').textContent = '% of target';
    document.querySelector('.ring-center .unit').textContent = '%';
  } else {
    document.getElementById('cal-current').textContent = current;
    document.getElementById('cal-target-label').textContent = 'of '+Math.round(target);
    document.querySelector('.ring-center .unit').textContent = 'kcal';
  }

  // ticks every 10%
  const tickGroup = document.getElementById('tick-group');
  tickGroup.innerHTML = '';
  for(let i=0;i<20;i++){
    const angle = (i/20)*2*Math.PI;
    const r1=57, r2=64;
    const x1=75+r1*Math.cos(angle), y1=75+r1*Math.sin(angle);
    const x2=75+r2*Math.cos(angle), y2=75+r2*Math.sin(angle);
    const line = document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('x1',x1); line.setAttribute('y1',y1);
    line.setAttribute('x2',x2); line.setAttribute('y2',y2);
    line.setAttribute('stroke', '#31363F'); line.setAttribute('stroke-width','1.5');
    tickGroup.appendChild(line);
  }
}

/* ============ MACROS ============ */
function renderMacros(){
  const t = state.dayData.totals;
  const targets = state.dayData.targets;
  ['protein','carbs','fat'].forEach(key=>{
    const row = document.querySelector(`.macro-row[data-macro="${key}"]`);
    const val = t[key] || 0;
    const tgt = targets[key] || 1;
    const pct = Math.max(0, Math.min(100, (val/tgt)*100));
    // B11: animate from 0 to target width
    const bar = row.querySelector('.bar-fill');
    bar.style.transition = 'none';
    bar.style.width = '0%';
    requestAnimationFrame(()=>{ requestAnimationFrame(()=>{ bar.style.transition = ''; bar.style.width = pct+'%'; }); });
    row.querySelector('.val').textContent = state.unit === 'g'
      ? `${Math.round(val)} / ${Math.round(tgt)} g`
      : `${Math.round((val/tgt)*100)}%`;
  });
  syncUnitButtons();
}
function syncUnitButtons(){
  document.getElementById('toggle-g').classList.toggle('active', state.unit==='g');
  document.getElementById('toggle-pct').classList.toggle('active', state.unit==='pct');
}
document.getElementById('toggle-g').addEventListener('click', ()=>{
  state.unit = state.unit === 'g' ? 'pct' : 'g';
  syncUnitButtons(); renderMacros(); renderRing();
});
document.getElementById('toggle-pct').addEventListener('click', ()=>{
  state.unit = state.unit === 'g' ? 'pct' : 'g';
  syncUnitButtons(); renderMacros(); renderRing();
});

/* ============ LOG LIST ============ */
const inIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2v20M6 2a4 4 0 014 4v4a4 4 0 01-4 4M18 2v20M18 8a3 3 0 00-3 3v0a3 3 0 003 3"/></svg>';
const outIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h7l-1 8 11-14h-7l0-6z"/></svg>';

function renderLogList(){
  const el = document.getElementById('log-list');
  const logs = state.dayData.logs;
  // B2: empty state
  if(!logs.length){
    el.innerHTML = '<div class="empty-state" style="padding:28px 4px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:40px;height:40px;margin:0 auto 12px;display:block;color:var(--text-faint)"><path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3"/></svg>'
      + '<div style="font-size:14px;color:var(--text-muted);margin-bottom:4px">No logs yet today</div>'
      + '<div style="font-size:12px;color:var(--text-faint);margin-bottom:14px">Start tracking by adding your first meal</div>'
      + '<button onclick="openLogForm()" style="padding:10px 20px;border:none;border-radius:12px;background:linear-gradient(155deg,var(--hot),var(--amber));color:#14171C;font-weight:700;font-size:13px;cursor:pointer;">Add your first meal</button>'
      + '</div>';
    return;
  }
  // B7: clickable log items with rowNumber
  const sorted = [...logs].sort((a,b)=> b.time.localeCompare(a.time));
  el.innerHTML = sorted.map(r=>{
    const isOut = r.type === 'Out';
    return `<div class="log-item" data-row="${r.rowNumber||''}" onclick="openLogForm(${r.rowNumber||0})" style="cursor:pointer">
      <div class="log-icon ${isOut?'out':'in'}">${isOut?outIcon:inIcon}</div>
      <div class="log-body">
        <div class="log-name">${escapeHtml(r.item)}</div>
        <div class="log-meta">${r.time}${r.method? ' · '+r.method:''}</div>
      </div>
      <div class="log-cal ${isOut?'out':''}">${isOut?'-':''}${Math.round(r.calories)}</div>
    </div>`;
  }).join('');
}
function escapeHtml(s){ const d=document.createElement('div'); d.textContent=s||''; return d.innerHTML; }

/* ============ MONTH PICKER ============ */
const calBtn = document.getElementById('cal-btn');
const monthOverlay = document.getElementById('month-overlay');
calBtn.addEventListener('click', ()=>{
  state.monthCursor = parseDate(state.selectedDate);
  renderMonth();
  monthOverlay.classList.add('open');
});
monthOverlay.addEventListener('click', (e)=>{ if(e.target===monthOverlay) monthOverlay.classList.remove('open'); });
document.getElementById('month-prev').addEventListener('click', ()=>{
  state.monthCursor = new Date(state.monthCursor.getFullYear(), state.monthCursor.getMonth()-1, 1);
  renderMonth();
});
document.getElementById('month-next').addEventListener('click', ()=>{
  state.monthCursor = new Date(state.monthCursor.getFullYear(), state.monthCursor.getMonth()+1, 1);
  renderMonth();
});

function renderMonth(){
  const cursor = state.monthCursor;
  document.getElementById('month-title').textContent =
    cursor.toLocaleDateString('en-US',{month:'long', year:'numeric'});
  const grid = document.getElementById('month-grid');
  grid.innerHTML = '';
  ['M','T','W','T','F','S','S'].forEach(d=>{
    const el=document.createElement('div'); el.className='dow'; el.textContent=d; grid.appendChild(el);
  });
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const startOffset = (first.getDay()+6)%7; // Monday-start
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth()+1, 0).getDate();

  for(let i=0;i<startOffset;i++){
    const b=document.createElement('div'); b.className='month-cell blank'; grid.appendChild(b);
  }
  for(let day=1; day<=daysInMonth; day++){
    const d = new Date(cursor.getFullYear(), cursor.getMonth(), day);
    const key = toKey(d);
    const hasData = state.availability.has(key);
    const cell = document.createElement('div');
    const isFuture = d > new Date(state.today+'T23:59:59');
    cell.className = 'month-cell'
      + (hasData? ' avail':'')
      + (isFuture? ' disabled':'')
      + (key===state.today? ' today':'')
      + (key===state.selectedDate? ' selected':'');
    cell.textContent = day;
    if(!isFuture){
      cell.addEventListener('click', ()=>{
        monthOverlay.classList.remove('open');
        loadDay(key);
      });
    }
    grid.appendChild(cell);
  }
}

/* ============ SETTINGS ============ */
const settingsView = document.getElementById('settings-view');
let targetUnit = 'g'; // 'g' or 'pct'

function setTargetUnitMode(unit){
  const cal = Number(document.getElementById('in-calories').value) || 0;
  const pVal = Number(document.getElementById('in-protein').value) || 0;
  const cVal = Number(document.getElementById('in-carbs').value) || 0;
  const fVal = Number(document.getElementById('in-fat').value) || 0;

  if (targetUnit === unit) return;

  if (unit === 'pct'){
    // Convert current grams to % of calories
    if (cal > 0){
      document.getElementById('in-protein').value = Math.round((pVal * 4 / cal) * 100);
      document.getElementById('in-carbs').value = Math.round((cVal * 4 / cal) * 100);
      document.getElementById('in-fat').value = Math.round((fVal * 9 / cal) * 100);
    }
    document.getElementById('lbl-protein').textContent = 'Protein (%)';
    document.getElementById('lbl-carbs').textContent = 'Carbs (%)';
    document.getElementById('lbl-fat').textContent = 'Fat (%)';
    document.getElementById('target-unit-g').classList.remove('active');
    document.getElementById('target-unit-pct').classList.add('active');
    document.getElementById('target-pct-sum').style.display = '';
    updateTargetPctSum();
  } else {
    // Convert current % to grams based on calories
    if (cal > 0){
      document.getElementById('in-protein').value = Math.round((cal * (pVal / 100)) / 4);
      document.getElementById('in-carbs').value = Math.round((cal * (cVal / 100)) / 4);
      document.getElementById('in-fat').value = Math.round((cal * (fVal / 100)) / 9);
    }
    document.getElementById('lbl-protein').textContent = 'Protein (g)';
    document.getElementById('lbl-carbs').textContent = 'Carbs (g)';
    document.getElementById('lbl-fat').textContent = 'Fat (g)';
    document.getElementById('target-unit-pct').classList.remove('active');
    document.getElementById('target-unit-g').classList.add('active');
    document.getElementById('target-pct-sum').style.display = 'none';
  }
  targetUnit = unit;
}

function updateTargetPctSum(){
  if (targetUnit !== 'pct') return;
  const p = Number(document.getElementById('in-protein').value) || 0;
  const c = Number(document.getElementById('in-carbs').value) || 0;
  const f = Number(document.getElementById('in-fat').value) || 0;
  const total = p + c + f;
  const el = document.getElementById('target-pct-sum');
  el.textContent = `Total: ${total}%`;
  el.style.color = total === 100 ? 'var(--protein)' : 'var(--text-muted)';
}

document.getElementById('target-unit-g').addEventListener('click', ()=> setTargetUnitMode('g'));
document.getElementById('target-unit-pct').addEventListener('click', ()=> setTargetUnitMode('pct'));

document.getElementById('gear-btn').addEventListener('click', async ()=>{
  settingsView.classList.add('open');
  targetUnit = 'g';
  document.getElementById('lbl-protein').textContent = 'Protein (g)';
  document.getElementById('lbl-carbs').textContent = 'Carbs (g)';
  document.getElementById('lbl-fat').textContent = 'Fat (g)';
  document.getElementById('target-unit-g').classList.add('active');
  document.getElementById('target-unit-pct').classList.remove('active');
  document.getElementById('target-pct-sum').style.display = 'none';
  const targets = (state.dayData && state.dayData.targets) || {};
  document.getElementById('in-calories').value = targets.calories || '';
  document.getElementById('in-protein').value = targets.protein || '';
  document.getElementById('in-carbs').value = targets.carbs || '';
  document.getElementById('in-fat').value = targets.fat || '';
  // B14: pre-calc calories if nutrient targets exist
  if(targets.protein || targets.carbs || targets.fat){
    settingsCalcCalories();
  }
});
document.getElementById('settings-back').addEventListener('click', ()=> settingsView.classList.remove('open'));


/* B14: auto-calc calories in settings from nutrients */
const settingsNutrientIds = ['in-protein','in-carbs','in-fat'];
function settingsCalcCalories(){
  if (targetUnit === 'pct'){
    updateTargetPctSum();
    return;
  }
  const p = Number(document.getElementById('in-protein').value)||0;
  const c = Number(document.getElementById('in-carbs').value)||0;
  const f = Number(document.getElementById('in-fat').value)||0;
  document.getElementById('in-calories').value = Math.round(p*4 + c*4 + f*9);
}
settingsNutrientIds.forEach(id=>{
  document.getElementById(id).addEventListener('input', settingsCalcCalories);
});

document.getElementById('save-target-btn').addEventListener('click', async ()=>{
  const btn = document.getElementById('save-target-btn');
  btn.disabled = true; btn.textContent = 'Saving…';

  let cal = Number(document.getElementById('in-calories').value) || 0;
  let p = Number(document.getElementById('in-protein').value) || 0;
  let c = Number(document.getElementById('in-carbs').value) || 0;
  let f = Number(document.getElementById('in-fat').value) || 0;

  if (targetUnit === 'pct' && cal > 0){
    p = Math.round((cal * (p / 100)) / 4);
    c = Math.round((cal * (c / 100)) / 4);
    f = Math.round((cal * (f / 100)) / 9);
  }

  try{
    const res = await api({
      action: 'saveTarget',
      calories: cal,
      protein: p,
      carbs: c,
      fat: f
    });
    if(res.success){
      document.getElementById('save-msg').textContent = 'Saved.';
      showToast('Target updated');
      await loadDay(state.selectedDate);
    } else {
      document.getElementById('save-msg').textContent = 'Something went wrong.';
    }
  }catch(e){
    document.getElementById('save-msg').textContent = 'Could not save — check your connection.';
  }
  btn.disabled = false; btn.textContent = 'Save target';
});

/* ============ LOG FORM (B3 + B7) ============ */
let formMode = 'add'; // 'add' or 'edit'
let formEditRow = null;

function openLogForm(rowNumber){
  const overlay = document.getElementById('log-form-overlay');
  document.getElementById('form-row-number').value = rowNumber || '';
  document.getElementById('form-notes').value = '';
  if(rowNumber && state.dayData && state.dayData.logs){
    const log = state.dayData.logs.find(r=> r.rowNumber === rowNumber);
    if(log){
      formMode = 'edit'; formEditRow = rowNumber;
      document.getElementById('form-title').textContent = 'Edit log';
      document.getElementById('form-item').value = log.item || '';
      document.getElementById('form-calories').value = log.calories || '';
      document.getElementById('form-protein').value = log.protein || '';
      document.getElementById('form-carbs').value = log.carbs || '';
      document.getElementById('form-fat').value = log.fat || '';
      document.getElementById('form-notes').value = log.notes || '';
      document.getElementById('form-save-btn').textContent = 'Save changes';
      document.getElementById('form-delete-btn').style.display = '';
      setLogFormType(log.type === 'Out' ? 'out' : 'in');
      overlay.classList.add('open');
      return;
    }
  }
  formMode = 'add'; formEditRow = null;
  document.getElementById('form-title').textContent = 'Add log';
  document.getElementById('form-item').value = '';
  document.getElementById('form-calories').value = '';
  document.getElementById('form-protein').value = '';
  document.getElementById('form-carbs').value = '';
  document.getElementById('form-fat').value = '';
  document.getElementById('form-save-btn').textContent = 'Save';
  document.getElementById('form-delete-btn').style.display = 'none';
  setLogFormType('in');
  overlay.classList.add('open');
}

let logFormType = 'In';
const nutrientIds = ['form-protein','form-carbs','form-fat'];
function setLogFormType(type){
  logFormType = type === 'out' ? 'Out' : 'In';
  const inBtn = document.getElementById('form-type-in');
  const outBtn = document.getElementById('form-type-out');
  inBtn.className = logFormType === 'In' ? 'active-in' : '';
  outBtn.className = logFormType === 'Out' ? 'active-out' : '';
  // OUT: disable nutrient inputs, clear them
  // IN: enable nutrient inputs, auto-calc calories
  nutrientIds.forEach(id=>{
    const el = document.getElementById(id);
    if(logFormType === 'Out'){ el.disabled = true; el.value = ''; }
    else { el.disabled = false; }
  });
  if(logFormType === 'In') calcCalories();
}
function calcCalories(){
  const p = Number(document.getElementById('form-protein').value)||0;
  const c = Number(document.getElementById('form-carbs').value)||0;
  const f = Number(document.getElementById('form-fat').value)||0;
  document.getElementById('form-calories').value = Math.round(p*4 + c*4 + f*9);
}
document.getElementById('form-type-in').addEventListener('click', ()=> setLogFormType('in'));
// Auto-calc calories when nutrient inputs change (IN type only)
nutrientIds.forEach(id=>{
  document.getElementById(id).addEventListener('input', ()=>{
    if(logFormType === 'In') calcCalories();
  });
});
document.getElementById('form-type-out').addEventListener('click', ()=> setLogFormType('out'));

document.getElementById('form-cancel-btn').addEventListener('click', ()=>{
  document.getElementById('log-form-overlay').classList.remove('open');
});

document.getElementById('form-save-btn').addEventListener('click', async ()=>{
  const params = {
    item: document.getElementById('form-item').value.trim(),
    type: logFormType,
    calories: document.getElementById('form-calories').value || '0',
    protein: document.getElementById('form-protein').value || '0',
    carbs: document.getElementById('form-carbs').value || '0',
    fat: document.getElementById('form-fat').value || '0',
    notes: document.getElementById('form-notes').value
  };
  if(!params.item){ showToast('Please enter an item name'); return; }
  const btn = document.getElementById('form-save-btn');
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    if(formMode === 'edit' && formEditRow){
      params.rowNumber = formEditRow;
      await api({ action:'updateLog', ...params });
    } else {
      await api({ action:'addLog', ...params });
    }
    document.getElementById('log-form-overlay').classList.remove('open');
    showToast(formMode === 'edit' ? 'Log updated' : 'Log added');
    await loadDay(state.selectedDate);
  } catch(e){
    showToast('Could not save — check connection');
  }
  btn.disabled = false;
  btn.textContent = formMode === 'edit' ? 'Save changes' : 'Save';
});

// B7: delete flow
document.getElementById('form-delete-btn').addEventListener('click', ()=>{
  document.getElementById('confirm-overlay').classList.add('open');
});
document.getElementById('confirm-no').addEventListener('click', ()=>{
  document.getElementById('confirm-overlay').classList.remove('open');
});
document.getElementById('confirm-yes').addEventListener('click', async ()=>{
  document.getElementById('confirm-overlay').classList.remove('open');
  if(!formEditRow) return;
  try {
    await api({ action:'deleteLog', rowNumber: formEditRow });
    document.getElementById('log-form-overlay').classList.remove('open');
    showToast('Log deleted');
    await loadDay(state.selectedDate);
  } catch(e){
    showToast('Could not delete — check connection');
  }
});

// + button opens add form
document.getElementById('add-log-btn').addEventListener('click', ()=> openLogForm());

// Close overlays on backdrop tap
document.getElementById('log-form-overlay').addEventListener('click', e=>{
  if(e.target.id === 'log-form-overlay') e.target.classList.remove('open');
});

/* ============ PULL TO REFRESH (B6) ============ */
let pullStartY = 0, pulling = false;
const appEl = document.querySelector('.app');
appEl.addEventListener('touchstart', e=>{
  if(window.scrollY <= 0) pullStartY = e.touches[0].clientY;
});
appEl.addEventListener('touchmove', e=>{
  if(pullStartY === 0) return;
  const dy = e.touches[0].clientY - pullStartY;
  if(dy > 60 && window.scrollY <= 0){
    pulling = true;
    const el = document.getElementById('log-list');
    if(!el.querySelector('.pull-indicator')){
      const ind = document.createElement('div');
      ind.className = 'pull-indicator';
      ind.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="var(--amber)" stroke-width="2" style="width:22px;height:22px;animation:spin .8s linear infinite"><path d="M21 12a9 9 0 11-6.22-8.56"/><path d="M21 3v5h-5"/></svg>';
      ind.style.cssText = 'text-align:center;padding:10px 0;';
      el.prepend(ind);
    }
  }
});
appEl.addEventListener('touchend', async ()=>{
  if(pulling){
    pulling = false; pullStartY = 0;
    const ind = document.querySelector('.pull-indicator');
    if(ind) ind.remove();
    showToast('Refreshing…');
    try {
      const avail = await api({ action:'availability' });
      state.availability = new Set(avail.dates || []);
      state.availability.add(state.today);
    } catch(e){}
    await loadDay(state.selectedDate);
  }
  pullStartY = 0;
});

init();
