/**
 * 魔兽RPG - 无尽塔防 V3.0
 * 三系英雄 + 精细美术 + 副本挑战 + 100敌人失败条件
 */

const C = { W: 400, H: 650, MAX_ENEMIES: 100, WAVE_CD: 22 };

let canvas, ctx;
let state = 'playing';
let gold = 0, wave = 1, waveT = 5, kills = 0, shake = 0;

const TOWERS = [
  { x: 60, y: 120, name: '左上', lv: 1 },
  { x: 340, y: 120, name: '右上', lv: 1 },
  { x: 60, y: 530, name: '左下', lv: 1 },
  { x: 340, y: 530, name: '右下', lv: 1 },
  { x: 200, y: 325, name: '中心', lv: 1 }
];

const PATHS = {
  inner: [{x:100,y:180},{x:300,y:180},{x:300,y:470},{x:100,y:470},{x:100,y:180}],
  outer: [{x:30,y:60},{x:370,y:60},{x:370,y:590},{x:30,y:590},{x:30,y:60}]
};

// ====== 三系英雄系统 ======
// 攻击范围为60%: 战士162, 弓手288, 法师234
const HEROES = {
  // 力量系 - 攻击强，攻速慢，大招CD长
  warrior: { name:'战士', icon:'⚔️', color:'#e53935', range:162, type:'str', atkSpd:0.9, ultCd:25, desc:'力量型·高攻慢速' },
  blademaster: { name:'剑圣', icon:'⚔️', color:'#ff5252', range:180, type:'str', atkSpd:0.85, ultCd:22 },
  mountainking: { name:'山丘', icon:'🛡️', color:'#ffd700', range:150, type:'str', atkSpd:1.0, ultCd:28 },
  titan: { name:'泰坦', icon:'🏔️', color:'#ff8f00', range:168, type:'str', atkSpd:0.9, ultCd:30 },
  
  // 敏捷系 - 攻击强，攻速快，大招CD长
  archer: { name:'弓手', icon:'🏹', color:'#43a047', range:288, type:'agi', atkSpd:0.45, ultCd:22, desc:'敏捷型·快攻高伤' },
  windrunner: { name:'风行', icon:'💨', color:'#00e676', range:324, type:'agi', atkSpd:0.4, ultCd:20 },
  shadowhunter: { name:'暗猎', icon:'🌑', color:'#7b1fa2', range:270, type:'agi', atkSpd:0.35, ultCd:18 },
  gale: { name:'疾风', icon:'🌪️', color:'#18ffff', range:360, type:'agi', atkSpd:0.35, ultCd:25 },
  
  // 智力系 - 攻击一般，攻速慢，大招CD短
  mage: { name:'法师', icon:'🔮', color:'#1565c0', range:234, type:'int', atkSpd:0.7, ultCd:12, desc:'智力型·技能频繁' },
  bloodmage: { name:'血法', icon:'🔥', color:'#d32f2f', range:216, type:'int', atkSpd:0.65, ultCd:10 },
  frost: { name:'冰法', icon:'❄️', color:'#4fc3f7', range:252, type:'int', atkSpd:0.75, ultCd:11 },
  storm: { name:'雷法', icon:'⚡', color:'#7c4dff', range:234, type:'int', atkSpd:0.6, ultCd:8 },
  
  // 终极形态
  swordgod: { name:'剑神', icon:'💫', color:'#ff1744', range:192, type:'str', atkSpd:0.8, ultCd:20 },
  inferno: { name:'炎魔', icon:'🌋', color:'#ff6d00', range:240, type:'int', atkSpd:0.6, ultCd:8 },
  phoenix: { name:'凤凰', icon:'🦚', color:'#ff4081', range:270, type:'int', atkSpd:0.55, ultCd:7 }
};

// 副本
const DUNGEONS = [
  { name:'金币挑战I', icon:'💰', cost:0, hp:200, time:15, reward:150, unlock:1, desc:'15秒内击败' },
  { name:'金币挑战II', icon:'💰💰', cost:30, hp:500, time:20, reward:400, unlock:5, desc:'20秒内击败' },
  { name:'经验挑战', icon:'⭐', cost:80, hp:800, time:25, reward:0, exp:600, unlock:8, desc:'25秒内击败' },
  { name:'Boss挑战', icon:'👹', cost:150, hp:2000, time:30, reward:1000, unlock:12, desc:'30秒内击败Boss' },
  { name:'极限挑战', icon:'💀', cost:300, hp:5000, time:40, reward:2500, unlock:20, desc:'40秒极限挑战' }
];

let dungeonActive = null, dungeonEnemy = null, dungeonTimer = 0;

