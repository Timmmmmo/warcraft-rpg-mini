/**
 * 魔兽RPG - 无尽塔防 V2.1
 * 点击塔位直接移动 + 小必杀/大必杀
 */

const C = { W: 400, H: 650, MAX_ENEMIES: 150, WAVE_CD: 28 };

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

// 路线
const PATHS = {
  inner: [{x:100,y:180},{x:300,y:180},{x:300,y:470},{x:100,y:470},{x:100,y:180}],
  outer: [{x:30,y:60},{x:370,y:60},{x:370,y:590},{x:30,y:590},{x:30,y:60}]
};

// 职业
const CLS = {
  warrior: { name:'战士', icon:'⚔️', color:'#4a90d9', range:90, type:'melee' },
  archer: { name:'弓手', icon:'🏹', color:'#4caf50', range:160, type:'ranged' },
  mage: { name:'法师', icon:'🔮', color:'#9c27b0', range:130, type:'magic' },
  blademaster: { name:'剑圣', icon:'⚔️', color:'#66ccff', range:100 },
  mountainking: { name:'山丘', icon:'🛡️', color:'#ffd700', range:85 },
  bloodmage: { name:'血法', icon:'🔥', color:'#ff4444', range:120 },
  windrunner: { name:'风行', icon:'💨', color:'#00e676', range:180 },
  shadowhunter: { name:'暗猎', icon:'🌑', color:'#9c27b0', range:150 },
  keeper: { name:'守护', icon:'🌿', color:'#795548', range:140 },
  swordgod: { name:'剑神', icon:'⚡', color:'#00bcd4', range:110 },
  titan: { name:'泰坦', icon:'🏔️', color:'#ffc107', range:95 },
  inferno: { name:'炎魔', icon:'🌋', color:'#ff5722', range:130 }
};

// 英雄
let hero = {
  cls: 'warrior', towerIdx: 4, lv: 1, exp: 0, expNeed: 100,
  hp: 120, maxHp: 120, mp: 60, maxMp: 60,
  atk: 18, def: 6, atkSpd: 0.7, atkTimer: 0,
  crit: 0.1, critDmg: 2.0, promo: 0, buff: 1.0,
  skills: [
    { name:'攻击', cd:0, maxCd:0.4, dmg:1.0, ic:'⚔️', type:'basic' },
    { name:'小必杀', cd:0, maxCd:5, dmg:2.5, ic:'🌀', aoe:100, type:'small' },
    { name:'治疗', cd:0, maxCd:8, heal:35, ic:'💚', type:'heal' },
    { name:'大必杀', cd:0, maxCd:20, dmg:6.0, ic:'⚡', aoe:280, type:'big' }
  ]
};

function hPos() { return TOWERS[hero.towerIdx]; }

let enemies = [], particles = [];

