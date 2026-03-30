/**
 * 魔兽RPG - 无尽塔防 V2.2
 * 攻击范围300% + 美术升级 + 副本系统 + 敌人循环
 */

const C = { W: 400, H: 650, MAX_ENEMIES: 150, WAVE_CD: 25 };

let canvas, ctx;
let state = 'playing';
let gold = 0, wave = 1, waveT = 5, kills = 0, shake = 0;

// 塔位
const TOWERS = [
  { x: 60, y: 120, name: '左上', lv: 1 },
  { x: 340, y: 120, name: '右上', lv: 1 },
  { x: 60, y: 530, name: '左下', lv: 1 },
  { x: 340, y: 530, name: '右下', lv: 1 },
  { x: 200, y: 325, name: '中心', lv: 1 }
];

// 路线 (闭合循环)
const PATHS = {
  inner: [{x:100,y:180},{x:300,y:180},{x:300,y:470},{x:100,y:470},{x:100,y:180}],
  outer: [{x:30,y:60},{x:370,y:60},{x:370,y:590},{x:30,y:590},{x:30,y:60}]
};

// 职业 (攻击范围x3)
const CLS = {
  warrior: { name:'战士', icon:'⚔️', color:'#4a90d9', range:270, type:'melee' },
  archer: { name:'弓手', icon:'🏹', color:'#4caf50', range:480, type:'ranged' },
  mage: { name:'法师', icon:'🔮', color:'#9c27b0', range:390, type:'magic' },
  blademaster: { name:'剑圣', icon:'⚔️', color:'#66ccff', range:300 },
  mountainking: { name:'山丘', icon:'🛡️', color:'#ffd700', range:255 },
  bloodmage: { name:'血法', icon:'🔥', color:'#ff4444', range:360 },
  windrunner: { name:'风行', icon:'💨', color:'#00e676', range:540 },
  shadowhunter: { name:'暗猎', icon:'🌑', color:'#9c27b0', range:450 },
  keeper: { name:'守护', icon:'🌿', color:'#795548', range:420 },
  swordgod: { name:'剑神', icon:'⚡', color:'#00bcd4', range:330 },
  titan: { name:'泰坦', icon:'🏔️', color:'#ffc107', range:285 },
  inferno: { name:'炎魔', icon:'🌋', color:'#ff5722', range:390 }
};

// 副本系统
const DUNGEONS = [
  { name:'金币副本I', icon:'💰', cost:0, hp:100, reward:100, desc:'击败金币怪获得100金', unlock:1 },
  { name:'金币副本II', icon:'💰💰', cost:50, hp:300, reward:300, desc:'击败金币怪获得300金', unlock:5 },
  { name:'经验副本', icon:'⭐', cost:100, hp:500, reward:0, expReward:500, desc:'击败经验怪获得500经验', unlock:8 },
  { name:'Boss挑战', icon:'👹', cost:200, hp:1500, reward:800, desc:'击败超级Boss获得800金', unlock:12 }
];

let dungeonActive = null;
let dungeonEnemy = null;

// 英雄
let hero = {
  cls: 'warrior', towerIdx: 4, lv: 1, exp: 0, expNeed: 100,
  hp: 150, maxHp: 150, mp: 80, maxMp: 80,
  atk: 22, def: 8, atkSpd: 0.6, atkTimer: 0,
  crit: 0.12, critDmg: 2.0, promo: 0, buff: 1.0,
  skills: [
    { name:'攻击', cd:0, maxCd:0.35, dmg:1.0, ic:'⚔️', type:'basic' },
    { name:'小必杀', cd:0, maxCd:4, dmg:2.8, ic:'💫', aoe:120, type:'small' },
    { name:'治疗', cd:0, maxCd:7, heal:45, ic:'💚', type:'heal' },
    { name:'大必杀', cd:0, maxCd:18, dmg:6.5, ic:'⚡', aoe:300, type:'big' }
  ]
};

function hPos() { return TOWERS[hero.towerIdx]; }

let enemies = [], particles = [];