// 怪物类型
const MONSTER_TYPES = {
  normal: { name:'普通', col:'#66bb6a', hpMul:1, atkMul:1, spdMul:1, expMul:1 },
  fast: { name:'快速', col:'#00bcd4', hpMul:0.6, atkMul:0.8, spdMul:1.8, expMul:0.8 },
  tank: { name:'肉盾', col:'#8d6e63', hpMul:2.5, atkMul:1.2, spdMul:0.6, expMul:1.5 },
  elite: { name:'精英', col:'#e040fb', hpMul:2, atkMul:1.5, spdMul:1, expMul:2 },
  magic: { name:'魔法', col:'#7c4dff', hpMul:0.8, atkMul:1.8, spdMul:1.1, expMul:1.3 },
  boss: { name:'BOSS', col:'#ffd600', hpMul:8, atkMul:3, spdMul:0.7, expMul:5 }
};

let hero = {
  cls: 'warrior', towerIdx: 4, lv: 1, exp: 0, expNeed: 100,
  hp: 150, maxHp: 150, mp: 80, maxMp: 80,
  atk: 25, def: 8, atkTimer: 0,
  crit: 0.1, critDmg: 2.0, promo: 0, buff: 1.0,
  skills: [
    { name:'攻击', cd:0, maxCd:0.3, dmg:1.0, ic:'⚔️', type:'basic' },
    { name:'小必杀', cd:0, maxCd:5, dmg:2.5, ic:'💫', aoe:120, type:'small' },
    { name:'治疗', cd:0, maxCd:7, heal:40, ic:'💚', type:'heal' },
    { name:'大必杀', cd:0, maxCd:20, dmg:3.0, ic:'⚡', aoe:280, type:'big' } // 50%削弱
  ]
};

function hPos() { return TOWERS[hero.towerIdx]; }
function getHeroData() { return HEROES[hero.cls]; }

let enemies = [], particles = [], warnings = [];

class Enemy {
  constructor(pathKey, typeKey) {
    const path = pathKey === 'inner' ? PATHS.inner : PATHS.outer;
    const type = MONSTER_TYPES[typeKey];
    const isBoss = typeKey === 'boss';
    
    this.path = path; this.wp = 0; this.typeKey = typeKey;
    this.x = path[0].x + (Math.random()-.5)*20;
    this.y = path[0].y + (Math.random()-.5)*20;
    this.boss = isBoss; this.typeName = type.name;
    
    const wm = 1 + wave * 0.1;
    this.hp = (50 + wave*12) * type.hpMul * wm;
    this.maxHp = this.hp;
    this.atk = (8 + wave*2) * type.atkMul;
    this.def = 3 + wave * (isBoss ? 2 : 0.8);
    this.spd = (pathKey==='inner' ? 1.6 : 1.0) * type.spdMul;
    this.exp = Math.floor((20 + wave*8) * type.expMul);
    this.sz = isBoss ? 32 : (typeKey==='elite' ? 22 : (typeKey==='tank' ? 24 : 16));
    this.col = type.col;
    this.glow = typeKey==='elite' || typeKey==='magic' || isBoss;
  }
  
  update() {
    const t = this.path[this.wp];
    const dx = t.x-this.x, dy = t.y-this.y, d = Math.hypot(dx,dy);
    if (d < this.spd+2) { this.wp = (this.wp+1) % this.path.length; }
    else { this.x += dx/d*this.spd; this.y += dy/d*this.spd; }
    return true;
  }
  