// 敌人
class Enemy {
  constructor(path, type, boss) {
    this.path = path === 'inner' ? PATHS.inner : PATHS.outer;
    this.wp = 0;
    this.x = this.path[0].x + (Math.random()-.05)*20;
    this.y = this.path[0].y + (Math.random()-.5)*20;
    this.boss = boss; this.type = type;
    const wm = 1 + wave * 0.13;
    if (boss) {
      this.hp = (400+wave*120)*wm; this.atk = 25+wave*4; this.def = 12+wave*2;
      this.spd = 0.6; this.exp = 120+wave*30; this.sz = 28; this.col = '#ffd600';
    } else if (type === 'fast') {
      this.hp = (35+wave*10)*wm; this.atk = 6+wave*2; this.def = 2+wave*.5;
      this.spd = path==='inner'?2.5:1.8; this.exp = 15+wave*5; this.sz = 12; this.col = '#00bcd4';
    } else {
      this.hp = (60+wave*15)*wm; this.atk = 8+wave*2.5; this.def = 4+wave;
      this.spd = path==='inner'?1.6:1.0; this.exp = 25+wave*8; this.sz = 16; this.col = '#66bb6a';
    }
    this.maxHp = this.hp;
  }
  update() {
    if (this.wp >= this.path.length) return false;
    const t = this.path[this.wp], dx = t.x-this.x, dy = t.y-this.y, d = Math.hypot(dx,dy);
    if (d < this.spd+2) { this.wp++; if (this.wp >= this.path.length) return false; }
    else { this.x += dx/d*this.spd; this.y += dy/d*this.spd; }
    return true;
  }
  draw() {
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath(); ctx.ellipse(this.x, this.y+this.sz*.7, this.sz*.8, this.sz*.2, 0, 0, Math.PI*2); ctx.fill();
    const g = ctx.createRadialGradient(this.x-3, this.y-3, 2, this.x, this.y, this.sz);
    g.addColorStop(0, shade(this.col,30)); g.addColorStop(.6, this.col); g.addColorStop(1, shade(this.col,-30));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(this.x, this.y, this.sz, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc(this.x-this.sz*.3, this.y-this.sz*.15, this.sz*.18, 0, Math.PI*2); ctx.arc(this.x+this.sz*.3, this.y-this.sz*.15, this.sz*.18, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle='#000';
    ctx.beginPath(); ctx.arc(this.x-this.sz*.3, this.y-this.sz*.15, this.sz*.08, 0, Math.PI*2); ctx.arc(this.x+this.sz*.3, this.y-this.sz*.15, this.sz*.08, 0, Math.PI*2); ctx.fill();
    if (this.boss) {
      ctx.save(); ctx.globalAlpha=.3+Math.sin(Date.now()/150)*.2;
      ctx.strokeStyle='#f00'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.sz+6, 0, Math.PI*2); ctx.stroke(); ctx.restore();
    }
    const bw=this.sz*2;
    ctx.fillStyle='#222'; ctx.fillRect(this.x-bw/2, this.y-this.sz-8, bw, 4);
    ctx.fillStyle = this.hp/this.maxHp>.5?'#4caf50':'#f44336';
    ctx.fillRect(this.x-bw/2, this.y-this.sz-8, bw*(this.hp/this.maxHp), 4);
  }
}

// 粒子
class Part {
  constructor(x,y,t,c,s) { this.x=x; this.y=y; this.t=t; this.c=c; this.s=s||14; this.vy=-2; this.vx=(Math.random()-.5)*2; this.a=1; }
  update() { this.x+=this.vx; this.y+=this.vy; this.vy+=.08; this.a-=.028; return this.a>0; }
  draw() {
    ctx.save(); ctx.globalAlpha=this.a; ctx.font=`bold ${this.s}px Arial`; ctx.textAlign='center';
    ctx.strokeStyle='#000'; ctx.lineWidth=3; ctx.strokeText(this.t,this.x,this.y);
    ctx.fillStyle=this.c; ctx.fillText(this.t,this.x,this.y); ctx.restore();
  }
}
function addP(x,y,t,c,s) { particles.push(new Part(x,y,t,c,s)); }

function shade(c,p) { const n=parseInt(c.slice(1),16); const a=Math.round(2.55*p); return '#'+(0x1000000+Math.max(0,Math.min(255,(n>>16)+a))*0x10000+Math.max(0,Math.min(255,((n>>8)&0xff)+a))*0x100+Math.max(0,Math.min(255,(n&0xff)+a))).toString(16).slice(1); }

// 自动攻击
function autoAtk() {
  hero.atkTimer += .016;
  if (hero.atkTimer < hero.atkSpd) return;
  hero.atkTimer = 0;
  const p = hPos(), range = CLS[hero.cls].range + (hero.towerIdx===4?20:0);
  let t = null, md = Infinity;
  for (const e of enemies) { const d = Math.hypot(e.x-p.x, e.y-p.y); if (d<range && d<md) { md=d; t=e; } }
  if (t) {
    let dmg = Math.max(1, Math.floor(hero.atk*hero.buff - t.def));
    if (Math.random() < hero.crit) { dmg = Math.floor(dmg*hero.critDmg); addP(t.x,t.y-15,dmg+'!','#ffd700',16); }
    else addP(t.x,t.y-15,'-'+dmg, CLS[hero.cls].color, 12);
    t.hp -= dmg;
  }
}

// 技能释放
function useSkill(idx) {
  const sk = hero.skills[idx];
  const costs = [5, 15, 10, 30];
  if (sk.cd > 0 || hero.mp < costs[idx]) return;
  sk.cd = sk.maxCd; hero.mp -= costs[idx];
  const p = hPos();
  
  if (sk.type === 'basic') {
    // Q: 普攻强化
    let t = null, md = Infinity;
    for (const e of enemies) { const d=Math.hypot(e.x-p.x,e.y-p.y); if (d<CLS[hero.cls].range*1.5&&d<md){md=d;t=e;} }
    if (t) { const dmg=Math.max(1,Math.floor(hero.atk*1.5*hero.buff-t.def)); t.hp-=dmg; addP(t.x,t.y-15,'-'+dmg,'#ff6f00',14); }
  } else if (sk.type === 'small') {
    // W: 小必杀 - 范围AOE
    let hit = 0;
    for (const e of enemies) {
      if (Math.hypot(e.x-p.x, e.y-p.y) < sk.aoe) {
        const dmg = Math.max(1, Math.floor(hero.atk*sk.dmg*hero.buff - e.def));
        e.hp -= dmg; hit++;
        addP(e.x, e.y-15, '-'+dmg, '#4fc3f7', 13);
      }
    }
    shake = 6;
    addP(p.x, p.y-30, '小必杀!', CLS[hero.cls].color, 18);
    // 特效光圈
    for (let i = 0; i < 8; i++) {
      const a = Math.PI*2/8*i;
      addP(p.x+Math.cos(a)*sk.aoe*.7, p.y+Math.sin(a)*sk.aoe*.7, '✦', CLS[hero.cls].color, 10);
    }
  } else if (sk.type === 'heal') {
    // E: 治疗
    hero.hp = Math.min(hero.maxHp, hero.hp+sk.heal);
    addP(p.x, p.y-25, '+'+sk.heal, '#4caf50', 14);
  } else if (sk.type === 'big') {
    // R: 大必杀 - 全屏AOE + 特效
    let hit = 0;
    for (const e of enemies) {
      const dmg = Math.max(1, Math.floor(hero.atk*sk.dmg*hero.buff - e.def));
      e.hp -= dmg; hit++;
      addP(e.x, e.y-15, '-'+dmg, '#ffd700', 15);
    }
    shake = 12;
    addP(p.x, p.y-40, '大必杀!', '#ffd700', 26);
    // 全屏特效
    for (let i = 0; i < 15; i++) {
      const x = Math.random()*C.W, y = Math.random()*C.H;
      addP(x, y, '⚡', '#ffd700', 12);
    }
  }
  updateSkUI();
}

// 经验
function gainExp(a) { hero.exp+=a; while(hero.exp>=hero.expNeed){hero.exp-=hero.expNeed; levelUp();} }

function levelUp() {
  hero.lv++; hero.expNeed = Math.floor(100*Math.pow(hero.lv,1.2));
  hero.maxHp+=22; hero.hp=hero.maxHp; hero.maxMp+=10; hero.mp=hero.maxMp;
  hero.atk+=3; hero.def+=1;
  const p = hPos(); addP(p.x,p.y-35,'LEVEL UP!','#ffd700',18);
  showToast('Level '+hero.lv);
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
    hero.skills[1]={name:'剑气斩',cd:0,maxCd:3,dmg:3.0,ic:'💫',aoe:90,type:'small'};
    hero.skills[3]={name:'剑刃风暴',cd:0,maxCd:15,dmg:7.0,ic:'🌪️',aoe:200,type:'big'};
  } else if (c.includes('mountain')||c==='titan') {
    hero.skills[1]={name:'雷霆一击',cd:0,maxCd:4,dmg:2.5,ic:'⚡',aoe:110,type:'small'};
    hero.skills[3]={name:'天神下凡',cd:0,maxCd:20,dmg:5.0,ic:'🏔️',aoe:180,type:'big'};
  } else if (c.includes('blood')||c==='inferno') {
    hero.skills[0]={name:'火球',cd:0,maxCd:.5,dmg:1.3,ic:'🔥',type:'basic'};
    hero.skills[1]={name:'烈焰风暴',cd:0,maxCd:4,dmg:3.0,ic:'🔥',aoe:100,type:'small'};
    hero.skills[3]={name:'地狱烈焰',cd:0,maxCd:16,dmg:6.5,ic:'🌋',aoe:220,type:'big'};
  } else if (c.includes('wind')) {
    hero.skills[1]={name:'穿透箭',cd:0,maxCd:3,dmg:2.8,ic:'🎯',aoe:120,type:'small'};
    hero.skills[3]={name:'箭雨',cd:0,maxCd:16,dmg:6.5,ic:'🌧️',aoe:250,type:'big'};
  } else if (c.includes('shadow')) {
    hero.crit=.25;
    hero.skills[1]={name:'毒刃',cd:0,maxCd:3,dmg:3.5,ic:'🗡️',aoe:80,type:'small'};
    hero.skills[3]={name:'暗影突袭',cd:0,maxCd:14,dmg:8.0,ic:'🌑',aoe:180,type:'big'};
  }
}

