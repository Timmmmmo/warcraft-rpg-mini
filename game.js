/**
 * 魔兽RPG - 无尽塔防 V2.0
 * 参考魔兽争霸3 RPG地图"刷不完的怪"
 * 军师+丞相联合出品
 */

// ====== 配置 ======
const C = {
  W: 400, H: 650,
  MAX_ENEMIES: 150,
  WAVE_CD: 28
};

// ====== 状态 ======
let canvas, ctx;
let state = 'playing';
let gold = 0, wave = 1, waveT = 5, kills = 0;
let shake = 0;
let lastT = 0;

// ====== 塔位 (5个: 左上、右上、左下、右下、中心) ======
const TOWERS = [
  { x: 60, y: 120, name: '左上', lv: 1 },
  { x: 340, y: 120, name: '右上', lv: 1 },
  { x: 60, y: 530, name: '左下', lv: 1 },
  { x: 340, y: 530, name: '右下', lv: 1 },
  { x: 200, y: 325, name: '中心', lv: 1 }
];

// ====== 路线 (内环+外环) ======
const PATHS = {
  inner: [ // 内环 - 矩形
    {x:100,y:180}, {x:300,y:180}, {x:300,y:470}, {x:100,y:470}, {x:100,y:180}
  ],
  outer: [ // 外环 - 矩形
    {x:30,y:60}, {x:370,y:60}, {x:370,y:590}, {x:30,y:590}, {x:30,y:60}
  ]
};

// ====== 职业 ======
const CLS = {
  warrior: { name:'战士', icon:'⚔️', color:'#4a90d9', range:90, type:'melee' },
  archer: { name:'弓手', icon:'🏹', color:'#4caf50', range:160, type:'ranged' },
  mage: { name:'法师', icon:'🔮', color:'#9c27b0', range:130, type:'magic' },
  // 一转
  blademaster: { name:'剑圣', icon:'⚔️', color:'#66ccff', range:100, type:'melee', parent:'warrior' },
  mountainking: { name:'山丘', icon:'🛡️', color:'#ffd700', range:85, type:'tank', parent:'warrior' },
  bloodmage: { name:'血法', icon:'🔥', color:'#ff4444', range:120, type:'magic', parent:'warrior' },
  windrunner: { name:'风行', icon:'💨', color:'#00e676', range:180, type:'ranged', parent:'archer' },
  shadowhunter: { name:'暗猎', icon:'🌑', color:'#9c27b0', range:150, type:'assassin', parent:'archer' },
  keeper: { name:'守护', icon:'🌿', color:'#795548', range:140, type:'summon', parent:'archer' },
  // 二转
  swordgod: { name:'剑神', icon:'⚡', color:'#00bcd4', range:110, type:'melee', tier:2 },
  titan: { name:'泰坦', icon:'🏔️', color:'#ffc107', range:95, type:'tank', tier:2 },
  inferno: { name:'炎魔', icon:'🌋', color:'#ff5722', range:130, type:'magic', tier:2 }
};

// ====== 英雄 ======
let hero = {
  cls: 'warrior',
  towerIdx: 4, // 中心
  lv: 1, exp: 0, expNeed: 100,
  hp: 120, maxHp: 120,
  mp: 60, maxMp: 60,
  atk: 18, def: 6,
  atkSpd: 0.7, atkTimer: 0,
  crit: 0.1, critDmg: 2.0,
  promo: 0, // 转职次数
  buff: 1.0,
  skills: [
    { name:'攻击', cd:0, maxCd:0.4, dmg:1.0, ic:'⚔️' },
    { name:'旋风', cd:0, maxCd:4, dmg:2.2, ic:'🌀', aoe:100 },
    { name:'治疗', cd:0, maxCd:8, heal:35, ic:'💚' },
    { name:'大招', cd:0, maxCd:18, dmg:5.0, ic:'⚡', aoe:250 }
  ]
};

function heroPos() { return TOWERS[hero.towerIdx]; }

// ====== 数组 ======
let enemies = [], particles = [];