// 敌人 - 循环路线
class Enemy {
  constructor(path, type, boss) {
    this.pathKey = path;
    this.path = path === 'inner' ? PATHS.inner : PATHS.outer;
    this.wp = 0;
    this.x = this.path[0].x + (Math.random()-.5)*20;
    this.y = this.path[0].y + (Math.random()-.5)*20;
    this.boss = boss; this.type = type;
    this.loops = 0; // 循环次数
    
    const wm = 1 + wave * 0.12;
    if (boss) {
      this.hp = (500+wave*150)*wm; this.atk = 30+wave*5; this.def = 15+wave*2;
      this.spd = 0.8; this.exp = 150+wave*35; this.sz = 30; this.col = '#ffd600';
      this.name = 'BOSS';
    } else if (type === 'fast') {
      this.hp = (40+wave*12)*wm; this.atk = 8+wave*2; this.def = 3+wave*.5;
      this.spd = path==='inner'?2.8:2.0; this.exp = 18+wave*6; this.sz = 13; this.col = '#00bcd4';
      this.name = '快怪';
    } else if (type === 'elite') {
      this.hp = (120+wave*30)*wm; this.atk = 15+wave*3; this.def = 8+wave;
      this.spd = 1.2; this.exp = 50+wave*15; this.sz = 22; this.col = '#e040fb';
      this.name = '精英';
    } else {
      this.hp = (70+wave*18)*wm; this.atk = 10+wave*3; this.def = 5+wave;
      this.spd = path==='inner'?1.8:1.1; this.exp = 30+wave*10; this.sz = 17; this.col = '#66bb6a';
      this.name = '小怪';
    }
    this.maxHp = this.hp;
  }
  
  update() {
    const t = this.path[this.wp];
    const dx = t.x - this.x, dy = t.y - this.y;
    const d = Math.hypot(dx, dy);
    
    if (d < this.spd + 2) {
      this.wp++;
      if (this.wp >= this.path.length) {
        this.wp = 0; // 循环回到起点
        this.loops++;
      }
    } else {
      this.x += dx/d * this.spd;
      this.y += dy/d * this.spd;
    }
    return true; // 永不消失
  }
  
  draw() {
    // 影子
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + this.sz*.8, this.sz*.9, this.sz*.22, 0, 0, Math.PI*2);
    ctx.fill();
    
    // 身体渐变
    const g = ctx.createRadialGradient(this.x - this.sz*.2, this.y - this.sz*.2, this.sz*.1, this.x, this.y, this.sz);
    g.addColorStop(0, lighten(this.col, 40));
    g.addColorStop(.5, this.col);
    g.addColorStop(1, shade(this.col, -40));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.sz, 0, Math.PI*2);
    ctx.fill();
    
    // 边框
    ctx.strokeStyle = shade(this.col, -50);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // 高光
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.beginPath();
    ctx.arc(this.x - this.sz*.3, this.y - this.sz*.3, this.sz*.3, 0, Math.PI*2);
    ctx.fill();
    
    // 眼睛 - 更精细
    const eyeY = this.y - this.sz*.1;
    const eyeX = this.sz*.3;
    const eyeR = this.sz*.2;
    const pupilR = this.sz*.1;
    
    // 眼白
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(this.x - eyeX, eyeY, eyeR, eyeR*1.2, 0, 0, Math.PI*2);
    ctx.ellipse(this.x + eyeX, eyeY, eyeR, eyeR*1.2, 0, 0, Math.PI*2);
    ctx.fill();
    
    // 瞳孔
    ctx.fillStyle = this.boss ? '#ff0000' : '#111';
    ctx.beginPath();
    ctx.arc(this.x - eyeX, eyeY, pupilR, 0, Math.PI*2);
    ctx.arc(this.x + eyeX, eyeY, pupilR, 0, Math.PI*2);
    ctx.fill();
    
    // 瞳孔高光
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x - eyeX + pupilR*.3, eyeY - pupilR*.3, pupilR*.4, 0, Math.PI*2);
    ctx.arc(this.x + eyeX + pupilR*.3, eyeY - pupilR*.3, pupilR*.4, 0, Math.PI*2);
    ctx.fill();
    
    // 嘴巴
    ctx.strokeStyle = shade(this.col, -60);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(this.x, this.y + this.sz*.2, this.sz*.25, 0.1*Math.PI, 0.9*Math.PI);
    ctx.stroke();
    
    // Boss特效
    if (this.boss) {
      ctx.save();
      ctx.globalAlpha = .3 + Math.sin(Date.now()/150)*.2;
      ctx.strokeStyle = '#f00'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.sz+8, 0, Math.PI*2); ctx.stroke();
      ctx.restore();
      
      // Boss角
      ctx.fillStyle = '#ffd600';
      ctx.beginPath();
      ctx.moveTo(this.x - this.sz*.5, this.y - this.sz*.8);
      ctx.lineTo(this.x - this.sz*.3, this.y - this.sz*1.3);
      ctx.lineTo(this.x - this.sz*.1, this.y - this.sz*.7);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(this.x + this.sz*.5, this.y - this.sz*.8);
      ctx.lineTo(this.x + this.sz*.3, this.y - this.sz*1.3);
      ctx.lineTo(this.x + this.sz*.1, this.y - this.sz*.7);
      ctx.fill();
    }
    
    // 精英怪光环
    if (this.type === 'elite') {
      ctx.save();
      ctx.globalAlpha = .2 + Math.sin(Date.now()/200)*.1;
      ctx.strokeStyle = '#e040fb'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.sz+5, 0, Math.PI*2); ctx.stroke();
      ctx.restore();
    }
    
    // 血条
    const bw = this.sz*2.2;
    const by = this.y - this.sz - (this.boss ? 18 : 10);
    ctx.fillStyle = '#111';
    ctx.fillRect(this.x-bw/2, by, bw, 6);
    ctx.fillStyle = this.hp/this.maxHp > .5 ? '#4caf50' : this.hp/this.maxHp > .25 ? '#ff9800' : '#f44336';
    ctx.fillRect(this.x-bw/2, by, bw*(this.hp/this.maxHp), 6);
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
    ctx.strokeRect(this.x-bw/2, by, bw, 6);
    
    // 名字(精英/Boss)
    if (this.boss || this.type === 'elite') {
      ctx.fillStyle = this.boss ? '#ff4444' : '#e040fb';
      ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
      ctx.fillText(this.name, this.x, by - 4);
    }
  }
}

