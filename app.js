/* ================================================================
   GymLog Pro — offline-first workout tracker
   ================================================================ */
(function(){
'use strict';

const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const uid = () => Math.random().toString(36).slice(2,9) + Date.now().toString(36).slice(-4);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp = (n,a,b) => Math.max(a, Math.min(b, n));
const num = v => { const n = Number(v); return isFinite(n) ? n : 0; };
const fmt = n => Math.round(num(n)).toLocaleString('en-US');
const fmtD = n => { const v = num(n); return v % 1 === 0 ? String(Math.round(v)) : v.toFixed(1); };
const todayISO = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset()*60000).toISOString().slice(0,10); };
const fmtClock = s => `${Math.floor(Math.max(0,s)/60)}:${String(Math.max(0,s)%60).padStart(2,'0')}`;

function fmtDate(iso){
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return iso || '';
  const t = new Date(); t.setHours(0,0,0,0);
  const y = new Date(t); y.setDate(y.getDate()-1);
  const tm = new Date(t); tm.setDate(tm.getDate()+1);
  if (d.getTime() === t.getTime())  return 'Today';
  if (d.getTime() === y.getTime())  return 'Yesterday';
  if (d.getTime() === tm.getTime()) return 'Tomorrow';
  return d.toLocaleDateString(undefined, {weekday:'short', day:'numeric', month:'short'});
}
function fmtDur(ms){
  const m = Math.floor(ms/60000);
  if (m < 60) return m + 'm';
  return Math.floor(m/60) + 'h ' + (m%60) + 'm';
}
function dateParts(iso){
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return {d:'--', m:'--'};
  return { d: String(d.getDate()), m: d.toLocaleDateString(undefined,{month:'short'}).slice(0,3) };
}
const e1RM = (w, r) => (num(w) > 0 && num(r) > 0) ? num(w) * (1 + num(r)/30) : 0;

const DB_KEY = 'gymlog.pro.v1';
const MUSCLES = ['Chest','Back','Shoulders','Biceps','Triceps','Forearms','Quads','Hamstrings','Glutes','Calves','Core','Traps','Full Body','Cardio'];
const EQUIPMENT = ['Barbell','Dumbbell','Machine','Cable','Bodyweight','Kettlebell','Band','Smith Machine','EZ Bar','Other'];
const MUSCLE_ICON = {
  Chest:'🫁', Back:'🔙', Shoulders:'🎯', Biceps:'💪', Triceps:'🔺', Forearms:'🤝',
  Quads:'🦵', Hamstrings:'🦿', Glutes:'🍑', Calves:'🦶', Core:'🎽', Traps:'⛰️',
  'Full Body':'🏋️', Cardio:'❤️', Other:'⚙️'
};
const PLATE_COLORS = ['var(--accent)','#4ade80','#60a5fa','#f472b6','#fbbf24','#a78bfa','#22d3ee','#fb923c'];
const DEFAULT_SETTINGS = { unit:'kg', rest:90, autoRest:true, sound:true, vibrate:true, rpe:false, theme:'dark' };

const BUILTIN = [
  ['Barbell Bench Press','Chest','Barbell'],['Incline Barbell Bench Press','Chest','Barbell'],
  ['Decline Barbell Bench Press','Chest','Barbell'],['Dumbbell Bench Press','Chest','Dumbbell'],
  ['Incline Dumbbell Press','Chest','Dumbbell'],['Decline Dumbbell Press','Chest','Dumbbell'],
  ['Dumbbell Fly','Chest','Dumbbell'],['Incline Dumbbell Fly','Chest','Dumbbell'],
  ['Cable Crossover','Chest','Cable'],['Low Cable Fly','Chest','Cable'],
  ['Pec Deck','Chest','Machine'],['Machine Chest Press','Chest','Machine'],
  ['Push Up','Chest','Bodyweight'],['Incline Push Up','Chest','Bodyweight'],
  ['Dips','Chest','Bodyweight'],['Chest Dip','Chest','Bodyweight'],
  ['Deadlift','Back','Barbell'],['Barbell Row','Back','Barbell'],['Pendlay Row','Back','Barbell'],
  ['T-Bar Row','Back','Barbell'],['Dumbbell Row','Back','Dumbbell'],['Chest Supported Row','Back','Dumbbell'],
  ['Seated Cable Row','Back','Cable'],['Lat Pulldown','Back','Cable'],['Close Grip Pulldown','Back','Cable'],
  ['Straight Arm Pulldown','Back','Cable'],['Pull Up','Back','Bodyweight'],['Chin Up','Back','Bodyweight'],
  ['Assisted Pull Up','Back','Machine'],['Machine Row','Back','Machine'],['Back Extension','Back','Bodyweight'],
  ['Rack Pull','Back','Barbell'],['Overhead Press','Shoulders','Barbell'],['Seated Barbell Press','Shoulders','Barbell'],
  ['Push Press','Shoulders','Barbell'],['Dumbbell Shoulder Press','Shoulders','Dumbbell'],
  ['Arnold Press','Shoulders','Dumbbell'],['Lateral Raise','Shoulders','Dumbbell'],
  ['Cable Lateral Raise','Shoulders','Cable'],['Machine Lateral Raise','Shoulders','Machine'],
  ['Front Raise','Shoulders','Dumbbell'],['Rear Delt Fly','Shoulders','Dumbbell'],
  ['Reverse Pec Deck','Shoulders','Machine'],['Face Pull','Shoulders','Cable'],
  ['Upright Row','Shoulders','Barbell'],['Handstand Push Up','Shoulders','Bodyweight'],
  ['Pike Push Up','Shoulders','Bodyweight'],['Barbell Curl','Biceps','Barbell'],
  ['EZ Bar Curl','Biceps','EZ Bar'],['Dumbbell Curl','Biceps','Dumbbell'],
  ['Hammer Curl','Biceps','Dumbbell'],['Incline Dumbbell Curl','Biceps','Dumbbell'],
  ['Concentration Curl','Biceps','Dumbbell'],['Preacher Curl','Biceps','EZ Bar'],
  ['Cable Curl','Biceps','Cable'],['Machine Curl','Biceps','Machine'],['Spider Curl','Biceps','Dumbbell'],
  ['Close Grip Bench Press','Triceps','Barbell'],['Skull Crusher','Triceps','EZ Bar'],
  ['Triceps Pushdown','Triceps','Cable'],['Rope Pushdown','Triceps','Cable'],
  ['Overhead Triceps Extension','Triceps','Cable'],['Dumbbell Overhead Extension','Triceps','Dumbbell'],
  ['Triceps Kickback','Triceps','Dumbbell'],['Bench Dip','Triceps','Bodyweight'],
  ['Diamond Push Up','Triceps','Bodyweight'],['Machine Triceps Extension','Triceps','Machine'],
  ['Back Squat','Quads','Barbell'],['Front Squat','Quads','Barbell'],['Box Squat','Quads','Barbell'],
  ['Hack Squat','Quads','Machine'],['Leg Press','Quads','Machine'],
  ['Bulgarian Split Squat','Quads','Dumbbell'],['Walking Lunge','Quads','Dumbbell'],
  ['Reverse Lunge','Quads','Dumbbell'],['Step Up','Quads','Dumbbell'],
  ['Leg Extension','Quads','Machine'],['Goblet Squat','Quads','Kettlebell'],
  ['Romanian Deadlift','Hamstrings','Barbell'],['Stiff Leg Deadlift','Hamstrings','Barbell'],
  ['Sumo Deadlift','Hamstrings','Barbell'],['Leg Curl','Hamstrings','Machine'],
  ['Seated Leg Curl','Hamstrings','Machine'],['Nordic Curl','Hamstrings','Bodyweight'],
  ['Good Morning','Hamstrings','Barbell'],['Hip Thrust','Glutes','Barbell'],
  ['Glute Bridge','Glutes','Bodyweight'],['Cable Kickback','Glutes','Cable'],
  ['Hip Abduction','Glutes','Machine'],['Standing Calf Raise','Calves','Machine'],
  ['Seated Calf Raise','Calves','Machine'],['Calf Raise','Calves','Bodyweight'],
  ['Plank','Core','Bodyweight'],['Side Plank','Core','Bodyweight'],['Crunch','Core','Bodyweight'],
  ['Bicycle Crunch','Core','Bodyweight'],['Hanging Leg Raise','Core','Bodyweight'],
  ['Hanging Knee Raise','Core','Bodyweight'],['Cable Crunch','Core','Cable'],
  ['Russian Twist','Core','Bodyweight'],['Ab Wheel Rollout','Core','Other'],
  ['Dead Bug','Core','Bodyweight'],['Mountain Climber','Core','Bodyweight'],
  ['Barbell Shrug','Traps','Barbell'],['Dumbbell Shrug','Traps','Dumbbell'],['Cable Shrug','Traps','Cable'],
  ['Wrist Curl','Forearms','Dumbbell'],['Reverse Wrist Curl','Forearms','Dumbbell'],
  ['Farmer Carry','Forearms','Dumbbell'],['Treadmill Run','Cardio','Machine'],
  ['Cycling','Cardio','Machine'],['Rowing Machine','Cardio','Machine'],
  ['Stair Climber','Cardio','Machine'],['Jump Rope','Cardio','Other'],['Elliptical','Cardio','Machine'],
].map(([name, muscle, equipment]) => ({ name, muscle, equipment }));

let db = {
  version: 1,
  settings: Object.assign({}, DEFAULT_SETTINGS),
  custom: [],
  templates: [],
  active: null,
  history: [],
  bodyweight: []
};