// ====== 敌人类 ======
class Enemy {
  constructor(path, type, boss) {
    this.path = path === 'inner' ? PATHS.inner : PATHS.outer;
    this.wp = 0;
    this.x = this.path[0].x + (Math.random()-0.5)*20;
    this.y = this.path[0].y + (Math.random()-0.5)*20;
    this.boss = boss;
    this.type = type;
    
    const wm = 1 + wave * 0.13;
    if (boss) {
      this.hp = (400 + wave*120) * wm;
      this.atk = 25 + wave*4;
      this.def = 12 + wave*2;
      this.spd = 0.6;
      this.exp = 120 + wave*30;
      this.sz = 28;
      this.col = '#ffd600';
    } else if (type === 'fast') {
      this.hp = (35 + wave*10) * wm;
      this.atk = 6 + wave*2;
      this.def = 2 + wave*0.5;
      this.spd = path === 'inner' ? 2.5 : 1.8;
      this.exp = 15 + wave*5;
      this.sz = 12;
      this.col = '#00bcd4';
    } else {
      this.hp = (60 + wave*15) * wm;
      this.atk = 8 + wave*2.5;
      this.def = 4 + wave;
      this.spd = path === 'inner' ? 1.6 : 1.0;
      this.exp = 25 + wave*8;
      this.sz = 16;
      this.col = '#66bb6a';
    }
    this.maxHp = this.hp;
  }
  
  update() {
    if (this.wp >= this.path.length) return false;
    const t = this.path[this.wp];
    const dx = t.x - this.x, dy = t.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d < this.spd + 2) {
      this.wp++;
      if (this.wp >= this.path.length) return false;
    } else {
      this.x += dx/d * this.spd;
      this.y += dy/d * this.spd;
    }
    return true;
  }
  
  draw() {
    // 影子
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + this.sz*.7, this.sz*.8, this.sz*.2, 0, 0, Math.PI*2);
    ctx.fill();
    
    // 身体
    const g = ctx.createRadialGradient(this.x-3, this.y-3, 2, this.x, this.y, this.sz);
    g.addColorStop(0, lighten(this.col, 30));
    g.addColorStop(.6, this.col);
    g.addColorStop(1, shade(this.col, -30));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.sz, 0, Math.PI*2);
    ctx.fill();
    
    // 眼睛
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x-this.sz*.3, this.y-this.sz*.15, this.sz*.18, 0, Math.PI*2);
    ctx.arc(this.x+this.sz*.3, this.y-this.sz*.15, this.sz*.18, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(this.x-this.sz*.3, this.y-this.sz*.15, this.sz*.08, 0, Math.PI*2);
    ctx.arc(this.x+this.sz*.3, this.y-this.sz*.15, this.sz*.08, 0, Math.PI*2);
    ctx.fill();
    
    // Boss特效
    if (this.boss) {
      ctx.save();
      ctx.globalAlpha = .3 + Math.sin(Date.now()/150)*.2;
      ctx.strokeStyle = '#f00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.sz+6, 0, Math.PI*2);
      ctx.stroke();
      ctx.restore();
    }
    
    // 血条
    const bw = this.sz*2;
    ctx.fillStyle = '#222';
    ctx.fillRect(this.x-bw/2, this.y-this.sz-8, bw, 4);
    ctx.fillStyle = this.hp/this.maxHp > .5 ? '#4caf50' : '#f44336';
    ctx.fillRect(this.x-bw/2, this.y-this.sz-8, bw*(this.hp/this.maxHp), 4);
  }
}

// ====== 粒子 ======
class Part {
  constructor(x,y,txt,col,sz) {
    this.x=x; this.y=y; this.txt=txt; this.col=col; this.sz=sz||14;
    this.vy=-2; this.vx=(Math.random()-.5)*2; this.a=1;
  }
  update() { this.x+=this.vx; this.y+=this.vy; this.vy+=.08; this.a-=.028; return this.a>0; }
  draw() {
    ctx.save(); ctx.globalAlpha=this.a;
    ctx.font=`bold ${this.sz}px Arial`; ctx.textAlign='center';
    ctx.strokeStyle='#000'; ctx.lineWidth=3;
    ctx.strokeText(this.txt,this.x,this.y);
    ctx.fillStyle=this.col;
    ctx.fillText(this.txt,this.x,this.y);
    ctx.restore();
  }
}
function addP(x,y,t,c,s) { particles.push(new Part(x,y,t,c,s)); }