// 副本敌人
class DungeonEnemy {
  constructor(dungeon) {
    this.x = 200; this.y = 325;
    this.hp = dungeon.hp; this.maxHp = dungeon.hp;
    this.sz = 40; this.col = '#ffd700';
    this.dungeon = dungeon;
    this.atk = 0; this.def = 0;
  }
  update() { return true; }
  draw() {
    // 金币/星星造型
    ctx.save();
    ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 20;
    const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.sz);
    g.addColorStop(0, '#fff9c4'); g.addColorStop(.5, '#ffd700'); g.addColorStop(1, '#ff8f00');
    ctx.fillStyle = g;
    ctx.beginPath();
    // 星形
    for (let i = 0; i < 5; i++) {
      const a = (i * 72 - 90) * Math.PI / 180;
      const r = i === 0 ? this.sz : this.sz;
      ctx.lineTo(this.x + Math.cos(a) * this.sz, this.y + Math.sin(a) * this.sz);
      const a2 = ((i * 72 + 36) - 90) * Math.PI / 180;
      ctx.lineTo(this.x + Math.cos(a2) * this.sz * .5, this.y + Math.sin(a2) * this.sz * .5);
    }
    ctx.closePath(); ctx.fill();
    ctx.restore();
    
    // 图标
    ctx.font = '24px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(this.dungeon.icon.replace('💰💰','💰'), this.x, this.y);
    
    // 血条
    const bw = 60;
    ctx.fillStyle = '#222'; ctx.fillRect(this.x-bw/2, this.y-this.sz-15, bw, 8);
    ctx.fillStyle = '#ffd700'; ctx.fillRect(this.x-bw/2, this.y-this.sz-15, bw*(this.hp/this.maxHp), 8);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(this.x-bw/2, this.y-this.sz-15, bw, 8);
    
    // 名字
    ctx.fillStyle = '#ffd700'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center';
    ctx.fillText(this.dungeon.name, this.x, this.y - this.sz - 25);
  }
}

// 粒子
class Part {
  constructor(x,y,t,c,s) { this.x=x; this.y=y; this.t=t; this.c=c; this.s=s||14; this.vy=-2.5; this.vx=(Math.random()-.5)*2.5; this.a=1; }
  update() { this.x+=this.vx; this.y+=this.vy; this.vy+=.08; this.a-=.025; return this.a>0; }
  draw() {
    ctx.save(); ctx.globalAlpha=this.a;
    ctx.font=`bold ${this.s}px Arial`; ctx.textAlign='center';
    ctx.strokeStyle='#000'; ctx.lineWidth=3;
    ctx.strokeText(this.t,this.x,this.y);
    ctx.fillStyle=this.c; ctx.fillText(this.t,this.x,this.y); ctx.restore();
  }
}
function addP(x,y,t,c,s) { particles.push(new Part(x,y,t,c,s)); }

function shade(c,p) { if(!c||c[0]!=='#')return c; const n=parseInt(c.slice(1),16); const a=Math.round(2.55*p); return '#'+(0x1000000+Math.max(0,Math.min(255,(n>>16)+a))*0x10000+Math.max(0,Math.min(255,((n>>8)&0xff)+a))*0x100+Math.max(0,Math.min(255,(n&0xff)+a))).toString(16).slice(1); }
function lighten(c,p) { return shade(c, p); }