  draw() {
    const {x,y,sz,col,boss,typeKey,typeName,glow,hp,maxHp} = this;
    
    // 影子
    ctx.fillStyle='rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.ellipse(x,y+sz*.8,sz*.9,sz*.25,0,0,Math.PI*2); ctx.fill();
    
    // 身体渐变
    const g=ctx.createRadialGradient(x-sz*.2,y-sz*.3,sz*.1,x,y,sz);
    g.addColorStop(0,shade(col,50)); g.addColorStop(.4,col); g.addColorStop(1,shade(col,-50));
    ctx.fillStyle=g;
    
    // 形状区分
    if (typeKey==='tank') {
      // 方形
      ctx.fillRect(x-sz,y-sz,sz*2,sz*2);
      ctx.strokeStyle=shade(col,-60); ctx.lineWidth=2; ctx.strokeRect(x-sz,y-sz,sz*2,sz*2);
    } else if (typeKey==='magic') {
      // 六边形
      ctx.beginPath();
      for(let i=0;i<6;i++){const a=Math.PI/3*i-Math.PI/6;ctx.lineTo(x+Math.cos(a)*sz,y+Math.sin(a)*sz);}
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle=shade(col,-50); ctx.lineWidth=1.5; ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(x,y,sz,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle=shade(col,-50); ctx.lineWidth=1.5; ctx.stroke();
    }
    
    // 高光
    ctx.fillStyle='rgba(255,255,255,.2)';
    ctx.beginPath(); ctx.arc(x-sz*.3,y-sz*.3,sz*.25,0,Math.PI*2); ctx.fill();
    
    // 眼睛
    const ey=y-sz*.05, ex=sz*.28, er=sz*.16;
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.ellipse(x-ex,ey,er,er*1.2,0,0,Math.PI*2); ctx.ellipse(x+ex,ey,er,er*1.2,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=boss?'#f00':'#111';
    ctx.beginPath(); ctx.arc(x-ex,ey,er*.5,0,Math.PI*2); ctx.arc(x+ex,ey,er*.5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff';
    ctx.beginPath(); ctx.arc(x-ex+er*.2,ey-er*.2,er*.25,0,Math.PI*2); ctx.arc(x+ex+er*.2,ey-er*.2,er*.25,0,Math.PI*2); ctx.fill();
    
    // 嘴巴
    ctx.strokeStyle=shade(col,-60); ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(x,y+sz*.25,sz*.2,0.1*Math.PI,0.9*Math.PI); ctx.stroke();
    
    // 光环
    if(glow){
      ctx.save(); ctx.globalAlpha=.25+Math.sin(Date.now()/150)*.15;
      ctx.strokeStyle=col; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(x,y,sz+6,0,Math.PI*2); ctx.stroke();
      ctx.restore();
    }
    
    // Boss角
    if(boss){
      ctx.fillStyle='#ffd600';
      ctx.beginPath(); ctx.moveTo(x-sz*.4,y-sz*.7); ctx.lineTo(x-sz*.25,y-sz*1.3); ctx.lineTo(x-sz*.1,y-sz*.6); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x+sz*.4,y-sz*.7); ctx.lineTo(x+sz*.25,y-sz*1.3); ctx.lineTo(x+sz*.1,y-sz*.6); ctx.fill();
    }
    
    // 血条
    const bw=sz*2.2, by=y-sz-(boss?16:10);
    ctx.fillStyle='#111'; ctx.fillRect(x-bw/2,by,bw,5);
    const ratio=hp/maxHp;
    ctx.fillStyle=ratio>.5?'#4caf50':ratio>.25?'#ff9800':'#f44336';
    ctx.fillRect(x-bw/2,by,bw*ratio,5);
    ctx.strokeStyle='#333'; ctx.lineWidth=1; ctx.strokeRect(x-bw/2,by,bw,5);
    
    // 名字
    if(glow||boss){
      ctx.fillStyle=boss?'#ff4444':col; ctx.font='bold 9px Arial'; ctx.textAlign='center';
      ctx.fillText(typeName,x,by-3);
    }
  }
}

class DungeonEnemy {
  constructor(d) {
    this.x=200; this.y=325; this.hp=d.hp; this.maxHp=d.hp;
    this.sz=45; this.dungeon=d; this.def=0;
  }
  update(){return true;}
  draw(){
    const{x,y,sz,hp,maxHp,dungeon}=this;
    ctx.save();
    ctx.shadowColor='#ffd700'; ctx.shadowBlur=25;
    const g=ctx.createRadialGradient(x,y,0,x,y,sz);
    g.addColorStop(0,'#fff9c4'); g.addColorStop(.4,'#ffd700'); g.addColorStop(1,'#ff8f00');
    ctx.fillStyle=g;
    ctx.beginPath();
    for(let i=0;i<10;i++){const a=Math.PI/5*i-Math.PI/2;const r=i%2===0?sz:sz*.5;ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);}
    ctx.closePath(); ctx.fill();
    ctx.restore();
    
    ctx.font='28px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(dungeon.icon.replace('💰💰','💰').replace('💀','☠️'),x,y);
    
    // 血条
    ctx.fillStyle='#222'; ctx.fillRect(x-35,y-sz-18,70,10);
    ctx.fillStyle='#ffd700'; ctx.fillRect(x-35,y-sz-18,70*(hp/maxHp),10);
    ctx.strokeStyle='#fff'; ctx.lineWidth=1; ctx.strokeRect(x-35,y-sz-18,70,10);
    
    ctx.fillStyle='#ffd700'; ctx.font='bold 13px Arial'; ctx.textAlign='center';
    ctx.fillText(dungeon.name,x,y-sz-30);
    
    // 倒计时
    ctx.fillStyle=dungeonTimer<5?'#f44336':'#fff';
    ctx.font='bold 16px Arial';
    ctx.fillText(Math.ceil(dungeonTimer)+'s',x,y+sz+25);
  }
}

class Part {
  constructor(x,y,t,c,s){this.x=x;this.y=y;this.t=t;this.c=c;this.s=s||14;this.vy=-2.5;this.vx=(Math.random()-.5)*2.5;this.a=1;}
  update(){this.x+=this.vx;this.y+=this.vy;this.vy+=.08;this.a-=.025;return this.a>0;}
  draw(){ctx.save();ctx.globalAlpha=this.a;ctx.font=`bold ${this.s}px Arial`;ctx.textAlign='center';ctx.strokeStyle='#000';ctx.lineWidth=3;ctx.strokeText(this.t,this.x,this.y);ctx.fillStyle=this.c;ctx.fillText(this.t,this.x,this.y);ctx.restore();}
}
function addP(x,y,t,c,s){particles.push(new Part(x,y,t,c,s));}

class Warning {
  constructor(msg){this.msg=msg;this.alpha=1;this.timer=60;}
  update(){this.timer--;this.alpha=this.timer/60;return this.timer>0;}
  draw(){ctx.save();ctx.globalAlpha=this.alpha;ctx.fillStyle='#f44336';ctx.font='bold 18px Arial';ctx.textAlign='center';ctx.strokeStyle='#000';ctx.lineWidth=3;ctx.strokeText(this.msg,200,300);ctx.fillText(this.msg,200,300);ctx.restore();}
}

function shade(c,p){if(!c||c[0]!=='#')return c;const n=parseInt(c.slice(1),16);const a=Math.round(2.55*p);return '#'+(0x1000000+Math.max(0,Math.min(255,(n>>16)+a))*0x10000+Math.max(0,Math.min(255,((n>>8)&0xff)+a))*0x100+Math.max(0,Math.min(255,(n&0xff)+a))).toString(16).slice(1);}

function autoAtk(){
  hero.atkTimer+=.016;
  const hd=getHeroData();
  if(hero.atkTimer<hd.atkSpd) return;
  hero.atkTimer=0;
  const p=hPos(), range=hd.range+(hero.towerIdx===4?40:0);
  
  if(dungeonEnemy){
    let dmg=Math.max(1,Math.floor(hero.atk*hero.buff));
    if(Math.random()<hero.crit){dmg=Math.floor(dmg*hero.critDmg);addP(dungeonEnemy.x,dungeonEnemy.y-20,dmg+'!','#ffd700',16);}
    else addP(dungeonEnemy.x,dungeonEnemy.y-20,'-'+dmg,'#ffd700',12);
    dungeonEnemy.hp-=dmg;
    if(dungeonEnemy.hp<=0) completeDungeon();
    return;
  }
  
  let t=null,md=Infinity;
  for(const e of enemies){const d=Math.hypot(e.x-p.x,e.y-p.y);if(d<range&&d<md){md=d;t=e;}}
  if(t){
    let dmg=Math.max(1,Math.floor(hero.atk*hero.buff-t.def));
    if(Math.random()<hero.crit){dmg=Math.floor(dmg*hero.critDmg);addP(t.x,t.y-15,dmg+'!','#ffd700',16);}
    else addP(t.x,t.y-15,'-'+dmg,hd.color,12);
    t.hp-=dmg;
  }
}

function useSkill(idx){
  const sk=hero.skills[idx];const costs=[5,12,8,25];
  if(sk.cd>0||hero.mp<costs[idx])return;
  sk.cd=sk.maxCd;hero.mp-=costs[idx];
  const p=hPos(),hd=getHeroData();
  
  if(dungeonEnemy){
    if(sk.type==='small'||sk.type==='big'){
      const dmg=Math.max(1,Math.floor(hero.atk*sk.dmg*hero.buff));
      dungeonEnemy.hp-=dmg;addP(dungeonEnemy.x,dungeonEnemy.y-20,'-'+dmg,'#ffd700',16);
      shake=sk.type==='big'?10:5;
      if(dungeonEnemy.hp<=0)completeDungeon();
    }else if(sk.type==='heal'){hero.hp=Math.min(hero.maxHp,hero.hp+sk.heal);addP(p.x,p.y-25,'+'+sk.heal,'#4caf50',14);}
    updateSkUI();return;
  }
  
  if(sk.type==='basic'){
    let t=null,md=Infinity;
    for(const e of enemies){const d=Math.hypot(e.x-p.x,e.y-p.y);if(d<hd.range*1.5&&d<md){md=d;t=e;}}
    if(t){const dmg=Math.max(1,Math.floor(hero.atk*1.5*hero.buff-t.def));t.hp-=dmg;addP(t.x,t.y-15,'-'+dmg,'#ff6f00',14);}
  }else if(sk.type==='small'){
    for(const e of enemies){if(Math.hypot(e.x-p.x,e.y-p.y)<sk.aoe){const dmg=Math.max(1,Math.floor(hero.atk*sk.dmg*hero.buff-e.def));e.hp-=dmg;addP(e.x,e.y-15,'-'+dmg,'#4fc3f7',13);}}
    shake=6;addP(p.x,p.y-30,'小必杀!',hd.color,18);
  }else if(sk.type==='heal'){hero.hp=Math.min(hero.maxHp,hero.hp+sk.heal);addP(p.x,p.y-25,'+'+sk.heal,'#4caf50',14);}
  else if(sk.type==='big'){
    for(const e of enemies){const dmg=Math.max(1,Math.floor(hero.atk*sk.dmg*hero.buff-e.def));e.hp-=dmg;addP(e.x,e.y-15,'-'+dmg,'#ffd700',15);}
    shake=12;addP(p.x,p.y-40,'大必杀!', '#ffd700',26);
    for(let i=0;i<10;i++)addP(Math.random()*C.W,Math.random()*C.H,'⚡','#ffd700',12);
  }
  updateSkUI();
}

function showDungeonMenu(){
  state='paused';const modal=document.getElementById('dungeon-modal'),list=document.getElementById('dungeon-list');
  list.innerHTML='';
  for(const d of DUNGEONS){
    const card=document.createElement('div');
    card.className='dungeon-card'+(hero.lv<d.unlock?' locked':'');
    card.innerHTML=`<div class="icon">${d.icon}</div><div class="name">${d.name}</div><div class="desc">${d.desc}</div><div class="cost">${d.cost>0?'消耗: '+d.cost+'金':'免费'}</div>${hero.lv<d.unlock?'<div class="unlock">需要Lv.'+d.unlock+'</div>':''}`;
    if(hero.lv>=d.unlock) card.onclick=()=>enterDungeon(d);
    list.appendChild(card);
  }
  modal.classList.add('show');
}

function enterDungeon(d){
  if(gold<d.cost){showToast('金币不足!');return;}
  gold-=d.cost;dungeonActive=d;dungeonEnemy=new DungeonEnemy(d);dungeonTimer=d.time;
  document.getElementById('dungeon-modal').classList.remove('show');state='playing';
  showToast('进入'+d.name+'!');
}

function completeDungeon(){
  const d=dungeonActive;
  if(d.reward>0){gold+=d.reward;addP(200,300,'+'+d.reward+'金!','#ffd700',22);}
  if(d.exp){gainExp(d.exp);addP(200,280,'+'+d.exp+'EXP!','#4fc3f7',20);}
  dungeonEnemy=null;dungeonActive=null;showToast('副本完成!');
}

function failDungeon(){
  dungeonEnemy=null;dungeonActive=null;showToast('副本失败!');
}

function gainExp(a){hero.exp+=a;while(hero.exp>=hero.expNeed){hero.exp-=hero.expNeed;levelUp();}}

function levelUp(){
  hero.lv++;hero.expNeed=Math.floor(100*Math.pow(hero.lv,1.2));
  hero.maxHp+=25;hero.hp=hero.maxHp;hero.maxMp+=12;hero.mp=hero.maxMp;
  hero.atk+=4;hero.def+=2;
  const p=hPos();addP(p.x,p.y-35,'LEVEL UP!','#ffd700',18);
  // 5级转职
  if(hero.lv===5&&hero.promo===0)showPromo();
  if(hero.lv===15&&hero.promo===1)showPromo();
}

function showPromo(){
  state='paused';
  const modal=document.getElementById('promo-modal'),cards=document.getElementById('promo-cards');
  cards.innerHTML='';
  const auto=document.createElement('div');
  auto.className='promo-card auto';
  auto.innerHTML='<div class="icon">🎲</div><div class="name">自动转职</div><div class="bonus">+20% 全属性</div><div class="desc">随机职业<br>可能有惊喜!</div>';
  auto.onclick=()=>doPromo(true);cards.appendChild(auto);
  for(const o of getOptions()){
    const c=document.createElement('div');c.className='promo-card';c.style.borderColor=o.color;
    c.innerHTML=`<div class="icon">${o.icon}</div><div class="name">${o.name}</div><div class="bonus">+10% 属性</div><div class="desc">${o.desc||''}</div>`;
    c.onclick=()=>doPromo(false,o.key);cards.appendChild(c);
  }
  modal.classList.add('show');
}

function getOptions(){
  const opts=[], hd=getHeroData();
  if(hero.promo===0){
    if(hd.type==='str'){opts.push({key:'blademaster',...HEROES.blademaster,desc:'快剑近战'});opts.push({key:'mountainking',...HEROES.mountainking,desc:'防御坦克'});}
    else if(hd.type==='agi'){opts.push({key:'windrunner',...HEROES.windrunner,desc:'远程输出'});opts.push({key:'shadowhunter',...HEROES.shadowhunter,desc:'暗影刺客'});}
    else{opts.push({key:'bloodmage',...HEROES.bloodmage,desc:'火焰法师'});opts.push({key:'frost',...HEROES.frost,desc:'冰霜法师'});}
  }else{
    if(hd.type==='str')opts.push({key:'titan',...HEROES.titan,desc:'终极力量'});
    else if(hd.type==='agi')opts.push({key:'gale',...HEROES.gale,desc:'终极敏捷'});
    else opts.push({key:'storm',...HEROES.storm,desc:'终极雷法'});
  }
  return opts;
}

function doPromo(auto,key){
  const b=auto?1.2:1.1;
  if(auto){const o=getOptions();key=o[Math.floor(Math.random()*o.length)].key;}
  hero.cls=key;hero.buff*=b;
  hero.atk=Math.floor(hero.atk*b);hero.def=Math.floor(hero.def*b);
  hero.maxHp=Math.floor(hero.maxHp*b);hero.hp=hero.maxHp;
  hero.maxMp=Math.floor(hero.maxMp*b);hero.mp=hero.maxMp;
  hero.promo++;updateSkills();
  document.getElementById('promo-modal').classList.remove('show');state='playing';
  const p=hPos();addP(p.x,p.y-40,'转职:'+HEROES[key].name,'#ffd700',22);
}

function updateSkills(){
  const hd=getHeroData();
  hero.skills[3].maxCd=hd.ultCd;
  const cls=hero.cls;
  if(['blademaster','swordgod'].includes(cls)){
    hero.skills[1]={name:'剑气斩',cd:0,maxCd:3.5,dmg:2.8,ic:'💫',aoe:100,type:'small'};
    hero.skills[3]={name:'剑刃风暴',cd:0,maxCd:hd.ultCd,dmg:3.5,ic:'🌪️',aoe:200,type:'big'};
  }else if(cls==='mountainking'||cls==='titan'){
    hero.skills[1]={name:'雷霆击',cd:0,maxCd:4,dmg:2.2,ic:'⚡',aoe:110,type:'small'};
    hero.skills[3]={name:'天神下凡',cd:0,maxCd:hd.ultCd,dmg:2.5,ic:'🏔️',aoe:180,type:'big'};
  }else if(['bloodmage','inferno'].includes(cls)){
    hero.skills[0]={name:'火球',cd:0,maxCd:.5,dmg:1.2,ic:'🔥',type:'basic'};
    hero.skills[1]={name:'烈焰',cd:0,maxCd:3.5,dmg:2.5,ic:'🔥',aoe:100,type:'small'};
    hero.skills[3]={name:'地狱火',cd:0,maxCd:hd.ultCd,dmg:3.2,ic:'🌋',aoe:220,type:'big'};
  }else if(cls==='windrunner'||cls==='gale'){
    hero.skills[1]={name:'穿透箭',cd:0,maxCd:3,dmg:2.5,ic:'🎯',aoe:120,type:'small'};
    hero.skills[3]={name:'箭雨',cd:0,maxCd:hd.ultCd,dmg:3.2,ic:'🌧️',aoe:250,type:'big'};
  }else if(cls==='shadowhunter'){
    hero.crit=.25;
    hero.skills[1]={name:'毒刃',cd:0,maxCd:2.5,dmg:3.0,ic:'🗡️',aoe:80,type:'small'};
    hero.skills[3]={name:'暗影杀',cd:0,maxCd:hd.ultCd,dmg:4.0,ic:'🌑',aoe:180,type:'big'};
  }else if(cls==='frost'){
    hero.skills[1]={name:'冰锥',cd:0,maxCd:3,dmg:2.5,ic:'❄️',aoe:110,type:'small'};
    hero.skills[3]={name:'暴风雪',cd:0,maxCd:hd.ultCd,dmg:3.0,ic:'🌨️',aoe:240,type:'big'};
  }else if(cls==='storm'){
    hero.skills[1]={name:'闪电链',cd:0,maxCd:2,dmg:2.0,ic:'⚡',aoe:100,type:'small'};
    hero.skills[3]={name:'雷暴',cd:0,maxCd:hd.ultCd,dmg:3.5,ic:'🌩️',aoe:260,type:'big'};
  }else if(cls==='phoenix'){
    hero.skills[1]={name:'火翼',cd:0,maxCd:2.5,dmg:2.8,ic:'🔥',aoe:110,type:'small'};
    hero.skills[3]={name:'涅槃',cd:0,maxCd:hd.ultCd,dmg:3.8,ic:'🦚',aoe:250,type:'big'};
  }
}

function spawnWave(){
  const count=6+Math.floor(wave*1.5),boss=wave%5===0;
  const ann=document.getElementById('wave-ann');
  ann.className=boss?'wave-announce boss':'wave-announce';
  ann.innerHTML=boss?'⚠️ BOSS WAVE ⚠️<br><span style="font-size:16px">强大的敌人!</span>':`WAVE ${wave}<br><span style="font-size:16px">${count} 敌人</span>`;
  ann.style.display='block';setTimeout(()=>ann.style.display='none',2000);
  let n=0;
  const iv=setInterval(()=>{
    if(n>=count||state==='gameover'){clearInterval(iv);return;}
    if(boss&&n===0){enemies.push(new Enemy('outer','boss'));}
    else{
      const path=Math.random()<.5?'inner':'outer';
      const r=Math.random();
      let type='normal';
      if(wave>2&&r<.15)type='fast';
      else if(wave>4&&r<.25)type='tank';
      else if(wave>6&&r<.32)type='elite';
      else if(wave>8&&r<.38)type='magic';
      enemies.push(new Enemy(path,type));
    }
    n++;
  },400);
}

function checkEnd(){
  const count=enemies.length;
  // 警告系统
  if(count>=80&&count<100&&Math.random()<.05){
    warnings.push(new Warning('⚠️ 敌人过多! '+count+'/100'));
  }
  if(count>=100){gameOver('敌人超过100个!');}
  if(hero.hp<=0)gameOver('英雄阵亡!');
}

function gameOver(r){
  state='gameover';
  document.getElementById('go-wave').textContent=wave;
  document.getElementById('go-kills').textContent=kills;
  document.getElementById('go-reason').textContent=r;
  document.getElementById('gameover').classList.add('show');
}

function showToast(t){const e=document.getElementById('toast');e.textContent=t;e.style.display='block';setTimeout(()=>e.style.display='none',1500);}

function updateUI(){
  document.getElementById('lv').textContent=hero.lv;
  document.getElementById('side-lv').textContent=hero.lv;
  document.getElementById('gold').textContent=gold;
  document.getElementById('wave').textContent=wave;
  document.getElementById('kills').textContent=kills;
  document.getElementById('enemies').textContent=enemies.length;
  const ec=document.getElementById('enemies');
  ec.style.color=enemies.length>80?'#f44336':enemies.length>60?'#ff9800':'#ffd700';
  document.getElementById('class-icon').textContent=getHeroData().icon;
  document.getElementById('class-name').textContent=getHeroData().name;
  document.getElementById('hp-bar').style.width=(hero.hp/hero.maxHp*100)+'%';
  document.getElementById('mp-bar').style.width=(hero.mp/hero.maxMp*100)+'%';
  document.getElementById('exp-bar').style.width=(hero.exp/hero.expNeed*100)+'%';
  updateSkUI();
}

function updateSkUI(){
  const costs=[5,12,8,25];
  for(let i=0;i<4;i++){
    const btn=document.querySelector(`[data-skill="${i}"]`),sk=hero.skills[i];
    btn.querySelector('.ic').textContent=sk.ic;
    btn.querySelector('.nm').textContent=sk.name;
    const old=btn.querySelector('.cd');if(old)old.remove();
    if(sk.cd>0){btn.classList.add('off');btn.classList.remove('on');const d=document.createElement('div');d.className='cd';d.textContent=Math.ceil(sk.cd);btn.appendChild(d);}
    else if(hero.mp<costs[i]){btn.classList.add('off');btn.classList.remove('on');}
    else{btn.classList.remove('off');btn.classList.add('on');}
  }
}

// 绘制
function drawMap(){
  const bg=ctx.createLinearGradient(0,0,0,C.H);
  bg.addColorStop(0,'#1a2a1a');bg.addColorStop(1,'#0d1b0d');
  ctx.fillStyle=bg;ctx.fillRect(0,0,C.W,C.H);
  ctx.fillStyle='rgba(34,139,34,.06)';
  for(let i=0;i<50;i++){ctx.beginPath();ctx.arc((i*67)%C.W,(i*89)%C.H,10+i%12,0,Math.PI*2);ctx.fill();}
  
  drawPath(PATHS.outer,'rgba(80,60,30,.5)',36);
  drawPath(PATHS.outer,'rgba(120,80,40,.6)',30);
  drawPath(PATHS.inner,'rgba(60,60,100,.4)',30);
  drawPath(PATHS.inner,'rgba(80,80,130,.5)',24);
  
  ctx.fillStyle='rgba(255,255,255,.3)';ctx.font='bold 10px Arial';ctx.textAlign='center';
  ctx.fillText('外环',100,48);ctx.fillText('内环',130,168);
  
  for(let i=0;i<5;i++){
    const t=TOWERS[i],active=hero.towerIdx===i;
    ctx.fillStyle='rgba(255,255,255,.03)';ctx.beginPath();ctx.arc(t.x,t.y,32,0,Math.PI*2);ctx.fill();
    if(active){ctx.save();ctx.globalAlpha=.2+Math.sin(Date.now()/300)*.15;ctx.fillStyle='rgba(255,215,0,.1)';ctx.beginPath();ctx.arc(t.x,t.y,36,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ffd700';ctx.lineWidth=2;ctx.beginPath();ctx.arc(t.x,t.y,32+Math.sin(Date.now()/200)*4,0,Math.PI*2);ctx.stroke();ctx.restore();}
    ctx.strokeStyle=active?'#ffd700':'rgba(150,150,150,.5)';ctx.lineWidth=active?3:2;ctx.beginPath();ctx.arc(t.x,t.y,26,0,Math.PI*2);ctx.stroke();ctx.fillStyle=active?'rgba(74,144,217,.15)':'rgba(50,50,50,.2)';ctx.fill();
    ctx.fillStyle=active?'#ffd700':'rgba(255,255,255,.4)';ctx.font=active?'bold 10px Arial':'9px Arial';ctx.textAlign='center';
    ctx.fillText((active?'📍':'')+t.name,t.x,t.y+38);
    if(t.lv>1){ctx.fillStyle='#ffd700';ctx.font='8px Arial';ctx.fillText('Lv'+t.lv,t.x,t.y+48);}
  }
}

function drawPath(path,col,w){ctx.strokeStyle=col;ctx.lineWidth=w;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(path[0].x,path[0].y);for(let i=1;i<path.length;i++)ctx.lineTo(path[i].x,path[i].y);ctx.closePath();ctx.stroke();}

function drawHero(){
  const p=hPos(),hd=getHeroData();
  ctx.save();ctx.strokeStyle='rgba(255,255,255,.06)';ctx.lineWidth=1;ctx.setLineDash([5,5]);ctx.beginPath();ctx.arc(p.x,p.y,hd.range,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.restore();
  
  ctx.save();ctx.globalAlpha=.12+Math.sin(Date.now()/500)*.06;
  const gl=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,38);gl.addColorStop(0,hd.color);gl.addColorStop(1,'transparent');
  ctx.fillStyle=gl;ctx.beginPath();ctx.arc(p.x,p.y,38,0,Math.PI*2);ctx.fill();ctx.restore();
  
  const g=ctx.createRadialGradient(p.x-6,p.y-6,3,p.x,p.y,24);
  g.addColorStop(0,'#fff');g.addColorStop(.2,shade(hd.color,40));g.addColorStop(.5,hd.color);g.addColorStop(1,shade(hd.color,-40));
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,22,0,Math.PI*2);ctx.fill();
  ctx.shadowColor=hd.color;ctx.shadowBlur=15;ctx.strokeStyle='#fff';ctx.lineWidth=2.5;ctx.stroke();ctx.shadowBlur=0;
  ctx.strokeStyle='rgba(255,255,255,.3)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(p.x,p.y,16,0,Math.PI*2);ctx.stroke();
  
  ctx.font='bold 16px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.fillText(hd.icon,p.x,p.y);
  ctx.font='bold 10px Arial';ctx.fillStyle=hd.color;ctx.fillText(hd.name+' Lv.'+hero.lv,p.x,p.y+36);
  
  const bw=48;
  ctx.fillStyle='#222';ctx.fillRect(p.x-bw/2,p.y-34,bw,6);
  ctx.fillStyle=hero.hp>hero.maxHp*.5?'#4caf50':'#f44336';ctx.fillRect(p.x-bw/2,p.y-34,bw*(hero.hp/hero.maxHp),6);
  ctx.strokeStyle='#444';ctx.lineWidth=1;ctx.strokeRect(p.x-bw/2,p.y-34,bw,6);
  ctx.fillStyle='#1a1a3a';ctx.fillRect(p.x-bw/2,p.y-26,bw,4);
  ctx.fillStyle='#2196f3';ctx.fillRect(p.x-bw/2,p.y-26,bw*(hero.mp/hero.maxMp),4);
}

function update(){
  if(state!=='playing')return;
  if(hero.hp>0)autoAtk();
  if(hero.mp<hero.maxMp)hero.mp+=.06;
  for(const s of hero.skills)if(s.cd>0)s.cd-=.016;
  
  for(let i=enemies.length-1;i>=0;i--){
    enemies[i].update();
    if(enemies[i].hp<=0){
      kills++;gold+=enemies[i].boss?60:(8+Math.floor(wave/3));
      gainExp(enemies[i].exp);
      addP(enemies[i].x,enemies[i].y,'+'+enemies[i].exp+'EXP','#4fc3f7',11);
      enemies.splice(i,1);
    }
  }
  
  for(let i=particles.length-1;i>=0;i--)if(!particles[i].update())particles.splice(i,1);
  for(let i=warnings.length-1;i>=0;i--)if(!warnings[i].update())warnings.splice(i,1);
  
  // 副本计时
  if(dungeonActive){
    dungeonTimer-=.016;
    if(dungeonTimer<=0)failDungeon();
  }
  
  waveT-=.016;
  if(waveT<=0){wave++;waveT=C.WAVE_CD+wave;spawnWave();}
  if(shake>0)shake*=.85;if(shake<.5)shake=0;
  checkEnd();updateUI();
}

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save();
  if(shake>0)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
  drawMap();
  for(const e of enemies)e.draw();
  if(dungeonEnemy)dungeonEnemy.draw();
  drawHero();
  for(const p of particles)p.draw();
  for(const w of warnings)w.draw();
  ctx.restore();
}

function loop(){update();draw();requestAnimationFrame(loop);}

function init(){
  canvas=document.getElementById('game');ctx=canvas.getContext('2d');
  canvas.width=C.W;canvas.height=C.H;
  requestAnimationFrame(loop);setupEvents();
}

function setupEvents(){
  document.querySelectorAll('.sk').forEach(b=>{
    const fn=e=>{e.preventDefault();if(state==='playing')useSkill(+b.dataset.skill);};
    b.addEventListener('touchstart',fn);b.addEventListener('click',fn);
  });
  canvas.addEventListener('click',e=>{
    if(state!=='playing')return;
    const rect=canvas.getBoundingClientRect();
    const x=(e.clientX-rect.left)*(canvas.width/rect.width);
    const y=(e.clientY-rect.top)*(canvas.height/rect.height);
    for(let i=0;i<TOWERS.length;i++){
      const t=TOWERS[i];
      if(Math.hypot(x-t.x,y-t.y)<32){if(hero.towerIdx!==i){hero.towerIdx=i;addP(t.x,t.y-30,'移动!','#fff',14);}return;}
    }
  });
  document.getElementById('btn-dungeon').addEventListener('click',()=>{if(!dungeonActive)showDungeonMenu();else showToast('已在副本中!');});
  document.getElementById('btn-upgrade').addEventListener('click',()=>{
    const t=TOWERS[hero.towerIdx],costs=[80,200,500,1000],cost=costs[t.lv-1];
    if(cost&&gold>=cost&&t.lv<5){gold-=cost;t.lv++;hero.atk=Math.floor(hero.atk*1.15);addP(t.x,t.y-40,'塔位升级!','#ffd700',16);showToast('塔位Lv.'+t.lv);}
  });
  document.getElementById('dungeon-close').addEventListener('click',()=>{document.getElementById('dungeon-modal').classList.remove('show');state='playing';});
}

window.onload=init;