// ====== 工具 ======
function shade(c,p) { const n=parseInt(c.slice(1),16); const a=Math.round(2.55*p); return '#'+(0x1000000+Math.max(0,Math.min(255,(n>>16)+a))*0x10000+Math.max(0,Math.min(255,((n>>8)&0xff)+a))*0x100+Math.max(0,Math.min(255,(n&0xff)+a))).toString(16).slice(1); }
function lighten(c,p) { return shade(c, p); }

// ====== 自动攻击 ======
function autoAtk() {
  hero.atkTimer += .016;
  if (hero.atkTimer < hero.atkSpd) return;
  hero.atkTimer = 0;
  
  const p = heroPos();
  const range = CLS[hero.cls].range + (hero.towerIdx === 4 ? 20 : 0); // 中心加范围
  let target = null, md = Infinity;
  
  for (const e of enemies) {
    const d = Math.hypot(e.x-p.x, e.y-p.y);
    if (d < range && d < md) { md = d; target = e; }
  }
  
  if (target) {
    let dmg = Math.max(1, Math.floor(hero.atk * hero.buff - target.def));
    // 暴击
    if (Math.random() < hero.crit) {
      dmg = Math.floor(dmg * hero.critDmg);
      addP(target.x, target.y-15, dmg+'!', '#ffd700', 16);
    } else {
      addP(target.x, target.y-15, '-'+dmg, CLS[hero.cls].color, 12);
    }
    target.hp -= dmg;
  }
}

// ====== 技能释放 ======
function useSkill(idx) {
  const sk = hero.skills[idx];
  const costs = [5, 12, 8, 25];
  if (sk.cd > 0 || hero.mp < costs[idx]) return;
  
  sk.cd = sk.maxCd;
  hero.mp -= costs[idx];
  const p = heroPos();
  
  if (idx === 0) {
    // Q: 单体
    let t = null, md = Infinity;
    for (const e of enemies) { const d = Math.hypot(e.x-p.x, e.y-p.y); if (d < CLS[hero.cls].range*1.5 && d < md) { md = d; t = e; } }
    if (t) { const dmg = Math.max(1, Math.floor(hero.atk*1.5*hero.buff - t.def)); t.hp -= dmg; addP(t.x, t.y-15, '-'+dmg, '#ff6f00', 14); }
  } else if (idx === 1) {
    // W: AOE
    for (const e of enemies) {
      if (Math.hypot(e.x-p.x, e.y-p.y) < sk.aoe) {
        const dmg = Math.max(1, Math.floor(hero.atk*sk.dmg*hero.buff - e.def));
        e.hp -= dmg; addP(e.x, e.y-15, '-'+dmg, '#4fc3f7', 13);
      }
    }
    shake = 5;
  } else if (idx === 2) {
    // E: 治疗
    hero.hp = Math.min(hero.maxHp, hero.hp + sk.heal);
    addP(p.x, p.y-25, '+'+sk.heal, '#4caf50', 14);
  } else if (idx === 3) {
    // R: 大招
    for (const e of enemies) {
      const dmg = Math.max(1, Math.floor(hero.atk*sk.dmg*hero.buff - e.def));
      e.hp -= dmg; addP(e.x, e.y-15, '-'+dmg, '#ffd700', 15);
    }
    shake = 10;
    addP(p.x, p.y-40, '大招!', '#ffd700', 22);
  }
  updateSkUI();
}

// ====== 经验升级 ======
function gainExp(amt) {
  hero.exp += amt;
  while (hero.exp >= hero.expNeed) {
    hero.exp -= hero.expNeed;
    levelUp();
  }
}

function levelUp() {
  hero.lv++;
  hero.expNeed = Math.floor(100 * Math.pow(hero.lv, 1.2));
  hero.maxHp += 22; hero.hp = hero.maxHp;
  hero.maxMp += 10; hero.mp = hero.maxMp;
  hero.atk += 3; hero.def += 1;
  const p = heroPos();
  addP(p.x, p.y-35, 'LEVEL UP!', '#ffd700', 18);
  showToast('Level ' + hero.lv);
  
  // 转职检查
  if (hero.lv === 10 && hero.promo === 0) showPromo();
  if (hero.lv === 25 && hero.promo === 1) showPromo();
}