// 波次
function spawnWave() {
  const count=6+Math.floor(wave*1.5), boss=wave%5===0;
  const ann=document.getElementById('wave-ann');
  ann.className = boss ? 'wave-announce boss' : 'wave-announce';
  ann.innerHTML = boss ? '⚠️ BOSS WAVE ⚠️<br><span style="font-size:16px">强大的敌人!</span>' : `WAVE ${wave}<br><span style="font-size:16px">${count} 敌人来袭</span>`;
  ann.style.display='block'; setTimeout(()=>ann.style.display='none',2000);
  let n=0;
  const iv=setInterval(()=>{
    if (n>=count||state==='gameover'){clearInterval(iv);return;}
    if (boss&&n===0) enemies.push(new Enemy('outer','normal',true));
    else enemies.push(new Enemy(Math.random()<.5?'inner':'outer', wave>3&&Math.random()<.3?'fast':'normal', false));
    n++;
  }, 500);
}

function checkEnd() {
  if (enemies.length>=C.MAX_ENEMIES) { gameOver('敌人超过'+C.MAX_ENEMIES+'个!'); return; }
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
  // 塔位高亮
  document.querySelectorAll('.tower-glow').forEach((_,i)=>{
    const el = document.querySelectorAll('.tower-glow')[i];
    if(el) el.style.opacity = hero.towerIdx===i ? '1' : '0';
  });
}