function load(){
  try {
    const raw = localStorage.getItem(DB_KEY) || localStorage.getItem(DB_KEY + '.bak');
    if (!raw) return;
    const p = JSON.parse(raw);
    if (p && typeof p === 'object'){
      db.settings  = Object.assign({}, DEFAULT_SETTINGS, p.settings || {});
      db.custom    = Array.isArray(p.custom)    ? p.custom    : [];
      db.templates = Array.isArray(p.templates) ? p.templates : [];
      db.history   = Array.isArray(p.history)   ? p.history   : [];
      db.bodyweight= Array.isArray(p.bodyweight)? p.bodyweight: [];
      db.active    = p.active || null;
    }
  } catch(e){ console.warn('Load failed', e); }
}

function saveNow(){
  try {
    const json = JSON.stringify(db);
    localStorage.setItem(DB_KEY, json);
    localStorage.setItem(DB_KEY + '.bak', json);
  } catch(e){
    try {
      localStorage.removeItem(DB_KEY + '.bak');
      localStorage.setItem(DB_KEY, JSON.stringify(db));
      toast('Storage भरा — backup export करें');
    } catch(_){
      toast('⚠️ Data save नहीं हो पा रहा!');
    }
  }
}
const save = saveNow;

function allExercises(){
  const map = new Map();
  BUILTIN.forEach(e => map.set(e.name.toLowerCase(), { name:e.name, muscle:e.muscle, equipment:e.equipment, custom:false }));
  db.custom.forEach(e => map.set(e.name.toLowerCase(), { name:e.name, muscle:e.muscle||'Other', equipment:e.equipment||'Other', custom:true, id:e.id }));
  return Array.from(map.values()).sort((a,b) => a.name.localeCompare(b.name));
}
function exerciseMeta(name){
  const n = String(name||'').toLowerCase();
  const found = allExercises().find(e => e.name.toLowerCase() === n);
  return found || { name, muscle:'Other', equipment:'Other', custom:false };
}
function ensureActive(){
  if (!db.active){
    db.active = { id:uid(), name:'', date:todayISO(), startedAt:Date.now(), notes:'', exercises:[] };
  }
  return db.active;
}
function findEx(id){ return db.active ? db.active.exercises.find(e => e.id === id) : null; }
const setVolume  = s => num(s.weight) * num(s.reps);
const exVolume   = e => e.sets.reduce((a,s) => a + setVolume(s), 0);
const sessVolume = s => s.exercises.reduce((a,e) => a + exVolume(e), 0);
const sessSets   = s => s.exercises.reduce((a,e) => a + e.sets.length, 0);

function lastPerformance(name){
  const n = String(name||'').toLowerCase();
  for (const s of db.history){
    const ex = s.exercises.find(e => e.name.toLowerCase() === n && e.sets.length);
    if (ex) return ex;
  }
  return null;
}
function newSetFor(ex){
  const prev = ex.sets[ex.sets.length - 1];
  if (prev) return { id:uid(), weight:prev.weight, reps:prev.reps, done:false, warmup:false, rpe:'' };
  const lp = lastPerformance(ex.name);
  if (lp && lp.sets.length){
    const l = lp.sets[lp.sets.length - 1];
    return { id:uid(), weight:l.weight, reps:l.reps, done:false, warmup:false, rpe:'' };
  }
  return { id:uid(), weight:'', reps:'', done:false, warmup:false, rpe:'' };
}

let _toastT;
function toast(msg, ms){
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastT);
  _toastT = setTimeout(() => el.classList.remove('show'), ms || 2000);
}

const I = {
  plus:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4.5 4.5L19 7"/></svg>',
  x:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  chev:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="width:18px;height:18px"><path d="M6 9l6 6 6-6"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/></svg>',
  fire:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2s4 4.5 4 8a4 4 0 0 1-8 0c0-1.2.5-2.2 1-3"/><path d="M12 22a6 6 0 0 0 6-6c0-3-2-5-3.5-6.5"/></svg>',
  dumbbell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6.5 6.5v11M3.5 9.5v5M17.5 6.5v11M20.5 9.5v5M6.5 12h11"/></svg>',
  edit:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>'
};

function renderWorkout(){
  const el = $('#view-workout');
  const s  = db.active;
  if (!s){
    const recent = db.history.slice(0, 3);
    el.innerHTML = `
      <div class="empty">
        <div class="empty-ico">🏋️</div>
        <h2>Ready to train?</h2>
        <p>Start a session and log every set as you go. Your data stays on this device.</p>
        <button class="btn primary wide" data-act="start">${I.plus} Start empty workout</button>
        ${recent.length ? `
          <div class="empty-tpl">
            <div class="sec-title" style="margin:16px 0 4px;justify-content:center;"><span>Recent</span><span class="ln" style="max-width:60px"></span></div>
            ${recent.map(h => `
              <button class="btn ghost wide" data-act="repeat-hist" data-sid="${h.id}">
                <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">↻ ${esc(h.name || 'Workout')}</span>
              </button>`).join('')}
          </div>` : ''}
        ${db.templates.length ? `
          <div class="empty-tpl">
            <div class="sec-title" style="margin:16px 0 4px;justify-content:center;"><span>Templates</span><span class="ln" style="max-width:60px"></span></div>
            ${db.templates.map(t => `
              <button class="btn ghost wide" data-act="use-template" data-tid="${t.id}">
                <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">📋 ${esc(t.name)}</span>
              </button>`).join('')}
          </div>` : ''}
      </div>`;
    return;
  }
  const vol  = sessVolume(s);
  const sets = sessSets(s);
  const doneSets = s.exercises.reduce((a,e) => a + e.sets.filter(x => x.done).length, 0);
  const elapsed = Date.now() - (s.startedAt || Date.now());

  el.innerHTML = `
    <div class="session-card">
      <input class="session-name" id="sessionName" placeholder="Workout name…" value="${esc(s.name)}" autocomplete="off" spellcheck="false">
      <div class="session-meta">
        <input type="date" class="date-input" id="sessionDate" value="${esc(s.date)}">
        <span class="chip" id="sessDur">${I.clock} ${fmtDur(elapsed)}</span>
        <span class="chip accent" id="sessVol">${fmt(vol)} ${db.settings.unit}</span>
      </div>
    </div>
    <div id="exList">${s.exercises.map(exerciseCardHtml).join('')}</div>
    ${s.exercises.length ? '' : `<div class="note-inline" style="margin-bottom:12px;"><span class="i">💡</span><span>Add your first exercise below. Pick from 130+ built-ins or create your own.</span></div>`}
    <button class="btn primary wide" data-act="add-exercise" style="margin-top:4px;">${I.plus} Add exercise</button>
    <div class="row" style="margin-top:10px;gap:9px;">
      <button class="btn ghost" style="flex:1;" data-act="session-note">📝 Notes</button>
      <button class="btn ghost" style="flex:1;" data-act="save-template">📋 Template</button>
    </div>
    <div class="row" style="margin-top:9px;gap:9px;">
      <button class="btn primary" style="flex:1.6;" data-act="finish">Finish workout</button>
      <button class="btn danger" style="flex:1;" data-act="discard">Discard</button>
    </div>
    <div class="muted center" style="margin-top:16px;font-size:12px;font-weight:600;">
      ${doneSets} / ${sets} sets completed · ${s.exercises.length} exercise${s.exercises.length===1?'':'s'}
    </div>
  `;
}

function exerciseCardHtml(ex){
  const meta = exerciseMeta(ex.name);
  const vol  = exVolume(ex);
  const lp   = lastPerformance(ex.name);
  const showRpe = !!db.settings.rpe;
  let prevTxt = '';
  if (lp && lp.sets.length){
    const parts = lp.sets.filter(s => !s.warmup).slice(0,4).map(s => `${fmtD(s.weight)}×${fmt(s.reps)}`);
    if (parts.length) prevTxt = `<div class="ex-prev">Last: <b>${parts.join(' · ')}</b></div>`;
  }
  const headCols = `
    <div class="set-head">
      <span class="c-set">Set</span>
      <span class="c-w">Weight (${db.settings.unit})</span>
      <span class="c-r">Reps</span>
      ${showRpe ? '<span class="c-rpe">RPE</span>' : ''}
      <span class="c-act" style="text-align:right;padding-right:2px;">Done</span>
    </div>`;
  return `
  <div class="ex-card" data-exid="${ex.id}">
    <div class="ex-top">
      <div class="ex-title">
        <h3>${esc(ex.name)}</h3>
        <div class="ex-sub">
          <span class="tag">${esc(meta.muscle)}</span>
          <span class="tag">${esc(meta.equipment)}</span>
        </div>
      </div>
      <span class="ex-vol" data-role="exvol">${fmt(vol)} ${db.settings.unit}</span>
      <button class="icon-btn" data-act="ex-menu" style="width:30px;height:30px;margin-top:-3px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
      </button>
    </div>
    ${ex.notes ? `<div class="ex-note">${esc(ex.notes)}</div>` : ''}
    ${prevTxt}
    <div class="sets">
      ${headCols}
      <div data-role="setlist">${ex.sets.map((st,i) => setRowHtml(ex, st, i)).join('')}</div>
    </div>
    <div class="ex-foot"><button class="add-set" data-act="add-set">${I.plus} Add set</button></div>
  </div>`;
}