// ====== 转职系统 ======
function showPromo() {
  state = 'paused';
  const modal = document.getElementById('promo-modal');
  const cards = document.getElementById('promo-cards');
  cards.innerHTML = '';
  
  // 自动转职
  const auto = document.createElement('div');
  auto.className = 'promo-card auto';
  auto.innerHTML = '<div class="icon">🎲</div><div class="name">自动转职</div><div class="bonus">+20% 全属性</div><div class="desc">随机职业<br>可能有惊喜!</div>';
  auto.onclick = () => doPromo(true);
  cards.appendChild(auto);
  
  // 手动选项
  const options = getOptions();
  for (const o of options) {
    const card = document.createElement('div');
    card.className = 'promo-card';
    card.style.borderColor = o.color;
    card.innerHTML = `<div class="icon">${o.icon}</div><div class="name">${o.name}</div><div class="bonus">+10% 全属性</div><div class="desc">${o.desc}</div>`;
    card.onclick = () => doPromo(false, o.key);
    cards.appendChild(card);
  }
  
  modal.classList.add('show');
}

function getOptions() {
  const base = hero.cls;
  const opts = [];
  if (hero.promo === 0) {
    if (base === 'warrior' || base === 'blademaster' || base === 'mountainking' || base === 'bloodmage') {
      opts.push({ key:'blademaster', ...CLS.blademaster, desc:'高攻速近战' });
      opts.push({ key:'mountainking', ...CLS.mountainking, desc:'高防坦克' });
      opts.push({ key:'bloodmage', ...CLS.bloodmage, desc:'法术伤害' });
    } else {
      opts.push({ key:'windrunner', ...CLS.windrunner, desc:'远程输出' });
      opts.push({ key:'shadowhunter', ...CLS.shadowhunter, desc:'高暴击' });
      opts.push({ key:'keeper', ...CLS.keeper, desc:'召唤辅助' });
    }
  } else {
    opts.push({ key:'swordgod', ...CLS.swordgod, desc:'终极剑士' });
    opts.push({ key:'titan', ...CLS.titan, desc:'终极坦克' });
    opts.push({ key:'inferno', ...CLS.inferno, desc:'终极法师' });
  }
  return opts;
}

function doPromo(auto, clsKey) {
  const bonus = auto ? 1.2 : 1.1;
  if (auto) {
    const options = getOptions();
    const r = options[Math.floor(Math.random()*options.length)];
    clsKey = r.key;
  }
  
  hero.cls = clsKey;
  hero.buff *= bonus;
  hero.atk = Math.floor(hero.atk * bonus);
  hero.def = Math.floor(hero.def * bonus);
  hero.maxHp = Math.floor(hero.maxHp * bonus);
  hero.hp = hero.maxHp;
  hero.maxMp = Math.floor(hero.maxMp * bonus);
  hero.mp = hero.maxMp;
  hero.promo++;
  
  // 更新技能
  updateSkills();
  
  document.getElementById('promo-modal').classList.remove('show');
  state = 'playing';
  
  const p = heroPos();
  addP(p.x, p.y-40, '转职:' + CLS[clsKey].name, '#ffd700', 22);
  showToast('转职成功!');
}