// 绘制
function drawMap() {
  const bg=ctx.createLinearGradient(0,0,0,C.H);
  bg.addColorStop(0,'#1a2a1a'); bg.addColorStop(1,'#0d1b0d');
  ctx.fillStyle=bg; ctx.fillRect(0,0,C.W,C.H);
  ctx.fillStyle='rgba(34,139,34,.06)';
  for (let i=0;i<40;i++){ctx.beginPath();ctx.arc((i*67)%C.W,(i*89)%C.H,10+i%12,0,Math.PI*2);ctx.fill();}
  // 外环
  drawPath(PATHS.outer,'rgba(100,70,40,.4)',36);
  drawPath(PATHS.outer,'rgba(139,90,43,.5)',30);
  // 内环
  drawPath(PATHS.inner,'rgba(80,80,120,.3)',30);
  drawPath(PATHS.inner,'rgba(100,100,150,.4)',24);
  // 标签
  ctx.fillStyle='rgba(255,255,255,.3)'; ctx.font='10px Arial'; ctx.textAlign='center';
  ctx.fillText('外环',30,50); ctx.fillText('内环',100,165);
  // 塔位
  for (let i=0;i<5;i++) {
    const t=TOWERS[i], active=hero.towerIdx===i;
    // 可点击区域高亮
    ctx.fillStyle = active ? 'rgba(255,215,0,.08)' : 'rgba(255,255,255,.02)';
    ctx.beginPath(); ctx.arc(t.x,t.y,30,0,Math.PI*2); ctx.fill();
    if (active) {
      ctx.fillStyle='rgba(74,144,217,.15)';
      ctx.beginPath(); ctx.arc(t.x,t.y,35,0,Math.PI*2); ctx.fill();
      // 脉冲动画
      ctx.save();
      ctx.globalAlpha = .3 + Math.sin(Date.now()/300)*.2;
      ctx.strokeStyle='#ffd700'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(t.x,t.y,32+Math.sin(Date.now()/200)*3,0,Math.PI*2); ctx.stroke();
      ctx.restore();
    }
    ctx.strokeStyle=active?'#ffd700':'rgba(150,150,150,.6)';
    ctx.lineWidth=active?3:2;
    ctx.beginPath(); ctx.arc(t.x,t.y,26,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle=active?'rgba(74,144,217,.2)':'rgba(50,50,50,.3)';
    ctx.fill();
    // 塔位图标
    ctx.fillStyle=active?'#ffd700':'rgba(255,255,255,.4)';
    ctx.font=active?'bold 11px Arial':'10px Arial';
    ctx.textAlign='center';
    ctx.fillText(active?'📍'+t.name:t.name, t.x, t.y+40);
    if (t.lv>1) { ctx.fillStyle='#ffd700'; ctx.font='9px Arial'; ctx.fillText('★'.repeat(t.lv-1),t.x,t.y+50); }
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
  ctx.strokeStyle='rgba(255,255,255,.08)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.arc(p.x,p.y,cls.range,0,Math.PI*2); ctx.stroke();
  const g=ctx.createRadialGradient(p.x-5,p.y-5,2,p.x,p.y,24);
  g.addColorStop(0,'#fff'); g.addColorStop(.3,cls.color); g.addColorStop(1,shade(cls.color,-40));
  ctx.fillStyle=g; ctx.beginPath(); ctx.arc(p.x,p.y,22,0,Math.PI*2); ctx.fill();
  ctx.shadowColor=cls.color; ctx.shadowBlur=12;
  ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.stroke(); ctx.shadowBlur=0;
  ctx.font='bold 16px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle='#fff'; ctx.fillText(cls.icon,p.x,p.y);
  ctx.font='bold 10px Arial'; ctx.fillStyle=cls.color; ctx.fillText(cls.name,p.x,p.y+34);
  const bw=44;
  ctx.fillStyle='#333'; ctx.fillRect(p.x-bw/2,p.y-32,bw,5);
  ctx.fillStyle=hero.hp>hero.maxHp*.5?'#4caf50':'#f44336';
  ctx.fillRect(p.x-bw/2,p.y-32,bw*(hero.hp/hero.maxHp),5);
  ctx.fillStyle='#222'; ctx.fillRect(p.x-bw/2,p.y-26,bw,3);
  ctx.fillStyle='#2196f3'; ctx.fillRect(p.x-bw/2,p.y-26,bw*(hero.mp/hero.maxMp),3);
}

function update() {
  if (state!=='playing') return;
  if (hero.hp>0) autoAtk();
  if (hero.mp<hero.maxMp) hero.mp+=.05;
  for(const s of hero.skills) if(s.cd>0) s.cd-=.016;
  for(let i=enemies.length-1;i>=0;i--) {
    if(!enemies[i].update()) enemies.splice(i,1);
    else if(enemies[i].hp<=0) {
      kills++; gold+=enemies[i].boss?50:(8+Math.floor(wave/3));
      gainExp(enemies[i].exp);
      addP(enemies[i].x,enemies[i].y,'+'+enemies[i].exp+'EXP','#4fc3f7',11);
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
  // 技能
  document.querySelectorAll('.sk').forEach(b=>{
    const fn=e=>{e.preventDefault();if(state==='playing')useSkill(+b.dataset.skill);};
    b.addEventListener('touchstart',fn); b.addEventListener('click',fn);
  });
  
  // 点击塔位直接移动 (在画布上)
  canvas.addEventListener('click', e => {
    if (state !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    for (let i = 0; i < TOWERS.length; i++) {
      const t = TOWERS[i];
      if (Math.hypot(x-t.x, y-t.y) < 32) {
        if (hero.towerIdx !== i) {
          hero.towerIdx = i;
          addP(t.x, t.y-30, '移动!', '#fff', 14);
        }
        return;
      }
    }
  });
  
  // 升级按钮
  document.getElementById('btn-upgrade').addEventListener('click', () => {
    const t=TOWERS[hero.towerIdx], costs=[80,200,500,1000], cost=costs[t.lv-1];
    if(cost && gold>=cost && t.lv<5) {
      gold-=cost; t.lv++; hero.atk=Math.floor(hero.atk*1.15);
      addP(t.x,t.y-40,'塔位升级!','#ffd700',16);
      showToast('塔位Lv.'+t.lv);
    }
  });
}

window.onload = init;