// 自动攻击
function autoAtk() {
  hero.atkTimer += .016;
  if (hero.atkTimer < hero.atkSpd) return;
  hero.atkTimer = 0;
  const p = hPos(), range = CLS[hero.cls].range + (hero.towerIdx===4?60:0);
  
  // 优先攻击副本敌人
  if (dungeonEnemy) {
    let dmg = Math.max(1, Math.floor(hero.atk*hero.buff));
    if (Math.random() < hero.crit) { dmg = Math.floor(dmg*hero.critDmg); addP(dungeonEnemy.x,dungeonEnemy.y-20,dmg+'!','#ffd700',16); }
    else addP(dungeonEnemy.x,dungeonEnemy.y-20,'-'+dmg,'#ffd700',12);
    dungeonEnemy.hp -= dmg;
    if (dungeonEnemy.hp <= 0) completeDungeon();
    return;
  }
  
  let t = null, md = Infinity;
  for (const e of enemies) { const d = Math.hypot(e.x-p.x, e.y-p.y); if (d<range && d<md) { md=d; t=e; } }
  if (t) {
    let dmg = Math.max(1, Math.floor(hero.atk*hero.buff - t.def));
    if (Math.random() < hero.crit) { dmg = Math.floor(dmg*hero.critDmg); addP(t.x,t.y-15,dmg+'!','#ffd700',16); }
    else addP(t.x,t.y-15,'-'+dmg, CLS[hero.cls].color, 12);
    t.hp -= dmg;
  }
}

// 技能
function useSkill(idx) {
  const sk = hero.skills[idx];
  const costs = [5, 15, 10, 30];
  if (sk.cd > 0 || hero.mp < costs[idx]) return;
  sk.cd = sk.maxCd; hero.mp -= costs[idx];
  const p = hPos();
  
  // 副本中技能
  if (dungeonEnemy) {
    if (sk.type === 'small' || sk.type === 'big') {
      const dmg = Math.max(1, Math.floor(hero.atk * sk.dmg * hero.buff));
      dungeonEnemy.hp -= dmg;
      addP(dungeonEnemy.x, dungeonEnemy.y-20, '-'+dmg, '#ffd700', 16);
      shake = sk.type === 'big' ? 10 : 5;
      if (dungeonEnemy.hp <= 0) completeDungeon();
    } else if (sk.type === 'heal') {
      hero.hp = Math.min(hero.maxHp, hero.hp+sk.heal);
      addP(p.x, p.y-25, '+'+sk.heal, '#4caf50', 14);
    }
    updateSkUI(); return;
  }
  
  if (sk.type === 'basic') {
    let t = null, md = Infinity;
    for (const e of enemies) { const d=Math.hypot(e.x-p.x,e.y-p.y); if (d<CLS[hero.cls].range*1.5&&d<md){md=d;t=e;} }
    if (t) { const dmg=Math.max(1,Math.floor(hero.atk*1.5*hero.buff-t.def)); t.hp-=dmg; addP(t.x,t.y-15,'-'+dmg,'#ff6f00',14); }
  } else if (sk.type === 'small') {
    for (const e of enemies) {
      if (Math.hypot(e.x-p.x, e.y-p.y) < sk.aoe) {
        const dmg = Math.max(1, Math.floor(hero.atk*sk.dmg*hero.buff - e.def));
        e.hp -= dmg; addP(e.x, e.y-15, '-'+dmg, '#4fc3f7', 13);
      }
    }
    shake = 6;
    addP(p.x, p.y-30, '小必杀!', CLS[hero.cls].color, 18);
  } else if (sk.type === 'heal') {
    hero.hp = Math.min(hero.maxHp, hero.hp+sk.heal);
    addP(p.x, p.y-25, '+'+sk.heal, '#4caf50', 14);
  } else if (sk.type === 'big') {
    for (const e of enemies) {
      const dmg = Math.max(1, Math.floor(hero.atk*sk.dmg*hero.buff - e.def));
      e.hp -= dmg; addP(e.x, e.y-15, '-'+dmg, '#ffd700', 15);
    }
    shake = 12;
    addP(p.x, p.y-40, '大必杀!', '#ffd700', 26);
    for (let i = 0; i < 12; i++) addP(Math.random()*C.W, Math.random()*C.H, '⚡', '#ffd700', 12);
  }
  updateSkUI();
}

// 副本系统
function showDungeonMenu() {
  state = 'paused';
  const modal = document.getElementById('dungeon-modal');
  const list = document.getElementById('dungeon-list');
  list.innerHTML = '';
  
  for (const d of DUNGEONS) {
    const card = document.createElement('div');
    card.className = 'dungeon-card' + (hero.lv < d.unlock ? ' locked' : '');
    card.innerHTML = `
      <div class="icon">${d.icon}</div>
      <div class="name">${d.name}</div>
      <div class="desc">${d.desc}</div>
      <div class="cost">${d.cost > 0 ? '消耗: ' + d.cost + '金' : '免费'}</div>
      ${hero.lv < d.unlock ? '<div class="unlock">需要Lv.' + d.unlock + '</div>' : ''}
    `;
    if (hero.lv >= d.unlock) {
      card.onclick = () => enterDungeon(d);
    }
    list.appendChild(card);
  }
  
  modal.classList.add('show');
}