function updateSkills() {
  const cls = hero.cls;
  if (cls.includes('blade') || cls === 'swordgod') {
    hero.skills[1] = { name:'剑气', cd:0, maxCd:3, dmg:2.8, ic:'💫', aoe:90 };
    hero.skills[3] = { name:'剑刃风暴', cd:0, maxCd:15, dmg:6.0, ic:'🌪️', aoe:200 };
  } else if (cls.includes('mountain') || cls === 'titan') {
    hero.skills[1] = { name:'雷霆', cd:0, maxCd:4, dmg:2.0, ic:'⚡', aoe:110 };
    hero.skills[3] = { name:'天神下凡', cd:0, maxCd:20, dmg:4.0, ic:'🏔️', aoe:180 };
  } else if (cls.includes('blood') || cls === 'inferno') {
    hero.skills[0] = { name:'火球', cd:0, maxCd:0.5, dmg:1.3, ic:'🔥' };
    hero.skills[1] = { name:'烈焰', cd:0, maxCd:4, dmg:2.5, ic:'🔥', aoe:100 };
    hero.skills[3] = { name:'烈焰风暴', cd:0, maxCd:16, dmg:5.5, ic:'🌋', aoe:220 };
  } else if (cls.includes('wind')) {
    hero.skills[1] = { name:'穿透箭', cd:0, maxCd:3, dmg:2.5, ic:'🎯', aoe:120 };
    hero.skills[3] = { name:'箭雨', cd:0, maxCd:16, dmg:5.5, ic:'🌧️', aoe:250 };
  } else if (cls.includes('shadow')) {
    hero.crit = 0.25;
    hero.skills[1] = { name:'毒刃', cd:0, maxCd:3, dmg:3.0, ic:'🗡️', aoe:80 };
    hero.skills[3] = { name:'暗影突袭', cd:0, maxCd:14, dmg:7.0, ic:'🌑', aoe:180 };
  }
}

// ====== 波次生成 ======
function spawnWave() {
  const count = 6 + Math.floor(wave * 1.5);
  const boss = wave % 5 === 0;
  
  const ann = document.getElementById('wave-ann');
  if (boss) {
    ann.className = 'wave-announce boss';
    ann.innerHTML = '⚠️ BOSS WAVE ⚠️<br><span style="font-size:16px">强大的敌人!</span>';
  } else {
    ann.className = 'wave-announce';
    ann.innerHTML = `WAVE ${wave}<br><span style="font-size:16px">${count} 敌人来袭</span>`;
  }
  ann.style.display = 'block';
  setTimeout(() => ann.style.display = 'none', 2000);
  
  let n = 0;
  const iv = setInterval(() => {
    if (n >= count || state === 'gameover') { clearInterval(iv); return; }
    
    const path = Math.random() < 0.5 ? 'inner' : 'outer';
    const type = wave > 3 && Math.random() < 0.3 ? 'fast' : 'normal';
    
    if (boss && n === 0) {
      enemies.push(new Enemy('outer', 'normal', true));
    } else {
      enemies.push(new Enemy(path, type, false));
    }
    n++;
  }, 500);
}

// ====== 失败检查 ======
function checkEnd() {
  if (enemies.length >= C.MAX_ENEMIES) { gameOver('敌人超过' + C.MAX_ENEMIES + '个!'); return; }
  if (hero.hp <= 0) gameOver('英雄阵亡!');
}

function gameOver(reason) {
  state = 'gameover';
  document.getElementById('go-wave').textContent = wave;
  document.getElementById('go-kills').textContent = kills;
  document.getElementById('go-reason').textContent = reason;
  document.getElementById('gameover').classList.add('show');
}

// ====== Toast ======
function showToast(txt) {
  const t = document.getElementById('toast');
  t.textContent = txt;
  t.style.display = 'block';
  setTimeout(() => t.style.display = 'none', 1500);
}

// ====== UI更新 ======
function updateUI() {
  document.getElementById('lv').textContent = hero.lv;
  document.getElementById('side-lv').textContent = hero.lv;
  document.getElementById('gold').textContent = gold;
  document.getElementById('wave').textContent = wave;
  document.getElementById('kills').textContent = kills;
  document.getElementById('enemies').textContent = enemies.length;
  
  const ec = document.getElementById('enemies');
  ec.style.color = enemies.length > 120 ? '#f44336' : enemies.length > 80 ? '#ff9800' : '#ffd700';
  
  document.getElementById('class-icon').textContent = CLS[hero.cls].icon;
  document.getElementById('class-name').textContent = CLS[hero.cls].name;
  document.getElementById('hp-bar').style.width = (hero.hp/hero.maxHp*100)+'%';
  document.getElementById('mp-bar').style.width = (hero.mp/hero.maxMp*100)+'%';
  document.getElementById('exp-bar').style.width = (hero.exp/hero.expNeed*100)+'%';
  
  updateSkUI();
}