function setRowHtml(ex, st, i){
  const showRpe = !!db.settings.rpe;
  const isWarm = !!st.warmup;
  return `
  <div class="set-row ${st.done ? 'done':''}" data-setid="${st.id}">
    <button class="set-badge ${isWarm ? 'warm':''}" data-act="toggle-warm" title="Toggle warm-up">${isWarm ? 'W' : (i+1)}</button>
    <div class="field w">
      <input type="number" inputmode="decimal" step="0.5" min="0" data-f="weight" value="${st.weight === '' || st.weight == null ? '' : st.weight}" placeholder="0">
      <span class="u">${db.settings.unit}</span>
    </div>
    <div class="field r">
      <input type="number" inputmode="numeric" min="0" data-f="reps" value="${st.reps === '' || st.reps == null ? '' : st.reps}" placeholder="0">
      <span class="u">reps</span>
    </div>
    ${showRpe ? `<div class="field rpe">
      <input type="number" inputmode="decimal" min="1" max="10" step="0.5" data-f="rpe" value="${esc(st.rpe || '')}" placeholder="–">
    </div>` : ''}
    <div class="set-act">
      <button class="chk ${st.done ? 'on':''}" data-act="toggle-set" aria-label="Mark done">${I.check}</button>
      <button class="del-set" data-act="del-set" aria-label="Delete set">${I.x}</button>
    </div>
  </div>`;
}

let historyFilter = 'all';
function renderHistory(){
  const el = $('#view-history');
  if (!db.history.length){
    el.innerHTML = `<div class="empty"><div class="empty-ico">📋</div><h2>No workouts yet</h2>
      <p>Finish your first session and it'll show up here with full set details.</p></div>`;
    return;
  }
  const now = new Date();
  const filtered = db.history.filter(s => {
    if (historyFilter === 'all') return true;
    const d = new Date(s.date + 'T00:00:00');
    if (isNaN(d)) return true;
    const days = (now - d) / 86400000;
    if (historyFilter === 'week')  return days <= 7;
    if (historyFilter === 'month') return days <= 31;
    return true;
  });
  el.innerHTML = `
    <div class="chips">
      ${[['all','All'],['week','7 days'],['month','30 days']].map(([k,l]) =>
        `<button class="${historyFilter===k?'on':''}" data-act="hist-filter" data-f="${k}">${l}</button>`).join('')}
    </div>
    <div class="muted small" style="font-size:12px;font-weight:700;margin:0 2px 10px;">
      ${filtered.length} workout${filtered.length===1?'':'s'} · ${fmt(filtered.reduce((a,s)=>a+sessVolume(s),0))} ${db.settings.unit} total
    </div>
    ${filtered.map(historyCardHtml).join('') || `<div class="muted center" style="padding:40px 0;">No workouts in this range</div>`}
  `;
}

function historyCardHtml(s){
  const { d, m } = dateParts(s.date);
  const sets = sessSets(s);
  const dur  = s.finishedAt && s.startedAt ? fmtDur(s.finishedAt - s.startedAt) : '';
  const body = s.exercises.map(e => {
    const meta = exerciseMeta(e.name);
    const best = e.sets.reduce((mx, st) => Math.max(mx, e1RM(st.weight, st.reps)), 0);
    return `
      <div class="hist-ex">
        <div class="hist-ex-name">
          ${esc(e.name)}
          <span class="tag">${esc(meta.muscle)}</span>
          ${best > 0 ? `<span style="color:var(--text-mute);font-weight:600;font-size:10.5px;">e1RM ${fmt(best)}${db.settings.unit}</span>` : ''}
        </div>
        <div class="hist-sets">
          ${e.sets.map((st,i) => {
            const isPr = best > 0 && e1RM(st.weight, st.reps) >= best - 0.01 && !st.warmup;
            return `<span class="hist-set ${st.warmup?'warm':''} ${isPr?'pr':''}">
              ${st.warmup ? 'W' : (i+1)}. ${st.weight ? fmtD(st.weight) : 'BW'}×${fmt(st.reps)}${st.rpe ? ` @${st.rpe}` : ''}
            </span>`;
          }).join('')}
        </div>
      </div>`;
  }).join('');
  return `
    <div class="hist-card" data-sid="${s.id}">
      <div class="hist-head" data-act="toggle-hist">
        <div class="hist-date-badge"><span class="d">${d}</span><span class="m">${m}</span></div>
        <div class="hist-main">
          <div class="hist-name">${esc(s.name || 'Workout')}</div>
          <div class="hist-sub">${fmtDate(s.date)} · ${s.exercises.length} ex · ${sets} sets${dur ? ' · '+dur : ''}</div>
        </div>
        <div class="hist-vol">${fmt(sessVolume(s))}<span style="font-size:9px;font-weight:700;color:var(--text-mute);"> ${db.settings.unit}</span></div>
        <span class="hist-chev">${I.chev}</span>
      </div>
      <div class="hist-body hidden">
        ${s.notes ? `<div class="ex-note" style="margin:0 0 12px;">${esc(s.notes)}</div>` : ''}
        ${body || '<div class="muted small">No sets recorded.</div>'}
        <div class="row" style="gap:8px;margin-top:13px;">
          <button class="btn ghost sm" style="flex:1;" data-act="repeat-hist">↻ Repeat</button>
          <button class="btn ghost sm" style="flex:1;" data-act="hist-to-template">📋 Template</button>
          <button class="btn danger sm" style="flex:0 0 auto;" data-act="del-hist">Delete</button>
        </div>
      </div>
    </div>`;
}

let statsExercise = '';
function renderStats(){
  const el = $('#view-stats');
  if (!db.history.length){
    el.innerHTML = `<div class="empty"><div class="empty-ico">📊</div><h2>No data yet</h2>
      <p>Finish a workout to unlock volume charts, muscle breakdown and personal records.</p></div>`;
    return;
  }
  const totalVol  = db.history.reduce((a,s) => a + sessVolume(s), 0);
  const totalSets = db.history.reduce((a,s) => a + sessSets(s), 0);
  const now = new Date(); now.setHours(0,0,0,0);
  const dow = (now.getDay() + 6) % 7;
  const monday = new Date(now); monday.setDate(now.getDate() - dow);
  const weekSessions = db.history.filter(s => new Date(s.date + 'T00:00:00') >= monday);
  const weekVol = weekSessions.reduce((a,s) => a + sessVolume(s), 0);
  let streak = 0;
  {
    const wk = new Date(monday);
    for (let i = 0; i < 200; i++){
      const start = new Date(wk); start.setDate(wk.getDate() - i*7);
      const end   = new Date(start); end.setDate(start.getDate() + 7);
      const has = db.history.some(s => {
        const d = new Date(s.date + 'T00:00:00');
        return d >= start && d < end;
      });
      if (has) streak++;
      else if (i > 0) break;
    }
  }
  const recent = db.history.slice(0, 12).reverse();
  const maxVol = Math.max(1, ...recent.map(sessVolume));
  const muscleSets = {};
  db.history.forEach(s => s.exercises.forEach(e => {
    const m = exerciseMeta(e.name).muscle || 'Other';
    muscleSets[m] = (muscleSets[m] || 0) + e.sets.filter(x => !x.warmup).length;
  }));
  const muscleArr = Object.entries(muscleSets).sort((a,b) => b[1]-a[1]);
  const maxMuscle = Math.max(1, ...muscleArr.map(x => x[1]));
  const prs = {};
  db.history.forEach(s => s.exercises.forEach(e => {
    e.sets.forEach(st => {
      if (st.warmup) return;
      const orm = e1RM(st.weight, st.reps);
      if (orm <= 0) return;
      if (!prs[e.name] || orm > prs[e.name].orm)
        prs[e.name] = { weight:num(st.weight), reps:num(st.reps), orm, date:s.date };
    });
  }));
  const prList = Object.entries(prs).sort((a,b) => b[1].orm - a[1].orm).slice(0, 12);
  const loggedNames = Array.from(new Set(db.history.flatMap(s => s.exercises.map(e => e.name)))).sort();
  if (!statsExercise || !loggedNames.includes(statsExercise)) statsExercise = loggedNames[0] || '';
  let sparkHtml = '';
  if (statsExercise){
    const pts = [];
    db.history.slice().reverse().forEach(s => {
      const e = s.exercises.find(x => x.name === statsExercise);
      if (!e) return;
      const best = e.sets.filter(x => !x.warmup).reduce((m, st) => Math.max(m, e1RM(st.weight, st.reps)), 0);
      if (best > 0) pts.push({ date:s.date, orm:best });
    });
    if (pts.length){
      sparkHtml = `
        <div class="spark-wrap" style="margin-top:10px;">
          ${sparkSvg(pts.map(p => p.orm), 'prg')}
          <div class="spark-labels">
            <span>${fmtDate(pts[0].date)}</span>
            <span style="color:var(--accent);font-weight:800;">e1RM ${fmt(pts[pts.length-1].orm)} ${db.settings.unit}</span>
            <span>${fmtDate(pts[pts.length-1].date)}</span>
          </div>
        </div>`;
    } else {
      sparkHtml = `<div class="muted center" style="padding:24px;font-size:13px;">No weighted sets logged for this exercise.</div>`;
    }
  }
  const bw = db.bodyweight.slice().sort((a,b) => a.date.localeCompare(b.date));
  let bwHtml = '';
  if (bw.length >= 2){
    const last = bw[bw.length-1], first = bw[0];
    const delta = last.weight - first.weight;
    bwHtml = `
      <div class="spark-wrap" style="margin-top:10px;">
        ${sparkSvg(bw.map(b => b.weight), 'bw')}
        <div class="spark-labels">
          <span>${fmtDate(first.date)}</span>
          <span style="font-weight:800;">${fmtD(last.weight)} ${db.settings.unit} <span style="color:${delta<=0?'var(--success)':'var(--text-mute)'}">(${delta>0?'+':''}${delta.toFixed(1)})</span></span>
          <span>${fmtDate(last.date)}</span>
        </div>
      </div>`;
  }
  el.innerHTML = `
    <div class="stat-grid">
      <div class="stat"><div class="k">${I.dumbbell} Workouts</div><div class="v">${db.history.length}</div><div class="d">${totalSets} total sets</div></div>
      <div class="stat"><div class="k">Total volume</div><div class="v">${fmt(totalVol)}<small>${db.settings.unit}</small></div><div class="d">all time</div></div>
      <div class="stat"><div class="k">This week</div><div class="v">${fmt(weekVol)}<small>${db.settings.unit}</small></div><div class="d">${weekSessions.length} session${weekSessions.length===1?'':'s'}</div></div>
      <div class="stat"><div class="k">${I.fire} Streak</div><div class="v">${streak}<small>wk${streak===1?'':'s'}</small></div><div class="d">${streak>=2?'keep it going!':'train weekly'}</div></div>
    </div>
    <div class="sec-title">Volume trend <span class="ln"></span> last ${recent.length}</div>
    <div class="chart-card">
      <div class="bars">
        ${recent.map(s => {
          const v = sessVolume(s);
          const pct = clamp((v / maxVol) * 100, 4, 100);
          const { d } = dateParts(s.date);
          return `<div class="bar-col" title="${esc(s.name)} · ${fmt(v)}${db.settings.unit}">
            <span class="bar-v">${v >= 1000 ? (v/1000).toFixed(1)+'k' : fmt(v)}</span>
            <div class="bar" style="height:${pct}%"></div>
            <span class="bar-l">${d}</span>
          </div>`;
        }).join('')}
      </div>
    </div>
    ${muscleArr.length ? `
      <div class="sec-title">Muscle distribution <span class="ln"></span> working sets</div>
      <div class="chart-card">
        ${muscleArr.map(([m, c], i) => `
          <div class="mg-row">
            <span class="mg-name">${esc(m)}</span>
            <div class="mg-track"><div class="mg-fill" style="width:${(c/maxMuscle)*100}%;background:linear-gradient(90deg, ${PLATE_COLORS[i%PLATE_COLORS.length]}88, ${PLATE_COLORS[i%PLATE_COLORS.length]});"></div></div>
            <span class="mg-val">${c}</span>
          </div>`).join('')}
      </div>` : ''}
    <div class="sec-title">Exercise progress <span class="ln"></span> estimated 1RM</div>
    <select class="sel" data-act="pick-stat-ex">
      ${loggedNames.map(n => `<option value="${esc(n)}" ${n===statsExercise?'selected':''}>${esc(n)}</option>`).join('')}
    </select>
    ${sparkHtml}
    ${prList.length ? `
      <div class="sec-title">Personal records <span class="ln"></span> top ${prList.length}</div>
      ${prList.map(([name, p], i) => `
        <div class="pr-row">
          <span class="pr-rank">${i+1}</span>
          <div class="pr-info">
            <div class="pr-name">${esc(name)}</div>
            <div class="pr-meta">${fmtDate(p.date)} · ${fmtD(p.weight)}${db.settings.unit} × ${fmt(p.reps)}</div>
          </div>
          <span class="pr-val">${fmt(p.orm)}<span style="font-size:10px;color:var(--text-mute);font-weight:700;"> ${db.settings.unit}</span></span>
        </div>`).join('')}` : ''}
    <div class="sec-title">Body weight <span class="ln"></span> optional</div>
    ${bwHtml}
    <button class="btn ghost wide" style="margin-top:10px;" data-act="add-bw">＋ Log body weight</button>
  `;
}