function enterDungeon(dungeon) {
  if (gold < dungeon.cost) { showToast('金币不足!'); return; }
  gold -= dungeon.cost;
  dungeonActive = dungeon;
  dungeonEnemy = new DungeonEnemy(dungeon);
  document.getElementById('dungeon-modal').classList.remove('show');
  state = 'playing';
  showToast('进入' + dungeon.name + '!');
}

function completeDungeon() {
  const d = dungeonActive;
  if (d.reward > 0) {
    gold += d.reward;
    addP(200, 300, '+' + d.reward + '金!', '#ffd700', 22);
  }
  if (d.expReward) {
    gainExp(d.expReward);
    addP(200, 280, '+' + d.expReward + 'EXP!', '#4fc3f7', 20);
  }
  dungeonEnemy = null;
  dungeonActive = null;
  showToast('副本完成!');
}

// 经验升级
function gainExp(a) { hero.exp+=a; while(hero.exp>=hero.expNeed){hero.exp-=hero.expNeed; levelUp();} }

function levelUp() {
  hero.lv++; hero.expNeed = Math.floor(100*Math.pow(hero.lv,1.2));
  hero.maxHp+=25; hero.hp=hero.maxHp; hero.maxMp+=12; hero.mp=hero.maxMp;
  hero.atk+=4; hero.def+=2;
  const p = hPos(); addP(p.x,p.y-35,'LEVEL UP!','#ffd700',18);
  if (hero.lv===10 && hero.promo===0) showPromo();
  if (hero.lv===25 && hero.promo===1) showPromo();
}

// 转职
function showPromo() {
  state='paused';
  const modal=document.getElementById('promo-modal'), cards=document.getElementById('promo-cards');
  cards.innerHTML='';
  const auto=document.createElement('div');
  auto.className='promo-card auto';
  auto.innerHTML='<div class="icon">🎲</div><div class="name">自动转职</div><div class="bonus">+20% 全属性</div><div class="desc">随机职业<br>可能有惊喜!</div>';
  auto.onclick=()=>doPromo(true); cards.appendChild(auto);
  for (const o of getOptions()) {
    const c=document.createElement('div'); c.className='promo-card'; c.style.borderColor=o.color;
    c.innerHTML=`<div class="icon">${o.icon}</div><div class="name">${o.name}</div><div class="bonus">+10% 全属性</div><div class="desc">${o.desc}</div>`;
    c.onclick=()=>doPromo(false,o.key); cards.appendChild(c);
  }
  modal.classList.add('show');
}

function getOptions() {
  const b=hero.cls, opts=[];
  if (hero.promo===0) {
    if (['warrior','blademaster','mountainking','bloodmage'].includes(b)) {
      opts.push({key:'blademaster',...CLS.blademaster,desc:'高攻速近战'});
      opts.push({key:'mountainking',...CLS.mountainking,desc:'高防坦克'});
      opts.push({key:'bloodmage',...CLS.bloodmage,desc:'法术伤害'});
    } else {
      opts.push({key:'windrunner',...CLS.windrunner,desc:'远程输出'});
      opts.push({key:'shadowhunter',...CLS.shadowhunter,desc:'高暴击'});
      opts.push({key:'keeper',...CLS.keeper,desc:'召唤辅助'});
    }
  } else {
    opts.push({key:'swordgod',...CLS.swordgod,desc:'终极剑士'});
    opts.push({key:'titan',...CLS.titan,desc:'终极坦克'});
    opts.push({key:'inferno',...CLS.inferno,desc:'终极法师'});
  }
  return opts;
}

function doPromo(auto, key) {
  const b=auto?1.2:1.1;
  if (auto) { const o=getOptions(); key=o[Math.floor(Math.random()*o.length)].key; }
  hero.cls=key; hero.buff*=b;
  hero.atk=Math.floor(hero.atk*b); hero.def=Math.floor(hero.def*b);
  hero.maxHp=Math.floor(hero.maxHp*b); hero.hp=hero.maxHp;
  hero.maxMp=Math.floor(hero.maxMp*b); hero.mp=hero.maxMp;
  hero.promo++; updateSkills();
  document.getElementById('promo-modal').classList.remove('show');
  state='playing';
  const p=hPos(); addP(p.x,p.y-40,'转职:'+CLS[key].name,'#ffd700',22);
}