function updateSkUI() {
  const costs = [5, 12, 8, 25];
  for (let i = 0; i < 4; i++) {
    const btn = document.querySelector(`[data-skill="${i}"]`);
    const sk = hero.skills[i];
    btn.querySelector('.ic').textContent = sk.ic;
    btn.querySelector('.nm').textContent = sk.name;
    
    const old = btn.querySelector('.cd');
    if (old) old.remove();
    
    if (sk.cd > 0) {
      btn.classList.add('off'); btn.classList.remove('on');
      const d = document.createElement('div'); d.className = 'cd'; d.textContent = Math.ceil(sk.cd); btn.appendChild(d);
    } else if (hero.mp < costs[i]) {
      btn.classList.add('off'); btn.classList.remove('on');
    } else {
      btn.classList.remove('off'); btn.classList.add('on');
    }
  }
}

// ====== 绘制 ======
function drawMap() {
  // 背景
  const bg = ctx.createLinearGradient(0, 0, 0, C.H);
  bg.addColorStop(0, '#1a2a1a'); bg.addColorStop(1, '#0d1b0d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, C.W, C.H);
  
  // 草地
  ctx.fillStyle = 'rgba(34,139,34,.06)';
  for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.arc((i*67)%C.W, (i*89)%C.H, 10+i%12, 0, Math.PI*2); ctx.fill(); }
  
  // 外环路线
  drawPath(PATHS.outer, 'rgba(100,70,40,.4)', 36);
  drawPath(PATHS.outer, 'rgba(139,90,43,.5)', 30);
  
  // 内环路线
  drawPath(PATHS.inner, 'rgba(80,80,120,.3)', 30);
  drawPath(PATHS.inner, 'rgba(100,100,150,.4)', 24);
  
  // 路线标签
  ctx.fillStyle = 'rgba(255,255,255,.3)';
  ctx.font = '10px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('外环', 30, 50);
  ctx.fillText('内环', 100, 165);
  
  // 塔位
  for (let i = 0; i < 5; i++) {
    const t = TOWERS[i];
    const active = hero.towerIdx === i;
    
    // 光晕
    if (active) {
      ctx.fillStyle = 'rgba(74,144,217,.15)';
      ctx.beginPath(); ctx.arc(t.x, t.y, 35, 0, Math.PI*2); ctx.fill();
    }
    
    // 圆环
    ctx.strokeStyle = active ? '#ffd700' : 'rgba(100,100,100,.5)';
    ctx.lineWidth = active ? 3 : 2;
    ctx.beginPath(); ctx.arc(t.x, t.y, 26, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = active ? 'rgba(74,144,217,.2)' : 'rgba(50,50,50,.3)';
    ctx.fill();
    
    // 塔位名
    if (!active) {
      ctx.fillStyle = 'rgba(255,255,255,.3)';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(t.name, t.x, t.y + 38);
    }
    
    // 等级
    if (t.lv > 1) {
      ctx.fillStyle = '#ffd700';
      ctx.font = '9px Arial';
      ctx.fillText('★'.repeat(t.lv-1), t.x, t.y + 48);
    }
  }
}

function drawPath(path, col, w) {
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
  ctx.closePath();
  ctx.stroke();
}

function drawHero() {
  const p = heroPos();
  const cls = CLS[hero.cls];
  
  // 攻击范围
  ctx.strokeStyle = 'rgba(255,255,255,.08)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(p.x, p.y, cls.range, 0, Math.PI*2); ctx.stroke();
  
  // 身体
  const g = ctx.createRadialGradient(p.x-5, p.y-5, 2, p.x, p.y, 24);
  g.addColorStop(0, '#fff'); g.addColorStop(.3, cls.color); g.addColorStop(1, shade(cls.color, -40));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(p.x, p.y, 22, 0, Math.PI*2); ctx.fill();
  
  // 发光边框
  ctx.shadowColor = cls.color; ctx.shadowBlur = 12;
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
  ctx.stroke(); ctx.shadowBlur = 0;
  
  // 图标
  ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff'; ctx.fillText(cls.icon, p.x, p.y);
  
  // 名字
  ctx.font = 'bold 10px Arial'; ctx.fillStyle = cls.color;
  ctx.fillText(cls.name, p.x, p.y + 34);
  
  // 血蓝条
  const bw = 44;
  ctx.fillStyle = '#333'; ctx.fillRect(p.x-bw/2, p.y-32, bw, 5);
  ctx.fillStyle = hero.hp > hero.maxHp*.5 ? '#4caf50' : '#f44336';
  ctx.fillRect(p.x-bw/2, p.y-32, bw*(hero.hp/hero.maxHp), 5);
  
  ctx.fillStyle = '#222'; ctx.fillRect(p.x-bw/2, p.y-26, bw, 3);
  ctx.fillStyle = '#2196f3'; ctx.fillRect(p.x-bw/2, p.y-26, bw*(hero.mp/hero.maxMp), 3);
}

// ====== 主循环 ======
function update() {
  if (state !== 'playing') return;
  
  // 英雄
  if (hero.hp > 0) autoAtk();
  if (hero.mp < hero.maxMp) hero.mp += .05;
  for (const s of hero.skills) if (s.cd > 0) s.cd -= .016;
  
  // 敌人
  for (let i = enemies.length-1; i >= 0; i--) {
    if (!enemies[i].update()) {
      // 到达终点
      enemies.splice(i, 1);
    } else if (enemies[i].hp <= 0) {
      kills++;
      gold += enemies[i].boss ? 50 : (8 + Math.floor(wave/3));
      gainExp(enemies[i].exp);
      addP(enemies[i].x, enemies[i].y, '+' + enemies[i].exp + 'EXP', '#4fc3f7', 11);
      enemies.splice(i, 1);
    }
  }
  
  // 粒子
  for (let i = particles.length-1; i >= 0; i--) if (!particles[i].update()) particles.splice(i, 1);
  
  // 波次
  waveT -= .016;
  if (waveT <= 0) { wave++; waveT = C.WAVE_CD + wave*1.2; spawnWave(); }
  
  if (shake > 0) shake *= .85;
  if (shake < .5) shake = 0;
  
  checkEnd();
  updateUI();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  if (shake > 0) ctx.translate((Math.random()-.5)*shake, (Math.random()-.5)*shake);
  
  drawMap();
  for (const e of enemies) e.draw();
  drawHero();
  for (const p of particles) p.draw();
  
  ctx.restore();
}

function loop(t) {
  update(); draw();
  requestAnimationFrame(loop);
}

// ====== 初始化 ======
function init() {
  canvas = document.getElementById('game');
  ctx = canvas.getContext('2d');
  canvas.width = C.W; canvas.height = C.H;
  
  requestAnimationFrame(loop);
  setupEvents();
}

function setupEvents() {
  // 技能
  document.querySelectorAll('.sk').forEach(b => {
    const fn = e => { e.preventDefault(); if (state==='playing') useSkill(+b.dataset.skill); };
    b.addEventListener('touchstart', fn);
    b.addEventListener('click', fn);
  });
  
  // 移动按钮
  document.getElementById('btn-tower').addEventListener('click', () => {
    document.getElementById('tower-modal').classList.add('show');
    state = 'paused';
  });
  
  // 塔位选择
  document.querySelectorAll('.tower-btn[data-tower]').forEach(b => {
    b.addEventListener('click', () => {
      hero.towerIdx = +b.dataset.tower;
      document.querySelectorAll('.tower-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      document.getElementById('tower-modal').classList.remove('show');
      state = 'playing';
      addP(heroPos().x, heroPos().y-30, '移动!', '#fff', 14);
    });
  });
  
  // 升级按钮
  document.getElementById('btn-upgrade').addEventListener('click', () => {
    const t = TOWERS[hero.towerIdx];
    const costs = [80, 200, 500, 1000];
    const cost = costs[t.lv-1];
    if (cost && gold >= cost && t.lv < 5) {
      gold -= cost; t.lv++;
      hero.atk = Math.floor(hero.atk * 1.15);
      addP(t.x, t.y-40, '塔位升级!', '#ffd700', 16);
      showToast('塔位Lv.' + t.lv);
    }
  });
}

window.onload = init;