function sparkSvg(values, idSuffix){
  if (!values || values.length < 2) return '';
  const W = 300, H = 90, PAD = 8;
  const max = Math.max(...values), min = Math.min(...values);
  const range = (max - min) || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (W - PAD*2) + PAD;
    const y = H - PAD - ((v - min) / range) * (H - PAD*2);
    return [x, y];
  });
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = d + ` L ${W-PAD} ${H} L ${PAD} ${H} Z`;
  const gid = 'sg_' + idSuffix;
  return `<svg class="sparkline" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
    </linearGradient></defs>
    <path d="${area}" fill="url(#${gid})"/>
    <path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
    ${pts.map((p, i) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${i===pts.length-1?3.6:2.2}" fill="var(--accent)"/>`).join('')}
  </svg>`;
}

let libFilter = 'All';
let libSearch = '';
function renderLibrary(){
  const el = $('#view-library');
  const all = allExercises();
  const customCount = db.custom.length;
  const q = libSearch.trim().toLowerCase();
  const list = all.filter(e =>
    (libFilter === 'All' || e.muscle === libFilter) &&
    (!q || e.name.toLowerCase().includes(q) || e.muscle.toLowerCase().includes(q))
  );
  el.innerHTML = `
    <button class="btn primary wide" data-act="new-exercise" style="margin-bottom:12px;">${I.plus} Create custom exercise</button>
    <div class="note-inline" style="margin-bottom:14px;">
      <span class="i">📚</span>
      <span><b>${all.length}</b> exercises available — <b>${customCount}</b> custom. Create your own with a name, muscle group and equipment.</span>
    </div>
    <input class="input" id="libSearch" placeholder="Search exercises…" value="${esc(libSearch)}" autocomplete="off" spellcheck="false" style="margin-bottom:12px;">
    <div class="chips">
      ${['All', ...MUSCLES].map(m => `<button class="${libFilter===m?'on':''}" data-act="lib-filter" data-m="${esc(m)}">${m}</button>`).join('')}
    </div>
    ${list.length ? list.map(e => `
      <div class="lib-item">
        <div class="lib-ico">${MUSCLE_ICON[e.muscle] || '⚙️'}</div>
        <div class="lib-info">
          <div class="lib-name">${esc(e.name)}</div>
          <div class="lib-meta">${esc(e.muscle)} · ${esc(e.equipment)}</div>
        </div>
        ${e.custom ? `
          <span class="lib-badge">Custom</span>
          <button class="icon-btn" data-act="edit-exercise" data-name="${esc(e.name)}" style="width:32px;height:32px;">${I.edit}</button>
        ` : `<button class="btn xs soft" data-act="quick-add" data-name="${esc(e.name)}">+ Log</button>`}
      </div>`).join('')
    : `<div class="muted center" style="padding:40px 0;font-size:13.5px;">
         No exercises match "${esc(libSearch)}".<br><br>
         <button class="btn primary sm" data-act="new-exercise-named" data-name="${esc(libSearch)}">+ Create "${esc(libSearch)}"</button>
       </div>`}
  `;
}

function renderSettings(){
  const el = $('#view-settings');
  const s = db.settings;
  const units = ['kg','lb'];
  el.innerHTML = `
    <div class="set-group">
      <div class="set-item">
        <div class="ico">⚖️</div>
        <div class="txt"><div class="t">Weight unit</div><div class="s">Used everywhere in the app</div></div>
        <div class="ctl"><div class="row" style="gap:5px;">
          ${units.map(u => `<button class="btn xs ${s.unit===u?'primary':'soft'}" data-act="set-unit" data-u="${u}">${u}</button>`).join('')}
        </div></div>
      </div>
      <div class="set-item">
        <div class="ico">🎨</div>
        <div class="txt"><div class="t">Appearance</div><div class="s">Light or dark theme</div></div>
        <div class="ctl"><div class="row" style="gap:5px;">
          <button class="btn xs ${s.theme==='dark'?'primary':'soft'}" data-act="set-theme" data-t="dark">Dark</button>
          <button class="btn xs ${s.theme==='light'?'primary':'soft'}" data-act="set-theme" data-t="light">Light</button>
        </div></div>
      </div>
    </div>
    <div class="sec-title">Rest timer <span class="ln"></span></div>
    <div class="set-group">
      <div class="set-item">
        <div class="ico">⏱️</div>
        <div class="txt"><div class="t">Default rest</div><div class="s">Starts when you tick a set</div></div>
        <div class="ctl"><div class="num-ctl">
          <button data-act="rest-dec">−</button><span>${s.rest}s</span><button data-act="rest-inc">+</button>
        </div></div>
      </div>
      <div class="set-item">
        <div class="ico">▶️</div>
        <div class="txt"><div class="t">Auto-start rest</div><div class="s">Begin timer when a set is completed</div></div>
        <div class="ctl"><button class="switch ${s.autoRest?'on':''}" data-act="tg" data-k="autoRest"></button></div>
      </div>
      <div class="set-item">
        <div class="ico">🔔</div>
        <div class="txt"><div class="t">Sound alert</div><div class="s">Beep when rest ends</div></div>
        <div class="ctl"><button class="switch ${s.sound?'on':''}" data-act="tg" data-k="sound"></button></div>
      </div>
      <div class="set-item">
        <div class="ico">📳</div>
        <div class="txt"><div class="t">Vibration</div><div class="s">Buzz when rest ends (mobile)</div></div>
        <div class="ctl"><button class="switch ${s.vibrate?'on':''}" data-act="tg" data-k="vibrate"></button></div>
      </div>
    </div>
    <div class="sec-title">Logging <span class="ln"></span></div>
    <div class="set-group">
      <div class="set-item">
        <div class="ico">🎚️</div>
        <div class="txt"><div class="t">Show RPE column</div><div class="s">Rate of perceived exertion (1–10)</div></div>
        <div class="ctl"><button class="switch ${s.rpe?'on':''}" data-act="tg" data-k="rpe"></button></div>
      </div>
      <div class="set-item">
        <div class="ico">🏷️</div>
        <div class="txt"><div class="t">Custom exercises</div><div class="s">${db.custom.length} created</div></div>
        <div class="ctl"><button class="btn xs soft" data-act="goto-library">Manage</button></div>
      </div>
    </div>
    <div class="sec-title">Data <span class="ln"></span></div>
    <div class="set-group">
      <div class="set-item">
        <div class="ico">📤</div>
        <div class="txt"><div class="t">Export backup</div><div class="s">Download all data as JSON</div></div>
        <div class="ctl"><button class="btn xs soft" data-act="export">Export</button></div>
      </div>
      <div class="set-item">
        <div class="ico">📥</div>
        <div class="txt"><div class="t">Import backup</div><div class="s">Restore from a JSON file</div></div>
        <div class="ctl"><button class="btn xs soft" data-act="import">Import</button></div>
      </div>
      <div class="set-item">
        <div class="ico">🗑️</div>
        <div class="txt"><div class="t" style="color:var(--danger)">Delete all data</div><div class="s">Erases workouts, templates &amp; exercises</div></div>
        <div class="ctl"><button class="btn xs danger" data-act="wipe">Delete</button></div>
      </div>
    </div>
    <div class="set-group">
      <div class="set-item">
        <div class="ico">📲</div>
        <div class="txt"><div class="t">Install as app</div><div class="s">Add GymLog to your home screen</div></div>
        <div class="ctl"><button class="btn xs primary" data-act="install-help">How</button></div>
      </div>
    </div>
    <div class="muted center" style="font-size:11.5px;padding:8px 20px 20px;line-height:1.7;font-weight:600;">
      GymLog Pro · v1.0<br>100% offline · your data never leaves this device
    </div>
  `;
}

let currentTab = 'workout';
function switchTab(tab){
  currentTab = tab;
  $$('.view').forEach(v => v.classList.add('hidden'));
  const v = $('#view-' + tab);
  if (v) v.classList.remove('hidden');
  $$('.tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  $('#main').scrollTop = 0;
}
function renderAll(){
  renderWorkout(); renderHistory(); renderStats(); renderLibrary(); renderSettings();
}
function renderCurrent(){
  switch(currentTab){
    case 'workout':  renderWorkout(); break;
    case 'history':  renderHistory(); break;
    case 'stats':    renderStats();   break;
    case 'library':  renderLibrary(); break;
    case 'settings': renderSettings();break;
  }
}

const rest = { endAt:0, total:0, timer:null, active:false };
function startRest(sec){
  sec = clamp(Math.round(sec), 5, 3600);
  rest.total  = sec;
  rest.endAt  = Date.now() + sec * 1000;
  rest.active = true;
  const bar = $('#restbar');
  bar.classList.remove('hidden','done');
  $('#restLbl').textContent = 'Resting';
  clearInterval(rest.timer);
  rest.timer = setInterval(tickRest, 200);
  tickRest();
}
function tickRest(){
  if (!rest.active) return;
  const left = Math.max(0, rest.endAt - Date.now());
  const sec  = Math.ceil(left / 1000);
  $('#restTime').textContent = fmtClock(sec);
  $('#restFill').style.width = (left / (rest.total * 1000) * 100) + '%';
  if (left <= 0){
    $('#restLbl').textContent = 'Rest complete';
    $('#restbar').classList.add('done');
    stopRestTimer();
    alertUser();
  }
}
function stopRestTimer(){ clearInterval(rest.timer); rest.timer = null; rest.active = false; }
function hideRest(){ stopRestTimer(); $('#restbar').classList.add('hidden'); }
function alertUser(){
  if (db.settings.sound) beep();
  if (db.settings.vibrate && navigator.vibrate) navigator.vibrate([200, 80, 200, 80, 320]);
  setTimeout(() => { if (!rest.active) $('#restbar').classList.add('hidden'); }, 3500);
}
function beep(){
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const play = (freq, start, dur, vol) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      g.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + start + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
      o.start(ctx.currentTime + start);
      o.stop(ctx.currentTime + start + dur + 0.03);
    };
    play(880, 0, 0.14, 0.22);
    play(1175, 0.17, 0.14, 0.22);
    play(1568, 0.34, 0.30, 0.20);
    setTimeout(() => ctx.close(), 1400);
  } catch(e){}
}

function openModal(inner, opts){
  const m = $('#modal');
  m.innerHTML = `<div class="sheet">${inner}</div>`;
  m.classList.remove('hidden');
  if (opts && opts.onMount) setTimeout(() => opts.onMount(m), 30);
}
function closeModal(){
  const m = $('#modal');
  m.classList.add('hidden');
  m.innerHTML = '';
}

let pickerFilter = 'All';
function openExercisePicker(){
  pickerFilter = 'All';
  openModal(`
    <div class="sheet-grip"></div>
    <div class="sheet-head"><h3>Add exercise</h3><button class="icon-btn" data-act="close-modal">${I.x}</button></div>
    <div class="sheet-body" style="display:flex;flex-direction:column;">
      <input class="input" id="pickSearch" placeholder="Search exercises…" autocomplete="off" spellcheck="false">
      <div class="chips" id="pickChips" style="margin-top:12px;"></div>
      <div id="pickList" style="flex:1;"></div>
    </div>
  `, { onMount(){
    renderPickerChips(); renderPickerList('');
    const inp = $('#pickSearch');
    inp.addEventListener('input', () => renderPickerList(inp.value));
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter' && inp.value.trim()) addExerciseToSession(inp.value.trim());
    });
    setTimeout(() => inp.focus(), 80);
  }});
}
function renderPickerChips(){
  const el = $('#pickChips'); if (!el) return;
  el.innerHTML = ['All', ...MUSCLES].map(m =>
    `<button class="${pickerFilter===m?'on':''}" data-act="pick-filter" data-m="${esc(m)}">${m}</button>`).join('');
}
function renderPickerList(q){
  const el = $('#pickList'); if (!el) return;
  const query = String(q||'').trim().toLowerCase();
  const all = allExercises();
  const list = all.filter(e =>
    (pickerFilter === 'All' || e.muscle === pickerFilter) &&
    (!query || e.name.toLowerCase().includes(query))
  );
  let html = '';
  if (query && !all.some(e => e.name.toLowerCase() === query)){
    html += `<button class="ex-pick create" data-act="pick-new" data-name="${esc(query)}">
      <span class="pi">${I.plus}</span>
      <span style="flex:1;min-width:0;">
        <span class="pn">Create "${esc(query)}"</span>
        <span class="pm">Custom exercise with your own details</span>
      </span></button>`;
  }
  html += list.slice(0, 300).map(e => `
    <button class="ex-pick" data-act="pick-ex" data-name="${esc(e.name)}">
      <span class="pi">${MUSCLE_ICON[e.muscle] || '⚙️'}</span>
      <span style="flex:1;min-width:0;">
        <span class="pn">${esc(e.name)}</span>
        <span class="pm">${esc(e.muscle)} · ${esc(e.equipment)}${e.custom ? ' · Custom' : ''}</span>
      </span>
      <span style="color:var(--text-mute);font-size:18px;font-weight:300;">＋</span>
    </button>`).join('');
  el.innerHTML = html || `<div class="muted center" style="padding:34px 0;font-size:13.5px;">No exercises match "${esc(q)}".</div>`;
}

function openExerciseForm(presetName, editName){
  const editing = editName ? db.custom.find(e => e.name === editName) : null;
  const name    = editing ? editing.name : (presetName || '');
  const muscle  = editing ? editing.muscle : 'Chest';
  const equip   = editing ? editing.equipment : 'Barbell';
  openModal(`
    <div class="sheet-grip"></div>
    <div class="sheet-head"><h3>${editing ? 'Edit exercise' : 'New exercise'}</h3><button class="icon-btn" data-act="close-modal">${I.x}</button></div>
    <div class="sheet-body">
      <div class="field-group"><label class="field-label">Exercise name</label>
        <input class="input" id="newExName" placeholder="e.g. Landmine Press" value="${esc(name)}" autocomplete="off" spellcheck="false"></div>
      <div class="field-group"><label class="field-label">Primary muscle group</label>
        <select class="sel" id="newExMuscle">${MUSCLES.map(m => `<option value="${esc(m)}" ${m===muscle?'selected':''}>${esc(m)}</option>`).join('')}</select></div>
      <div class="field-group"><label class="field-label">Equipment</label>
        <select class="sel" id="newExEquip">${EQUIPMENT.map(e => `<option value="${esc(e)}" ${e===equip?'selected':''}>${esc(e)}</option>`).join('')}</select></div>
      <div class="note-inline"><span class="i">💡</span><span>Custom exercises are saved to your library and appear in search alongside the built-in ones.</span></div>
    </div>
    <div class="sheet-foot">
      ${editing ? `<button class="btn danger" data-act="delete-custom" data-name="${esc(editing.name)}">Delete</button>` : ''}
      <button class="btn ghost" data-act="close-modal">Cancel</button>
      <button class="btn primary" data-act="save-exercise" data-edit="${esc(editName||'')}">${editing ? 'Save changes' : 'Create exercise'}</button>
    </div>
  `, { onMount(){
    const inp = $('#newExName');
    setTimeout(() => { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }, 80);
  }});
}

function openSessionNote(){
  const s = db.active; if (!s) return;
  openModal(`
    <div class="sheet-grip"></div>
    <div class="sheet-head"><h3>Workout notes</h3><button class="icon-btn" data-act="close-modal">${I.x}</button></div>
    <div class="sheet-body">
      <textarea class="input" id="sessNote" rows="5" placeholder="How did it feel? Anything to remember?" style="resize:vertical;min-height:110px;font-size:15px;line-height:1.6;">${esc(s.notes || '')}</textarea>
    </div>
    <div class="sheet-foot">
      <button class="btn ghost" data-act="close-modal">Cancel</button>
      <button class="btn primary" data-act="save-sess-note">Save note</button>
    </div>
  `, { onMount(){ setTimeout(() => $('#sessNote').focus(), 80); }});
}

function openExerciseMenu(exId){
  const ex = findEx(exId); if (!ex) return;
  const s = db.active;
  const idx = s.exercises.findIndex(e => e.id === exId);
  const meta = exerciseMeta(ex.name);
  openModal(`
    <div class="sheet-grip"></div>
    <div class="sheet-head"><h3 style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(ex.name)}</h3><button class="icon-btn" data-act="close-modal">${I.x}</button></div>
    <div class="sheet-body">
      <div class="row" style="gap:7px;margin-bottom:16px;flex-wrap:wrap;">
        <span class="chip">${MUSCLE_ICON[meta.muscle]||'⚙️'} ${esc(meta.muscle)}</span>
        <span class="chip">${esc(meta.equipment)}</span>
        <span class="chip accent">${fmt(exVolume(ex))} ${db.settings.unit}</span>
      </div>
      <div class="field-group"><label class="field-label">Exercise notes</label>
        <textarea class="input" id="exNote" rows="3" placeholder="Tempo, cues, seat height…" style="resize:vertical;min-height:80px;font-size:15px;">${esc(ex.notes || '')}</textarea></div>
      <div class="sec-title">Actions <span class="ln"></span></div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <button class="btn ghost wide" style="justify-content:flex-start;" data-act="move-ex" data-exid="${exId}" data-dir="-1" ${idx===0?'disabled':''}>↑ Move up</button>
        <button class="btn ghost wide" style="justify-content:flex-start;" data-act="move-ex" data-exid="${exId}" data-dir="1" ${idx===s.exercises.length-1?'disabled':''}>↓ Move down</button>
        <button class="btn ghost wide" style="justify-content:flex-start;" data-act="dup-ex" data-exid="${exId}">⧉ Duplicate exercise</button>
        ${meta.custom ? `<button class="btn ghost wide" style="justify-content:flex-start;" data-act="edit-exercise" data-name="${esc(ex.name)}">✎ Edit custom exercise</button>` : ''}
        <button class="btn danger wide" style="justify-content:flex-start;" data-act="del-exercise" data-exid="${exId}">🗑 Remove from workout</button>
      </div>
    </div>
    <div class="sheet-foot">
      <button class="btn ghost" data-act="close-modal">Cancel</button>
      <button class="btn primary" data-act="save-ex-note" data-exid="${exId}">Save notes</button>
    </div>
  `);
}

function openQuickMenu(){
  openModal(`
    <div class="sheet-grip"></div>
    <div class="sheet-head"><h3>Quick actions</h3><button class="icon-btn" data-act="close-modal">${I.x}</button></div>
    <div class="sheet-body">
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${db.active ? `<button class="btn primary wide" style="justify-content:flex-start;" data-act="goto-workout">▶ Continue current workout</button>`
                    : `<button class="btn primary wide" style="justify-content:flex-start;" data-act="start">＋ Start new workout</button>`}
        ${db.history.length ? `<button class="btn ghost wide" style="justify-content:flex-start;" data-act="repeat-hist" data-sid="${db.history[0].id}">↻ Repeat last: ${esc(db.history[0].name || 'Workout')}</button>` : ''}
        ${db.active && db.active.exercises.length ? `<button class="btn ghost wide" style="justify-content:flex-start;" data-act="save-template">📋 Save current as template</button>` : ''}
        <button class="btn ghost wide" style="justify-content:flex-start;" data-act="add-bw">⚖️ Log body weight</button>
        <div class="divider"></div>
        <button class="btn ghost wide" style="justify-content:flex-start;" data-act="export">📤 Export backup</button>
        <button class="btn ghost wide" style="justify-content:flex-start;" data-act="import">📥 Import backup</button>
      </div>
    </div>
  `);
}

function saveCurrentAsTemplate(){
  const s = db.active; if (!s || !s.exercises.length){ toast('Nothing to save'); return; }
  const name = prompt('Template name:', s.name || 'My routine');
  if (!name) return;
  db.templates.push({
    id: uid(), name: name.trim(),
    exercises: s.exercises.map(e => ({ name: e.name, sets: e.sets.map(st => ({ weight: st.weight, reps: st.reps })) }))
  });
  saveNow(); closeModal(); toast('Template saved 📋');
}

function saveHistoryAsTemplate(sid){
  const s = db.history.find(x => x.id === sid); if (!s) return;
  const name = prompt('Template name:', s.name || 'Routine');
  if (!name) return;
  db.templates.push({
    id: uid(), name: name.trim(),
    exercises: s.exercises.map(e => ({ name: e.name, sets: e.sets.map(st => ({ weight: st.weight, reps: st.reps })) }))
  });
  saveNow(); closeModal(); toast('Template saved 📋');
}

function useTemplate(tid){
  const t = db.templates.find(x => x.id === tid); if (!t) return;
  if (db.active && db.active.exercises.length){
    if (!confirm('This replaces your current workout. Continue?')) return;
  }
  db.active = {
    id: uid(), name: t.name, date: todayISO(), startedAt: Date.now(), notes: '',
    exercises: t.exercises.map(e => {
      const nx = { id: uid(), name: e.name, notes: '', sets: [] };
      const sets = (e.sets && e.sets.length) ? e.sets : [{ weight:'', reps:'' }];
      nx.sets = sets.map(st => ({ id: uid(), weight: st.weight ?? '', reps: st.reps ?? '', done:false, warmup:false, rpe:'' }));
      return nx;
    })
  };
  saveNow(); closeModal(); renderWorkout(); switchTab('workout');
  toast('Template loaded');
}

function openBodyWeight(){
  const last = db.bodyweight.length ? db.bodyweight[db.bodyweight.length-1].weight : '';
  openModal(`
    <div class="sheet-grip"></div>
    <div class="sheet-head"><h3>Log body weight</h3><button class="icon-btn" data-act="close-modal">${I.x}</button></div>
    <div class="sheet-body">
      <div class="field-group"><label class="field-label">Weight (${db.settings.unit})</label>
        <input class="input" id="bwInput" type="number" inputmode="decimal" step="0.1" placeholder="e.g. 78.5" value="${last}"></div>
      <div class="field-group"><label class="field-label">Date</label>
        <input class="input" id="bwDate" type="date" value="${todayISO()}"></div>
      ${db.bodyweight.length ? `
        <div class="sec-title">Recent <span class="ln"></span></div>
        ${db.bodyweight.slice().reverse().slice(0,6).map(b => `
          <div class="lib-item" style="padding:10px 12px;">
            <div class="lib-info"><div class="lib-name" style="font-size:13px;">${fmtDate(b.date)}</div></div>
            <div style="font-weight:800;color:var(--accent);font-size:14px;">${fmtD(b.weight)} ${db.settings.unit}</div>
            <button class="icon-btn" data-act="del-bw" data-date="${b.date}" style="width:30px;height:30px;">${I.x}</button>
          </div>`).join('')}` : ''}
    </div>
    <div class="sheet-foot">
      <button class="btn ghost" data-act="close-modal">Cancel</button>
      <button class="btn primary" data-act="save-bw">Save</button>
    </div>
  `, { onMount(){ setTimeout(() => $('#bwInput').focus(), 80); }});
}

function confirmSheet(title, message, confirmLabel, onConfirm, danger){
  openModal(`
    <div class="sheet-grip"></div>
    <div class="sheet-head"><h3>${esc(title)}</h3></div>
    <div class="sheet-body confirm-body"><p>${message}</p></div>
    <div class="sheet-foot">
      <button class="btn ghost" data-act="close-modal">Cancel</button>
      <button class="btn ${danger?'danger':'primary'}" id="confirmOk">${esc(confirmLabel)}</button>
    </div>
  `, { onMount(){
    const btn = $('#confirmOk');
    btn.addEventListener('click', () => { closeModal(); onConfirm(); }, { once:true });
  }});
}

function startWorkout(name){
  if (db.active && db.active.exercises.length){
    confirmSheet('Replace workout?', 'You already have an active workout. Starting a new one will discard it.', 'Start new', () => {
      db.active = { id:uid(), name:name||'', date:todayISO(), startedAt:Date.now(), notes:'', exercises:[] };
      saveNow(); renderWorkout(); switchTab('workout');
    }, true);
    return;
  }
  db.active = { id:uid(), name:name||'', date:todayISO(), startedAt:Date.now(), notes:'', exercises:[] };
  saveNow(); renderWorkout(); switchTab('workout');
}

function addExerciseToSession(name){
  const s = ensureActive();
  const clean = String(name||'').trim();
  if (!clean) return;
  const known = allExercises().some(e => e.name.toLowerCase() === clean.toLowerCase());
  if (!known) db.custom.push({ id: uid(), name: clean, muscle:'Other', equipment:'Other' });
  const ex = { id: uid(), name: clean, notes:'', sets: [] };
  ex.sets.push(newSetFor(ex));
  s.exercises.push(ex);
  saveNow(); closeModal(); renderWorkout(); switchTab('workout');
  requestAnimationFrame(() => {
    const card = $(`.ex-card[data-exid="${ex.id}"]`);
    if (card) card.scrollIntoView({ behavior:'smooth', block:'center' });
  });
}

function duplicateExercise(exId){
  const s = db.active; if (!s) return;
  const ex = findEx(exId); if (!ex) return;
  const idx = s.exercises.findIndex(e => e.id === exId);
  const copy = {
    id: uid(), name: ex.name, notes: ex.notes,
    sets: ex.sets.map(st => ({ id:uid(), weight:st.weight, reps:st.reps, done:false, warmup:st.warmup, rpe:st.rpe }))
  };
  s.exercises.splice(idx + 1, 0, copy);
  saveNow(); closeModal(); renderWorkout();
  toast('Duplicated');
}

function moveExercise(exId, dir){
  const s = db.active; if (!s) return;
  const idx = s.exercises.findIndex(e => e.id === exId);
  const ni = idx + dir;
  if (idx < 0 || ni < 0 || ni >= s.exercises.length) return;
  const [x] = s.exercises.splice(idx, 1);
  s.exercises.splice(ni, 0, x);
  saveNow(); closeModal(); renderWorkout();
}

function deleteExercise(exId){
  const s = db.active; if (!s) return;
  const ex = findEx(exId); if (!ex) return;
  confirmSheet('Remove exercise?', `"${esc(ex.name)}" and its ${ex.sets.length} set${ex.sets.length===1?'':'s'} will be removed from this workout.`, 'Remove', () => {
    s.exercises = s.exercises.filter(e => e.id !== exId);
    saveNow(); closeModal(); renderWorkout();
    toast('Removed');
  }, true);
}

function finishWorkout(){
  const s = db.active; if (!s) return;
  const hasData = s.exercises.some(e => e.sets.length && e.sets.some(st => (num(st.weight) || num(st.reps))));
  if (!hasData){
    confirmSheet('Discard empty workout?', 'No sets have been logged yet. This workout will not be saved.', 'Discard', () => {
      db.active = null; saveNow(); renderWorkout(); switchTab('history');
    }, true);
    return;
  }
  s.finishedAt = Date.now();
  if (!String(s.name||'').trim()){
    const d = new Date(s.date + 'T00:00:00');
    s.name = isNaN(d) ? 'Workout' : d.toLocaleDateString(undefined,{weekday:'long'}) + ' session';
  }
  db.history.unshift(s);
  db.history.sort((a,b) => (b.date || '').localeCompare(a.date || '') || (b.startedAt||0) - (a.startedAt||0));
  db.active = null;
  saveNow(); renderAll(); switchTab('history');
  toast('Workout saved 💪', 2400);
}

function repeatHistory(sid){
  const src = db.history.find(x => x.id === sid); if (!src) return;
  const doIt = () => {
    db.active = {
      id: uid(), name: src.name, date: todayISO(), startedAt: Date.now(), notes: '',
      exercises: src.exercises.map(e => {
        const nx = { id: uid(), name: e.name, notes: e.notes || '', sets: [] };
        const sets = e.sets.length ? e.sets : [{ weight:'', reps:'' }];
        nx.sets = sets.map(st => ({ id:uid(), weight: st.weight, reps: st.reps, done:false, warmup:false, rpe:'' }));
        return nx;
      })
    };
    saveNow(); closeModal(); renderAll(); switchTab('workout');
    toast('Workout loaded');
  };
  if (db.active && db.active.exercises.length){
    confirmSheet('Replace workout?', 'Your current workout will be discarded.', 'Replace', doIt, true);
  } else doIt();
}

document.addEventListener('click', e => {
  const tabBtn = e.target.closest('.tabbar button');
  if (tabBtn){ switchTab(tabBtn.dataset.tab); return; }

  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  const card = el.closest('.ex-card');
  // ✅ FIX: read exId from the button itself first (for modal buttons)
  const exId = el.dataset.exid || (card ? card.dataset.exid : null);

  switch(act){
    case 'goto-workout': closeModal(); switchTab('workout'); break;
    case 'goto-library': closeModal(); switchTab('library'); renderLibrary(); break;
    case 'close-modal':  closeModal(); break;
    case 'quick-menu':   openQuickMenu(); break;
    case 'start':        closeModal(); startWorkout(); break;
    case 'add-exercise': openExercisePicker(); break;
    case 'pick-filter':  pickerFilter = el.dataset.m; renderPickerChips(); renderPickerList($('#pickSearch')?.value || ''); break;
    case 'pick-ex':      addExerciseToSession(el.dataset.name); break;
    case 'pick-new':     openExerciseForm(el.dataset.name); break;
    case 'add-set': {
      const ex = findEx(exId); if (!ex) break;
      const st = newSetFor(ex);
      ex.sets.push(st); save();
      const list = card.querySelector('[data-role="setlist"]');
      if (list){
        const tmp = document.createElement('div');
        tmp.innerHTML = setRowHtml(ex, st, ex.sets.length - 1);
        list.appendChild(tmp.firstElementChild);
      }
      updateExerciseVolume(exId);
      break;
    }
    case 'del-set': {
      const ex = findEx(exId); if (!ex) break;
      const row = el.closest('[data-setid]'); if (!row) break;
      ex.sets = ex.sets.filter(s => s.id !== row.dataset.setid);
      row.style.transition = 'opacity .15s, transform .15s';
      row.style.opacity = '0';
      row.style.transform = 'translateX(-8px)';
      setTimeout(() => { row.remove(); renumberSets(exId); updateExerciseVolume(exId); }, 150);
      save();
      break;
    }
    case 'toggle-set': {
      const ex = findEx(exId); if (!ex) break;
      const row = el.closest('[data-setid]'); if (!row) break;
      const st = ex.sets.find(s => s.id === row.dataset.setid); if (!st) break;
      st.done = !st.done;
      row.classList.toggle('done', st.done);
      el.classList.toggle('on', st.done);
      save();
      if (st.done && db.settings.autoRest && !st.warmup) startRest(db.settings.rest);
      break;
    }
    case 'toggle-warm': {
      const ex = findEx(exId); if (!ex) break;
      const row = el.closest('[data-setid]'); if (!row) break;
      const st = ex.sets.find(s => s.id === row.dataset.setid); if (!st) break;
      st.warmup = !st.warmup; save();
      const idx = ex.sets.indexOf(st);
      el.classList.toggle('warm', st.warmup);
      el.textContent = st.warmup ? 'W' : String(idx + 1);
      break;
    }
    case 'ex-menu': openExerciseMenu(exId); break;
    case 'save-ex-note': {
      const ex = findEx(el.dataset.exid); if (!ex) break;
      const ta = $('#exNote');
      ex.notes = ta ? ta.value.trim() : '';
      saveNow(); closeModal(); renderWorkout();
      toast('Notes saved');
      break;
    }
    case 'move-ex':  moveExercise(exId, Number(el.dataset.dir)); break;
    case 'dup-ex':   duplicateExercise(exId); break;
    case 'del-exercise': deleteExercise(exId); break;
    case 'session-note': openSessionNote(); break;
    case 'save-sess-note': {
      const s = db.active; if (!s) break;
      const ta = $('#sessNote');
      s.notes = ta ? ta.value.trim() : '';
      saveNow(); closeModal(); renderWorkout();
      toast('Note saved');
      break;
    }
    case 'save-template':
      if (db.active && db.active.exercises.length) saveCurrentAsTemplate();
      else toast('Add exercises first');
      break;
    case 'use-template':  useTemplate(el.dataset.tid); break;
    case 'hist-to-template': saveHistoryAsTemplate(el.closest('.hist-card').dataset.sid); break;
    case 'finish':  finishWorkout(); break;
    case 'discard':
      confirmSheet('Discard workout?', 'All logged sets will be lost. This cannot be undone.', 'Discard', () => {
        db.active = null; saveNow(); renderWorkout(); switchTab('history');
        toast('Discarded');
      }, true);
      break;
    case 'hist-filter': historyFilter = el.dataset.f; renderHistory(); break;
    case 'toggle-hist': {
      const hc = el.closest('.hist-card');
      const body = hc.querySelector('.hist-body');
      const open = !body.classList.contains('hidden');
      body.classList.toggle('hidden', open);
      hc.classList.toggle('open', !open);
      break;
    }
    case 'repeat-hist': repeatHistory(el.dataset.sid || el.closest('.hist-card').dataset.sid); break;
    case 'del-hist': {
      const sid = el.closest('.hist-card').dataset.sid;
      confirmSheet('Delete workout?', 'This workout will be permanently removed from your history.', 'Delete', () => {
        db.history = db.history.filter(s => s.id !== sid);
        saveNow(); renderAll(); toast('Deleted');
      }, true);
      break;
    }
    case 'add-bw': openBodyWeight(); break;
    case 'save-bw': {
      const w = num($('#bwInput').value);
      const d = $('#bwDate').value || todayISO();
      if (!w){ toast('Enter a weight'); break; }
      db.bodyweight = db.bodyweight.filter(b => b.date !== d);
      db.bodyweight.push({ date:d, weight:w });
      db.bodyweight.sort((a,b) => a.date.localeCompare(b.date));
      saveNow(); closeModal(); renderStats();
      toast('Weight logged');
      break;
    }
    case 'del-bw': {
      const d = el.dataset.date;
      db.bodyweight = db.bodyweight.filter(b => b.date !== d);
      saveNow(); openBodyWeight(); renderStats();
      break;
    }
    case 'lib-filter': libFilter = el.dataset.m; renderLibrary(); break;
    case 'new-exercise': openExerciseForm(); break;
    case 'new-exercise-named': openExerciseForm(el.dataset.name); break;
    case 'edit-exercise': openExerciseForm(null, el.dataset.name); break;
    case 'quick-add': addExerciseToSession(el.dataset.name); break;
    case 'save-exercise': {
      const name = $('#newExName').value.trim();
      const muscle = $('#newExMuscle').value;
      const equip  = $('#newExEquip').value;
      const editName = el.dataset.edit;
      if (!name){ toast('Enter a name'); break; }
      if (name.length > 60){ toast('Name too long'); break; }
      const dup = allExercises().find(x =>
        x.name.toLowerCase() === name.toLowerCase() &&
        (!editName || x.name.toLowerCase() !== editName.toLowerCase())
      );
      if (dup){ toast('That exercise already exists'); break; }
      if (editName){
        const idx = db.custom.findIndex(c => c.name === editName);
        if (idx >= 0) db.custom[idx] = { id: db.custom[idx].id, name, muscle, equipment: equip };
        if (db.active) db.active.exercises.forEach(e => { if (e.name === editName) e.name = name; });
        saveNow(); closeModal(); renderAll();
        toast('Exercise updated');
      } else {
        db.custom.push({ id: uid(), name, muscle, equipment: equip });
        saveNow(); closeModal(); renderLibrary();
        toast('Exercise created ✓');
      }
      break;
    }
    case 'delete-custom': {
      const name = el.dataset.name;
      confirmSheet('Delete exercise?', `"${esc(name)}" will be removed from your library. Past workouts are unaffected.`, 'Delete', () => {
        db.custom = db.custom.filter(c => c.name !== name);
        saveNow(); closeModal(); renderLibrary();
        toast('Deleted');
      }, true);
      break;
    }
    case 'set-unit': db.settings.unit = el.dataset.u; saveNow(); renderSettings(); renderCurrent(); toast('Unit: ' + el.dataset.u); break;
    case 'set-theme': db.settings.theme = el.dataset.t; applyTheme(); saveNow(); renderSettings(); break;
    case 'tg': {
      const k = el.dataset.k;
      db.settings[k] = !db.settings[k];
      el.classList.toggle('on', db.settings[k]);
      saveNow();
      if (k === 'rpe' && currentTab === 'workout') renderWorkout();
      break;
    }
    case 'rest-inc': db.settings.rest = clamp(db.settings.rest + 15, 15, 600); saveNow(); renderSettings(); break;
    case 'rest-dec': db.settings.rest = clamp(db.settings.rest - 15, 15, 600); saveNow(); renderSettings(); break;
    case 'export': exportData(); break;
    case 'import': importData(); break;
    case 'wipe':
      confirmSheet('Delete everything?', 'All workouts, templates, custom exercises and body-weight entries will be permanently erased from this device.', 'Erase all', () => {
        db = { version:1, settings: Object.assign({}, DEFAULT_SETTINGS), custom:[], templates:[], active:null, history:[], bodyweight:[] };
        try { localStorage.removeItem(DB_KEY); localStorage.removeItem(DB_KEY + '.bak'); } catch(err){}
        applyTheme(); renderAll(); closeModal(); switchTab('workout');
        toast('All data erased');
      }, true);
      break;
    case 'install-help': openInstallHelp(); break;
    case 'rest-skip':  hideRest(); break;
    case 'rest-plus':  rest.endAt += 15000; rest.total += 15; tickRest(); break;
    case 'rest-minus': rest.endAt = Math.max(Date.now(), rest.endAt - 15000); rest.total = Math.max(15, rest.total - 15); tickRest(); break;
  }
});

document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'sessionName' && db.active){ db.active.name = t.value; save(); return; }
  if (t.id === 'sessionDate' && db.active){ db.active.date = t.value || todayISO(); save(); return; }
  if (t.id === 'libSearch'){
    libSearch = t.value;
    const cur = t.selectionStart;
    renderLibrary();
    const ni = $('#libSearch');
    if (ni){ ni.focus(); try { ni.setSelectionRange(cur, cur); } catch(err){} }
    return;
  }
  const f = t.dataset && t.dataset.f;
  if (!f) return;
  const card = t.closest('.ex-card');
  const row  = t.closest('[data-setid]');
  if (!card || !row) return;
  const ex = findEx(card.dataset.exid);
  if (!ex) return;
  const st = ex.sets.find(s => s.id === row.dataset.setid);
  if (!st) return;
  if (f === 'rpe') st.rpe = t.value === '' ? '' : clamp(num(t.value), 1, 10);
  else st[f] = t.value === '' ? '' : Math.max(0, num(t.value));
  save();
  updateExerciseVolume(card.dataset.exid);
});

document.addEventListener('focusin', e => {
  const t = e.target;
  if (t.tagName === 'INPUT' && t.type === 'number'){
    setTimeout(() => { try { t.select(); } catch(err){} }, 10);
  }
});

document.addEventListener('change', e => {
  if (e.target.matches('[data-act="pick-stat-ex"]')){
    statsExercise = e.target.value;
    renderStats();
  }
});

$('#modal').addEventListener('click', e => {
  if (e.target.id === 'modal') closeModal();
});

function updateExerciseVolume(exId){
  const ex = findEx(exId); if (!ex) return;
  const card = $(`.ex-card[data-exid="${exId}"]`);
  if (!card) return;
  const v = card.querySelector('[data-role="exvol"]');
  if (v) v.textContent = fmt(exVolume(ex)) + ' ' + db.settings.unit;
  const total = $('#sessVol');
  if (total && db.active) total.textContent = fmt(sessVolume(db.active)) + ' ' + db.settings.unit;
}
function renumberSets(exId){
  const ex = findEx(exId); if (!ex) return;
  const card = $(`.ex-card[data-exid="${exId}"]`);
  if (!card) return;
  const rows = card.querySelectorAll('[data-role="setlist"] .set-row');
  rows.forEach((row, i) => {
    const badge = row.querySelector('.set-badge');
    if (badge && !badge.classList.contains('warm')) badge.textContent = String(i + 1);
  });
}

function exportData(){
  try {
    const payload = { app:'GymLog Pro', exportedAt:new Date().toISOString(), data: db };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `gymlog-backup-${todayISO()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    closeModal(); toast('Backup downloaded ✓');
  } catch(e){ toast('Export failed'); }
}
function importData(){
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'application/json,.json';
  inp.onchange = () => {
    const f = inp.files && inp.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        let parsed = JSON.parse(r.result);
        if (parsed && parsed.data) parsed = parsed.data;
        if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.history)) throw new Error('bad');
        db = {
          version: 1,
          settings: Object.assign({}, DEFAULT_SETTINGS, parsed.settings || {}),
          custom: Array.isArray(parsed.custom) ? parsed.custom : [],
          templates: Array.isArray(parsed.templates) ? parsed.templates : [],
          active: parsed.active || null,
          history: Array.isArray(parsed.history) ? parsed.history : [],
          bodyweight: Array.isArray(parsed.bodyweight) ? parsed.bodyweight : []
        };
        saveNow(); applyTheme(); renderAll(); closeModal(); switchTab('workout');
        toast('Data imported ✓');
      } catch(err){ toast('Invalid backup file'); }
    };
    r.readAsText(f);
  };
  inp.click();
}