function updateSkills() {
  const c=hero.cls;
  if (c.includes('blade')||c==='swordgod') {
    hero.skills[1]={name:'剑气斩',cd:0,maxCd:3,dmg:3.0,ic:'💫',aoe:120,type:'small'};
    hero.skills[3]={name:'剑刃风暴',cd:0,maxCd:15,dmg:7.0,ic:'🌪️',aoe:250,type:'big'};
  } else if (c.includes('mountain')||c==='titan') {
    hero.skills[1]={name:'雷霆一击',cd:0,maxCd:4,dmg:2.5,ic:'⚡',aoe:130,type:'small'};
    hero.skills[3]={name:'天神下凡',cd:0,maxCd:20,dmg:5.0,ic:'🏔️',aoe:200,type:'big'};
  } else if (c.includes('blood')||c==='inferno') {
    hero.skills[0]={name:'火球',cd:0,maxCd:.5,dmg:1.3,ic:'🔥',type:'basic'};
    hero.skills[1]={name:'烈焰',cd:0,maxCd:4,dmg:3.0,ic:'🔥',aoe:120,type:'small'};
    hero.skills[3]={name:'地狱烈焰',cd:0,maxCd:16,dmg:6.5,ic:'🌋',aoe:250,type:'big'};
  } else if (c.includes('wind')) {
    hero.skills[1]={name:'穿透箭',cd:0,maxCd:3,dmg:2.8,ic:'🎯',aoe:140,type:'small'};
    hero.skills[3]={name:'箭雨',cd:0,maxCd:16,dmg:6.5,ic:'🌧️',aoe:280,type:'big'};
  } else if (c.includes('shadow')) {
    hero.crit=.25;
    hero.skills[1]={name:'毒刃',cd:0,maxCd:3,dmg:3.5,ic:'🗡️',aoe:100,type:'small'};
    hero.skills[3]={name:'暗影突袭',cd:0,maxCd:14,dmg:8.0,ic:'🌑',aoe:200,type:'big'};
  }
}

// 波次
function spawnWave() {
  const count=8+Math.floor(wave*1.8), boss=wave%5===0;
  const ann=document.getElementById('wave-ann');
  ann.className = boss ? 'wave-announce boss' : 'wave-announce';
  ann.innerHTML = boss ? '⚠️ BOSS WAVE ⚠️<br><span style="font-size:16px">强大的敌人!</span>' : `WAVE ${wave}<br><span style="font-size:16px">${count} 敌人来袭</span>`;
  ann.style.display='block'; setTimeout(()=>ann.style.display='none',2000);
  let n=0;
  const iv=setInterval(()=>{
    if (n>=count||state==='gameover'){clearInterval(iv);return;}
    if (boss&&n===0) enemies.push(new Enemy('outer','normal',true));
    else {
      const path=Math.random()<.5?'inner':'outer';
      const r=Math.random();
      let type='normal';
      if (wave>3 && r<.2) type='fast';
      else if (wave>5 && r<.3 && r>=.2) type='elite';
      enemies.push(new Enemy(path, type, false));
    }
    n++;
  }, 400);
}

function checkEnd() {
  if (enemies.length>=C.MAX_ENEMIES && !dungeonActive) { gameOver('敌人超过'+C.MAX_ENEMIES+'个!'); return; }
  if (hero.hp<=0) gameOver('英雄阵亡!');
}
function gameOver(r) {
  state='gameover';
  document.getElementById('go-wave').textContent=wave;
  document.getElementById('go-kills').textContent=kills;
  document.getElementById('go-reason').textContent=r;
  document.getElementById('gameover').classList.add('show');
}
function showToast(t) { const e=document.getElementById('toast'); e.textContent=t; e.style.display='block'; setTimeout(()=>e.style.display='none',1500); }

function updateUI() {
  document.getElementById('lv').textContent=hero.lv;
  document.getElementById('side-lv').textContent=hero.lv;
  document.getElementById('gold').textContent=gold;
  document.getElementById('wave').textContent=wave;
  document.getElementById('kills').textContent=kills;
  document.getElementById('enemies').textContent=enemies.length;
  document.getElementById('enemies').style.color = enemies.length>120?'#f44336':enemies.length>80?'#ff9800':'#ffd700';
  document.getElementById('class-icon').textContent=CLS[hero.cls].icon;
  document.getElementById('class-name').textContent=CLS[hero.cls].name;
  document.getElementById('hp-bar').style.width=(hero.hp/hero.maxHp*100)+'%';
  document.getElementById('mp-bar').style.width=(hero.mp/hero.maxMp*100)+'%';
  document.getElementById('exp-bar').style.width=(hero.exp/hero.expNeed*100)+'%';
  updateSkUI();
}

function updateSkUI() {
  const costs=[5,15,10,30];
  for (let i=0;i<4;i++) {
    const btn=document.querySelector(`[data-skill="${i}"]`), sk=hero.skills[i];
    btn.querySelector('.ic').textContent=sk.ic;
    btn.querySelector('.nm').textContent=sk.name;
    const old=btn.querySelector('.cd'); if(old)old.remove();
    if (sk.cd>0) { btn.classList.add('off'); btn.classList.remove('on'); const d=document.createElement('div'); d.className='cd'; d.textContent=Math.ceil(sk.cd); btn.appendChild(d); }
    else if (hero.mp<costs[i]) { btn.classList.add('off'); btn.classList.remove('on'); }
    else { btn.classList.remove('off'); btn.classList.add('on'); }
  }
}

// 绘制
function drawMap() {
  const bg=ctx.createLinearGradient(0,0,0,C.H);
  bg.addColorStop(0,'#1a2a1a'); bg.addColorStop(1,'#0d1b0d');
  ctx.fillStyle=bg; ctx.fillRect(0,0,C.W,C.H);
  
  // 草地纹理
  ctx.fillStyle='rgba(34,139,34,.06)';
  for (let i=0;i<50;i++){ctx.beginPath();ctx.arc((i*67)%C.W,(i*89)%C.H,10+i%12,0,Math.PI*2);ctx.fill();}
  
  // 外环路线
  drawPath(PATHS.outer,'rgba(80,60,30,.5)',38);
  drawPath(PATHS.outer,'rgba(120,80,40,.6)',32);
  drawPath(PATHS.outer,'rgba(150,100,50,.2)',26);
  
  // 内环路线
  drawPath(PATHS.inner,'rgba(60,60,100,.4)',32);
  drawPath(PATHS.inner,'rgba(80,80,130,.5)',26);
  drawPath(PATHS.inner,'rgba(100,100,160,.2)',20);
  
  // 箭头指示方向
  ctx.fillStyle='rgba(255,255,255,.15)';
  drawArrow(PATHS.outer, 0);
  drawArrow(PATHS.inner, 0);
  
  // 标签
  ctx.fillStyle='rgba(255,255,255,.35)'; ctx.font='bold 11px Arial'; ctx.textAlign='center';
  ctx.fillText('外环 →',100,52);
  ctx.fillText('内环 →',130,172);
  
  // 塔位
  for (let i=0;i<5;i++) {
    const t=TOWERS[i], active=hero.towerIdx===i;
    
    // 可点击区域
    ctx.fillStyle = 'rgba(255,255,255,.03)';
    ctx.beginPath(); ctx.arc(t.x,t.y,35,0,Math.PI*2); ctx.fill();
    
    if (active) {
      // 脉冲光环
      ctx.save();
      ctx.globalAlpha = .2 + Math.sin(Date.now()/300)*.15;
      ctx.fillStyle='rgba(255,215,0,.1)';
      ctx.beginPath(); ctx.arc(t.x,t.y,38,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#ffd700'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(t.x,t.y,34+Math.sin(Date.now()/200)*4,0,Math.PI*2); ctx.stroke();
      ctx.restore();
    }
    
    // 塔位圆环
    ctx.strokeStyle=active?'#ffd700':'rgba(150,150,150,.5)';
    ctx.lineWidth=active?3:2;
    ctx.beginPath(); ctx.arc(t.x,t.y,28,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle=active?'rgba(74,144,217,.15)':'rgba(50,50,50,.2)';
    ctx.fill();
    
    // 名字
    ctx.fillStyle=active?'#ffd700':'rgba(255,255,255,.4)';
    ctx.font=active?'bold 11px Arial':'10px Arial';
    ctx.textAlign='center';
    ctx.fillText((active?'📍':'') + t.name, t.x, t.y+42);
    
    // 等级
    if (t.lv>1) { ctx.fillStyle='#ffd700'; ctx.font='9px Arial'; ctx.fillText('Lv'+t.lv,t.x,t.y+54); }
  }
}

function drawArrow(path, offset) {
  for (let i = 0; i < path.length - 1; i++) {
    const p1 = path[i], p2 = path[i+1];
    const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-4, -5);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawPath(path,col,w) {
  ctx.strokeStyle=col; ctx.lineWidth=w; ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.beginPath(); ctx.moveTo(path[0].x,path[0].y);
  for(let i=1;i<path.length;i++) ctx.lineTo(path[i].x,path[i].y);
  ctx.closePath(); ctx.stroke();
}

function drawHero() {
  const p=hPos(), cls=CLS[hero.cls];
  
  // 攻击范围圈
  ctx.save();
  ctx.strokeStyle='rgba(255,255,255,.06)'; ctx.lineWidth=1;
  ctx.setLineDash([5,5]);
  ctx.beginPath(); ctx.arc(p.x,p.y,cls.range,0,Math.PI*2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  
  // 光环效果
  ctx.save();
  ctx.globalAlpha = .1 + Math.sin(Date.now()/500)*.05;
  const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 35);
  glow.addColorStop(0, cls.color);
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(p.x, p.y, 35, 0, Math.PI*2); ctx.fill();
  ctx.restore();
  
  // 身体 - 更精细
  const g = ctx.createRadialGradient(p.x-6, p.y-6, 3, p.x, p.y, 24);
  g.addColorStop(0, '#fff');
  g.addColorStop(.2, lighten(cls.color, 30));
  g.addColorStop(.5, cls.color);
  g.addColorStop(1, shade(cls.color, -40));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(p.x, p.y, 22, 0, Math.PI*2); ctx.fill();
  
  // 发光边框
  ctx.shadowColor=cls.color; ctx.shadowBlur=15;
  ctx.strokeStyle='#fff'; ctx.lineWidth=2.5;
  ctx.stroke(); ctx.shadowBlur=0;
  
  // 内圈装饰
  ctx.strokeStyle='rgba(255,255,255,.3)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.arc(p.x, p.y, 16, 0, Math.PI*2); ctx.stroke();
  
  // 职业图标
  ctx.font='bold 16px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle='#fff'; ctx.fillText(cls.icon, p.x, p.y);
  
  // 名字和等级
  ctx.font='bold 10px Arial'; ctx.fillStyle=cls.color;
  ctx.fillText(cls.name + ' Lv.' + hero.lv, p.x, p.y+36);
  
  // 血蓝条
  const bw=48;
  ctx.fillStyle='#222'; ctx.fillRect(p.x-bw/2, p.y-34, bw, 6);
  ctx.fillStyle=hero.hp>hero.maxHp*.5?'#4caf50':'#f44336';
  ctx.fillRect(p.x-bw/2, p.y-34, bw*(hero.hp/hero.maxHp), 6);
  ctx.strokeStyle='#444'; ctx.lineWidth=1; ctx.strokeRect(p.x-bw/2, p.y-34, bw, 6);
  
  ctx.fillStyle='#1a1a3a'; ctx.fillRect(p.x-bw/2, p.y-26, bw, 4);
  ctx.fillStyle='#2196f3'; ctx.fillRect(p.x-bw/2, p.y-26, bw*(hero.mp/hero.maxMp), 4);
}

function update() {
  if (state!=='playing') return;
  if (hero.hp>0) autoAtk();
  if (hero.mp<hero.maxMp) hero.mp+=.06;
  for(const s of hero.skills) if(s.cd>0) s.cd-=.016;
  
  for(let i=enemies.length-1;i>=0;i--) {
    enemies[i].update(); // 循环，不会消失
    if(enemies[i].hp<=0) {
      kills++; gold+=enemies[i].boss?60:(10+Math.floor(wave/3));
      gainExp(enemies[i].exp);
      addP(enemies[i].x,enemies[i].y,'+'+enemies[i].exp+'EXP','#4fc3f7',11);
      if(enemies[i].boss) addP(enemies[i].x,enemies[i].y-20,'+60金!','#ffd700',14);
      enemies.splice(i,1);
    }
  }
  
  for(let i=particles.length-1;i>=0;i--) if(!particles[i].update()) particles.splice(i,1);
  waveT-=.016;
  if(waveT<=0){wave++;waveT=C.WAVE_CD+wave*1.2;spawnWave();}
  if(shake>0)shake*=.85; if(shake<.5)shake=0;
  checkEnd(); updateUI();
}

function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save();
  if(shake>0)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
  drawMap();
  for(const e of enemies) e.draw();
  if(dungeonEnemy) dungeonEnemy.draw();
  drawHero();
  for(const p of particles) p.draw();
  ctx.restore();
}

function loop() { update(); draw(); requestAnimationFrame(loop); }

function init() {
  canvas=document.getElementById('game');
  ctx=canvas.getContext('2d');
  canvas.width=C.W; canvas.height=C.H;
  requestAnimationFrame(loop);
  setupEvents();
}

function setupEvents() {
  document.querySelectorAll('.sk').forEach(b=>{
    const fn=e=>{e.preventDefault();if(state==='playing')useSkill(+b.dataset.skill);};
    b.addEventListener('touchstart',fn); b.addEventListener('click',fn);
  });
  
  canvas.addEventListener('click', e => {
    if (state !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    for (let i = 0; i < TOWERS.length; i++) {
      const t = TOWERS[i];
      if (Math.hypot(x-t.x, y-t.y) < 35) {
        if (hero.towerIdx !== i) {
          hero.towerIdx = i;
          addP(t.x, t.y-30, '移动!', '#fff', 14);
        }
        return;
      }
    }
  });
  
  document.getElementById('btn-dungeon').addEventListener('click', () => {
    if (!dungeonActive) showDungeonMenu();
    else showToast('已在副本中!');
  });
  
  document.getElementById('btn-upgrade').addEventListener('click', () => {
    const t=TOWERS[hero.towerIdx], costs=[80,200,500,1000], cost=costs[t.lv-1];
    if(cost && gold>=cost && t.lv<5) {
      gold-=cost; t.lv++; hero.atk=Math.floor(hero.atk*1.15);
      addP(t.x,t.y-40,'塔位升级!','#ffd700',16);
      showToast('塔位Lv.'+t.lv);
    }
  });
  
  document.getElementById('dungeon-close').addEventListener('click', () => {
    document.getElementById('dungeon-modal').classList.remove('show');
    state = 'playing';
  });
}

window.onload = init;