function openInstallHelp(){
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  openModal(`
    <div class="sheet-grip"></div>
    <div class="sheet-head"><h3>Install GymLog</h3><button class="icon-btn" data-act="close-modal">${I.x}</button></div>
    <div class="sheet-body">
      ${isStandalone ? `<div class="note-inline" style="margin-bottom:14px;"><span class="i">✅</span><span>You're already running GymLog as an installed app. Nice.</span></div>` : ''}
      <div class="card" style="line-height:1.7;font-size:14px;">
        ${isIOS ? `
          <p style="margin:0 0 12px;font-weight:800;">On iPhone / iPad (Safari)</p>
          <ol style="margin:0;padding-left:20px;color:var(--text-dim);">
            <li>Tap the <b style="color:var(--text)">Share</b> button at the bottom</li>
            <li>Scroll down, tap <b style="color:var(--text)">Add to Home Screen</b></li>
            <li>Tap <b style="color:var(--text)">Add</b> — you're done</li>
          </ol>` : `
          <p style="margin:0 0 12px;font-weight:800;">On Android (Chrome)</p>
          <ol style="margin:0 0 18px;padding-left:20px;color:var(--text-dim);">
            <li>Tap the <b style="color:var(--text)">⋮</b> menu (top right)</li>
            <li>Tap <b style="color:var(--text)">Install app</b> / <b style="color:var(--text)">Add to Home screen</b></li>
            <li>Confirm</li>
          </ol>
          <p style="margin:0 0 12px;font-weight:800;">On Desktop (Chrome / Edge)</p>
          <p style="margin:0;color:var(--text-dim);">Click the install icon in the address bar, or use the menu → <b style="color:var(--text)">Install GymLog</b>.</p>`}
      </div>
      <div class="note-inline" style="margin-top:14px;">
        <span class="i">📴</span><span>Once installed, GymLog works fully offline — perfect for the gym basement with no signal.</span>
      </div>
    </div>
    <div class="sheet-foot"><button class="btn primary" data-act="close-modal">Got it</button></div>
  `);
}

function applyTheme(){
  const t = db.settings.theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', t);
  const meta = document.querySelector('meta[name=theme-color]');
  if (meta) meta.setAttribute('content', t === 'dark' ? '#0a0b0e' : '#f1f3f7');
}

let deferredPrompt = null;
const installBtn = $('#installBtn');

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.classList.remove('hidden');
  installBtn.textContent = 'Install';
});

installBtn.addEventListener('click', async () => {
  if (deferredPrompt){
    deferredPrompt.prompt();
    try {
      const res = await deferredPrompt.userChoice;
      if (res.outcome === 'accepted') installBtn.classList.add('hidden');
    } catch(e){}
    deferredPrompt = null;
  } else {
    openInstallHelp();
  }
});

window.addEventListener('appinstalled', () => {
  installBtn.classList.add('hidden');
  toast('GymLog installed 🎉', 2400);
});

setTimeout(() => {
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (!standalone){
    installBtn.classList.remove('hidden');
    if (!deferredPrompt) installBtn.textContent = '📲 Add to Home';
  }
}, 1500);

if ('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log('SW registered'))
      .catch(err => console.warn('SW failed:', err));
  });
}

setInterval(() => {
  if (!db.active || currentTab !== 'workout') return;
  const el = $('#sessDur');
  if (el && db.active.startedAt){
    el.innerHTML = I.clock + ' ' + fmtDur(Date.now() - db.active.startedAt);
  }
}, 30000);

load();
applyTheme();
renderAll();
switchTab('workout');

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && rest.active) tickRest();
});
window.addEventListener('beforeunload', () => { if (db.active) saveNow(); });
window.addEventListener('pagehide',     () => { if (db.active) saveNow(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('#modal').classList.contains('hidden')) closeModal();
});

console.log('%cGymLog Pro','background:#c8f751;color:#0d1400;padding:3px 8px;border-radius:4px;font-weight:800;','ready ·', allExercises().length, 'exercises');

})();