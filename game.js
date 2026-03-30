/**
 * 魔兽RPG V3.2 - 完全重写，修复显示问题
 */

// 游戏常量
var C = { MAX_ENEMIES: 100, WAVE_CD: 25 };

// 全局变量
var canvas, ctx, W, H;
var state = 'playing';
var gold = 0, wave = 1, waveT = 8, kills = 0, shake = 0;
var moveCd = 0;

// 塔位（百分比坐标）
var TOWERS = [];

// 路线
var PATHS = { inner: [], outer: [] };

// 职业
var HEROES = {
  warrior: { name:'战士', icon:'⚔️', color:'#e53935', skin:'🗡️', range:0.2, type:'str', atkSpd:0.9, ultCd:25 },
  archer: { name:'弓手', icon:'🏹', color:'#43a047', skin:'🎯', range:0.35, type:'agi', atkSpd:0.45, ultCd:22 },
  mage: { name:'法师', icon:'🔮', color:'#1565c0', skin:'✨', range:0.28, type:'int', atkSpd:0.7, ultCd:12 },
  blademaster: { name:'剑圣', icon:'⚔️', color:'#ff5252', skin:'🗡️', range:0.22 },
  mountainking: { name:'山丘', icon:'🛡️', color:'#ffd700', skin:'🔨', range:0.18 },
  bloodmage: { name:'血法', icon:'🔥', color:'#d32f2f', skin:'🔥', range:0.25 },
  windrunner: { name:'风行', icon:'💨', color:'#00e676', skin:'💨', range:0.4 },
  shadowhunter: { name:'暗猎', icon:'🌑', color:'#7b1fa2', skin:'🗡️', range:0.33 },
  frost: { name:'冰法', icon:'❄️', color:'#4fc3f7', skin:'❄️', range:0.3 },
  storm: { name:'雷法', icon:'⚡', color:'#7c4dff', skin:'⚡', range:0.28 },
  titan: { name:'泰坦', icon:'🏔️', color:'#ff8f00', skin:'🏔️', range:0.2 },
  gale: { name:'疾风', icon:'🌪️', color:'#18ffff', skin:'🌪️', range:0.44 },
  inferno: { name:'炎魔', icon:'🌋', color:'#ff6d00', skin:'🌋', range:0.28 },
  phoenix: { name:'凤凰', icon:'🦚', color:'#ff4081', skin:'🦚', range:0.33 }
};

var MONSTER_TYPES = {
  normal: { name:'普通', col:'#66bb6a', hpMul:1, spdMul:1 },
  fast: { name:'快速', col:'#00bcd4', hpMul:0.6, spdMul:1.8 },
  tank: { name:'肉盾', col:'#8d6e63', hpMul:2.5, spdMul:0.6 },
  elite: { name:'精英', col:'#e040fb', hpMul:2, spdMul:1 },
  boss: { name:'BOSS', col:'#ffd600', hpMul:8, spdMul:0.7 }
};

// 副本
var DUNGEONS = [
  { name:'金币副本', icon:'💰', type:'gold', levels:10 },
  { name:'经验副本', icon:'⭐', type:'exp', levels:10 },
  { name:'Boss挑战', icon:'👹', type:'boss', levels:10 }
];
var dungeonLevels = { gold:1, exp:1, boss:1 };
var dungeonActive = null, dungeonEnemy = null, dungeonTimer = 0;

// 英雄
var hero = {
  cls: 'warrior', towerIdx: 4, lv: 1, exp: 0, expNeed: 100,
  hp: 150, maxHp: 150, mp: 80, maxMp: 80,
  atk: 25, def: 8, atkTimer: 0,
  crit: 0.1, critDmg: 2.0, promo: 0, buff: 1.0,
  skills: [
    { name:'小必杀', cd:0, maxCd:5, dmg:3.75, ic:'💫', aoe:0.15, type:'small' },
    { name:'治疗', cd:0, maxCd:7, heal:40, ic:'💚', type:'heal' },
    { name:'大必杀', cd:0, maxCd:20, dmg:4.2, ic:'⚡', aoe:0.35, type:'big' }
  ]
};

var enemies = [], particles = [];

// 音效
var audioCtx = null;
function initAudio() { if (!audioCtx) try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} }
function playSound(type) {
  if (!audioCtx) return;
  try {
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    if (type === 'hit') { osc.frequency.value = 300; gain.gain.value = 0.1; }
    else if (type === 'kill') { osc.frequency.value = 500; gain.gain.value = 0.15; }
    else if (type === 'ult') { osc.type = 'sawtooth'; osc.frequency.value = 200; gain.gain.value = 0.2; }
    else { osc.frequency.value = 400; gain.gain.value = 0.1; }
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    osc.start(); osc.stop(audioCtx.currentTime + 0.15);
  } catch(e) {}
}

// 工具函数
function dist(x1,y1,x2,y2) { return Math.sqrt((x1-x2)*(x1-x2)+(y1-y2)*(y1-y2)); }
function shade(c,p) { if(!c||c[0]!=='#')return c; var n=parseInt(c.slice(1),16); var a=Math.round(2.55*p); return '#'+(0x1000000+Math.max(0,Math.min(255,(n>>16)+a))*0x10000+Math.max(0,Math.min(255,((n>>8)&0xff)+a))*0x100+Math.max(0,Math.min(255,(n&0xff)+a))).toString(16).slice(1); }

function getHeroPos() { return { x: TOWERS[hero.towerIdx].x * W, y: TOWERS[hero.towerIdx].y * H }; }
function getHeroData() { return HEROES[hero.cls] || HEROES.warrior; }

// 初始化布局
function initLayout() {
  TOWERS = [
    { x:0.15, y:0.18, name:'左上', lv:1 },
    { x:0.85, y:0.18, name:'右上', lv:1 },
    { x:0.15, y:0.82, name:'左下', lv:1 },
    { x:0.85, y:0.82, name:'右下', lv:1 },
    { x:0.5, y:0.5, name:'中心', lv:1 }
  ];
  PATHS.inner = [
    {x:0.25,y:0.28},{x:0.75,y:0.28},{x:0.75,y:0.72},{x:0.25,y:0.72},{x:0.25,y:0.28}
  ];
  PATHS.outer = [
    {x:0.08,y:0.09},{x:0.92,y:0.09},{x:0.92,y:0.91},{x:0.08,y:0.91},{x:0.08,y:0.09}
  ];
}

// 敌人类
function Enemy(pathKey, typeKey) {
  var path = pathKey === 'inner' ? PATHS.inner : PATHS.outer;
  var type = MONSTER_TYPES[typeKey];
  this.path = path; this.wp = 0; this.pathKey = pathKey; this.typeKey = typeKey;
  this.x = path[0].x + (Math.random()-0.5)*0.05;
  this.y = path[0].y + (Math.random()-0.5)*0.05;
  this.boss = typeKey === 'boss'; this.typeName = type.name;
  var wm = 1 + wave * 0.1;
  this.hp = (50 + wave*12) * type.hpMul * wm; this.maxHp = this.hp;
  this.def = 3 + wave * (this.boss ? 2 : 0.8);
  this.spd = (pathKey==='inner' ? 0.004 : 0.0025) * type.spdMul;
  this.exp = Math.floor((20 + wave*8) * (this.boss ? 5 : 1));
  this.sz = this.boss ? 0.04 : (typeKey==='elite' ? 0.028 : (typeKey==='tank' ? 0.03 : 0.02));
  this.col = type.col;
}
Enemy.prototype.update = function() {
  var t = this.path[this.wp];
  var dx = t.x - this.x, dy = t.y - this.y;
  var d = Math.sqrt(dx*dx + dy*dy);
  if (d < this.spd + 0.01) { this.wp = (this.wp+1) % this.path.length; }
  else { this.x += (dx/d)*this.spd; this.y += (dy/d)*this.spd; }
  return true;
};
Enemy.prototype.draw = function() {
  var x = this.x * W, y = this.y * H, sz = this.sz * Math.min(W,H);
  var col = this.col;
  var boss = this.boss;
  var typeKey = this.typeKey;
  
  // 影子
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(x, y+sz*0.85, sz*0.8, sz*0.22, 0, 0, Math.PI*2); ctx.fill();
  
  // 身体渐变
  var g = ctx.createRadialGradient(x-sz*0.2, y-sz*0.3, sz*0.1, x, y, sz);
  g.addColorStop(0, shade(col, 50)); g.addColorStop(0.4, col); g.addColorStop(1, shade(col, -40));
  ctx.fillStyle = g;
  
  // 根据类型画不同形状
  if (typeKey === 'tank') {
    // 肉盾: 方形圆角
    roundRect(ctx, x-sz, y-sz, sz*2, sz*2, sz*0.3);
    ctx.fill();
    ctx.strokeStyle = shade(col, -50); ctx.lineWidth = 2; ctx.stroke();
  } else if (typeKey === 'fast') {
    // 快速: 尖形
    ctx.beginPath();
    ctx.moveTo(x, y-sz*1.2);
    ctx.lineTo(x+sz, y+sz*0.3);
    ctx.lineTo(x-sz, y+sz*0.3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = shade(col, -50); ctx.lineWidth = 2; ctx.stroke();
  } else {
    // 默认圆形
    ctx.beginPath(); ctx.arc(x, y, sz, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = shade(col, -50); ctx.lineWidth = 2; ctx.stroke();
  }
  
  // 高光
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath(); ctx.arc(x-sz*0.3, y-sz*0.35, sz*0.25, 0, Math.PI*2); ctx.fill();
  
  // 脸部底色
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath(); ctx.arc(x, y+sz*0.1, sz*0.5, 0, Math.PI*2); ctx.fill();
  
  // 卡通眼睛(大眼睛)
  var eyeY = y - sz*0.1;
  var eyeSz = sz * 0.25;
  // 眼白
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(x-sz*0.3, eyeY, eyeSz, eyeSz*1.2, 0, 0, Math.PI*2);
  ctx.ellipse(x+sz*0.3, eyeY, eyeSz, eyeSz*1.2, 0, 0, Math.PI*2);
  ctx.fill();
  // 瞳孔
  ctx.fillStyle = boss ? '#ff0000' : '#222';
  ctx.beginPath();
  ctx.arc(x-sz*0.28, eyeY+2, eyeSz*0.5, 0, Math.PI*2);
  ctx.arc(x+sz*0.28, eyeY+2, eyeSz*0.5, 0, Math.PI*2);
  ctx.fill();
  // 高光
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x-sz*0.32, eyeY-2, eyeSz*0.25, 0, Math.PI*2);
  ctx.arc(x+sz*0.24, eyeY-2, eyeSz*0.25, 0, Math.PI*2);
  ctx.fill();
  
  // 嘴巴(坏笑)
  ctx.strokeStyle = shade(col, -60); ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y+sz*0.25, sz*0.2, 0.2*Math.PI, 0.8*Math.PI);
  ctx.stroke();
  
  // Boss特殊装饰
  if (boss) {
    // 角
    ctx.fillStyle = '#ffd600';
    ctx.beginPath();
    ctx.moveTo(x-sz*0.5, y-sz*0.6);
    ctx.quadraticCurveTo(x-sz*0.4, y-sz*1.4, x-sz*0.1, y-sz*0.7);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x+sz*0.5, y-sz*0.6);
    ctx.quadraticCurveTo(x+sz*0.4, y-sz*1.4, x+sz*0.1, y-sz*0.7);
    ctx.fill();
    // 光环
    ctx.save();
    ctx.globalAlpha = 0.3 + Math.sin(Date.now()/150)*0.2;
    ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, sz+8, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
    // 名字
    ctx.fillStyle = '#ff4444'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
    ctx.fillText('BOSS', x, y-sz-22);
  }
  
  // 精英光环
  if (typeKey === 'elite') {
    ctx.save();
    ctx.globalAlpha = 0.25 + Math.sin(Date.now()/200)*0.15;
    ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, sz+5, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
  }
  
  // 血条
  var bw = sz*2.2, bh = 5;
  var bx = x-bw/2, by = y-sz-(boss ? 12 : 8);
  ctx.fillStyle = '#111'; ctx.fillRect(bx, by, bw, bh);
  var ratio = this.hp / this.maxHp;
  ctx.fillStyle = ratio > 0.5 ? '#4caf50' : ratio > 0.25 ? '#ff9800' : '#f44336';
  ctx.fillRect(bx, by, bw*ratio, bh);
  ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw, bh);
};

// 圆角矩形辅助函数
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y);
  ctx.quadraticCurveTo(x+w, y, x+w, y+r);
  ctx.lineTo(x+w, y+h-r);
  ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  ctx.lineTo(x+r, y+h);
  ctx.quadraticCurveTo(x, y+h, x, y+h-r);
  ctx.lineTo(x, y+r);
  ctx.quadraticCurveTo(x, y, x+r, y);
  ctx.closePath();
}

// 副本敌人
function DungeonEnemy(d, level) {
  var hp = 100 * level * level * (d.type==='boss' ? 2 : 1);
  this.x = 0.5; this.y = 0.5; this.hp = hp; this.maxHp = hp;
  this.sz = 0.06; this.dungeon = d; this.level = level; this.def = 0;
}
DungeonEnemy.prototype.update = function() { return true; };
DungeonEnemy.prototype.draw = function() {
  var x = this.x*W, y = this.y*H, sz = this.sz*Math.min(W,H);
  ctx.save(); ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 20;
  ctx.fillStyle = '#ffd700';
  ctx.beginPath(); ctx.arc(x, y, sz, 0, Math.PI*2); ctx.fill();
  ctx.restore();
  ctx.font = 'bold '+(sz*0.8)+'px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff'; ctx.fillText(this.dungeon.icon, x, y);
  // 血条
  ctx.fillStyle = '#222'; ctx.fillRect(x-40, y-sz-15, 80, 8);
  ctx.fillStyle = '#ffd700'; ctx.fillRect(x-40, y-sz-15, 80*(this.hp/this.maxHp), 8);
  // 计时
  ctx.fillStyle = dungeonTimer < 5 ? '#f44336' : '#fff';
  ctx.font = 'bold 16px Arial'; ctx.fillText(Math.ceil(dungeonTimer)+'s', x, y+sz+20);
};

// 粒子
function Particle(x,y,t,c,s) { this.x=x; this.y=y; this.t=t; this.c=c; this.s=s||14; this.vy=-2; this.a=1; }
Particle.prototype.update = function() { this.y += this.vy*0.016*60; this.vy += 0.08; this.a -= 0.025; return this.a > 0; };
Particle.prototype.draw = function() {
  ctx.save(); ctx.globalAlpha = this.a;
  ctx.font = 'bold '+this.s+'px Arial'; ctx.textAlign = 'center';
  ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.strokeText(this.t, this.x, this.y);
  ctx.fillStyle = this.c; ctx.fillText(this.t, this.x, this.y);
  ctx.restore();
};
function addP(x,y,t,c,s) { particles.push(new Particle(x,y,t,c,s)); }

// 自动攻击
function autoAtk() {
  hero.atkTimer += 0.016;
  var hd = getHeroData();
  if (hero.atkTimer < hd.atkSpd) return;
  hero.atkTimer = 0;
  var hp = getHeroPos();
  var range = hd.range * Math.min(W,H);
  
  if (dungeonEnemy) {
    var dmg = Math.max(1, Math.floor(hero.atk * hero.buff));
    dungeonEnemy.hp -= dmg;
    addP(dungeonEnemy.x*W, dungeonEnemy.y*H-20, '-'+dmg, '#ffd700', 14);
    playSound('hit');
    if (dungeonEnemy.hp <= 0) completeDungeon();
    return;
  }
  
  var target = null, md = Infinity;
  for (var i = 0; i < enemies.length; i++) {
    var e = enemies[i];
    var ex = e.x*W, ey = e.y*H;
    var d = dist(hp.x, hp.y, ex, ey);
    if (d < range && d < md) { md = d; target = e; }
  }
  if (target) {
    var dmg = Math.max(1, Math.floor(hero.atk * hero.buff - target.def));
    target.hp -= dmg;
    addP(target.x*W, target.y*H-15, '-'+dmg, hd.color, 12);
    playSound('hit');
  }
}

// 技能
function useSkill(idx) {
  var sk = hero.skills[idx];
  var costs = [12, 8, 25];
  if (sk.cd > 0 || hero.mp < costs[idx]) return;
  sk.cd = sk.maxCd; hero.mp -= costs[idx];
  var hp = getHeroPos();
  var hd = getHeroData();
  
  if (sk.type === 'heal') {
    hero.hp = Math.min(hero.maxHp, hero.hp + sk.heal);
    addP(hp.x, hp.y-25, '+'+sk.heal, '#4caf50', 14);
  } else if (sk.type === 'small' || sk.type === 'big') {
    var aoe = sk.aoe * Math.min(W,H);
    var hit = 0;
    if (dungeonEnemy) {
      var dmg = Math.max(1, Math.floor(hero.atk * sk.dmg * hero.buff));
      dungeonEnemy.hp -= dmg;
      addP(dungeonEnemy.x*W, dungeonEnemy.y*H-20, '-'+dmg, '#ffd700', 16);
      if (dungeonEnemy.hp <= 0) completeDungeon();
    } else {
      for (var i = 0; i < enemies.length; i++) {
        var e = enemies[i];
        if (dist(hp.x, hp.y, e.x*W, e.y*H) < aoe) {
          var dmg = Math.max(1, Math.floor(hero.atk * sk.dmg * hero.buff - e.def));
          e.hp -= dmg; hit++;
          addP(e.x*W, e.y*H-15, '-'+dmg, sk.type==='big'?'#ffd700':'#4fc3f7', 14);
        }
      }
    }
    shake = sk.type === 'big' ? 10 : 5;
    playSound('ult');
    addP(hp.x, hp.y-30, sk.name+'!', hd.color, 20);
  }
  updateSkUI();
}

// 副本
function getDungeonStats(d, level) {
  var l = level;
  if (d.type === 'gold') return { hp:100*l*l, time:12+l*2, reward:50*l*l, exp:30*l, cost:Math.floor(10*l*l*0.5) };
  if (d.type === 'exp') return { hp:80*l*l, time:15+l*2, reward:0, exp:80*l, cost:Math.floor(15*l*l*0.5) };
  return { hp:200*l*l, time:20+l*3, reward:80*l*l, exp:50*l, cost:Math.floor(20*l*l*0.5) };
}

var selectedDungeon = null;
function showDungeonMenu() {
  state = 'paused'; selectedDungeon = null;
  var modal = document.getElementById('dungeon-modal');
  var list = document.getElementById('dungeon-list');
  list.innerHTML = '';
  for (var i = 0; i < DUNGEONS.length; i++) {
    var d = DUNGEONS[i];
    var lvl = dungeonLevels[d.type];
    var stats = getDungeonStats(d, lvl);
    var card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = '<div class="icon">'+d.icon+'</div><div class="name">'+d.name+'</div><div class="level">Lv.'+lvl+'</div><div class="desc">消耗:'+stats.cost+'金 奖励:'+stats.exp+'EXP</div>';
    card.dataset.idx = i;
    card.onclick = function() { selectedDungeon = DUNGEONS[this.dataset.idx]; showLevelSelect(); };
    list.appendChild(card);
  }
  document.getElementById('lvl-panel').style.display = 'none';
  modal.classList.add('show');
}

function showLevelSelect() {
  if (!selectedDungeon) return;
  var panel = document.getElementById('lvl-panel');
  var grid = document.getElementById('lvl-grid');
  grid.innerHTML = '';
  var maxLvl = dungeonLevels[selectedDungeon.type];
  for (var i = 1; i <= 10; i++) {
    var btn = document.createElement('div');
    btn.className = 'lvl-btn' + (i > maxLvl ? ' locked' : '');
    btn.textContent = 'Lv.' + i;
    if (i <= maxLvl) {
      btn.dataset.lvl = i;
      btn.onclick = function() {
        var lvl = parseInt(this.dataset.lvl);
        var stats = getDungeonStats(selectedDungeon, lvl);
        if (gold < stats.cost) { showToast('金币不足!'); return; }
        enterDungeon(selectedDungeon, lvl);
      };
    }
    grid.appendChild(btn);
  }
  panel.style.display = 'block';
}

function enterDungeon(d, level) {
  var stats = getDungeonStats(d, level);
  if (gold < stats.cost) { showToast('金币不足!'); return; }
  gold -= stats.cost;
  dungeonActive = d;
  dungeonEnemy = new DungeonEnemy(d, level);
  dungeonTimer = stats.time;
  document.getElementById('dungeon-modal').classList.remove('show');
  state = 'playing';
  showToast('进入'+d.name+' Lv.'+level+'!');
}

function completeDungeon() {
  var d = dungeonActive, lvl = dungeonEnemy.level;
  var stats = getDungeonStats(d, lvl);
  if (stats.reward > 0) { gold += stats.reward; addP(W/2, H/2, '+'+stats.reward+'金!', '#ffd700', 20); }
  gainExp(stats.exp);
  if (dungeonLevels[d.type] === lvl && lvl < 10) dungeonLevels[d.type]++;
  dungeonEnemy = null; dungeonActive = null;
  playSound('kill');
  showToast('副本完成!');
}

function failDungeon() { dungeonEnemy = null; dungeonActive = null; showToast('副本失败!'); }

// 升级/转职
function gainExp(a) { hero.exp += a; while(hero.exp >= hero.expNeed) { hero.exp -= hero.expNeed; levelUp(); } }
function levelUp() {
  hero.lv++; hero.expNeed = Math.floor(100 * Math.pow(hero.lv, 1.15));
  hero.maxHp += 25; hero.hp = hero.maxHp; hero.maxMp += 12; hero.mp = hero.maxMp;
  hero.atk += 4; hero.def += 2;
  var hp = getHeroPos();
  addP(hp.x, hp.y-35, 'LEVEL UP!', '#ffd700', 18);
  playSound('levelUp');
  if (hero.lv === 5 && hero.promo === 0) showPromo();
  if (hero.lv === 10 && hero.promo === 1) showPromo();
}

function showPromo() {
  state = 'paused';
  var modal = document.getElementById('promo-modal');
  var cards = document.getElementById('promo-cards');
  cards.innerHTML = '';
  // 自动
  var auto = document.createElement('div');
  auto.className = 'card auto';
  auto.innerHTML = '<div class="icon">🎲</div><div class="name">自动转职</div><div class="bonus">+20%</div>';
  auto.onclick = function() { doPromo(true); };
  cards.appendChild(auto);
  // 手动选项
  var opts = getPromoOptions();
  for (var i = 0; i < opts.length; i++) {
    var o = opts[i];
    var c = document.createElement('div');
    c.className = 'card'; c.style.borderColor = o.color;
    c.innerHTML = '<div class="icon">'+o.icon+'</div><div class="name">'+o.name+'</div><div class="bonus">+10%</div>';
    c.dataset.key = o.key;
    c.onclick = function() { doPromo(false, this.dataset.key); };
    cards.appendChild(c);
  }
  modal.classList.add('show');
}

function getPromoOptions() {
  var hd = getHeroData();
  var opts = [];
  if (hero.promo === 0) {
    if (hd.type === 'str') { opts.push({key:'blademaster',...HEROES.blademaster}); opts.push({key:'mountainking',...HEROES.mountainking}); }
    else if (hd.type === 'agi') { opts.push({key:'windrunner',...HEROES.windrunner}); opts.push({key:'shadowhunter',...HEROES.shadowhunter}); }
    else { opts.push({key:'bloodmage',...HEROES.bloodmage}); opts.push({key:'frost',...HEROES.frost}); }
  } else {
    if (hd.type === 'str') opts.push({key:'titan',...HEROES.titan});
    else if (hd.type === 'agi') opts.push({key:'gale',...HEROES.gale});
    else opts.push({key:'storm',...HEROES.storm});
  }
  return opts;
}

function doPromo(auto, key) {
  var b = auto ? 1.2 : 1.1;
  if (auto) { var o = getPromoOptions(); key = o[Math.floor(Math.random()*o.length)].key; }
  hero.cls = key; hero.buff *= b;
  hero.atk = Math.floor(hero.atk*b); hero.def = Math.floor(hero.def*b);
  hero.maxHp = Math.floor(hero.maxHp*b); hero.hp = hero.maxHp;
  hero.maxMp = Math.floor(hero.maxMp*b); hero.mp = hero.maxMp;
  hero.promo++;
  document.getElementById('promo-modal').classList.remove('show');
  state = 'playing';
  var hp = getHeroPos();
  addP(hp.x, hp.y-40, '转职:'+HEROES[key].name, '#ffd700', 22);
  playSound('levelUp');
}

// 波次
function spawnWave() {
  var count = 6 + Math.floor(wave * 1.5);
  var isBoss = wave % 5 === 0;
  var ann = document.getElementById('wave-ann');
  ann.className = isBoss ? 'wave-ann boss' : 'wave-ann';
  ann.innerHTML = isBoss ? '⚠️ BOSS ⚠️' : 'WAVE ' + wave;
  ann.style.display = 'block';
  setTimeout(function() { ann.style.display = 'none'; }, 2000);
  var n = 0;
  var iv = setInterval(function() {
    if (n >= count || state === 'gameover') { clearInterval(iv); return; }
    if (isBoss && n === 0) enemies.push(new Enemy('outer', 'boss'));
    else {
      var path = Math.random() < 0.5 ? 'inner' : 'outer';
      var r = Math.random();
      var type = 'normal';
      if (wave > 2 && r < 0.15) type = 'fast';
      else if (wave > 4 && r < 0.25) type = 'tank';
      else if (wave > 6 && r < 0.32) type = 'elite';
      enemies.push(new Enemy(path, type));
    }
    n++;
  }, 500);
}

function checkEnd() {
  if (enemies.length >= 100) gameOver('敌人超过100!');
  if (hero.hp <= 0) gameOver('英雄阵亡!');
}
function gameOver(r) {
  state = 'gameover';
  document.getElementById('go-wave').textContent = wave;
  document.getElementById('go-kills').textContent = kills;
  document.getElementById('go-reason').textContent = r;
  document.getElementById('gameover').classList.add('show');
}
function showToast(t) { var e = document.getElementById('toast'); e.textContent = t; e.style.display = 'block'; setTimeout(function() { e.style.display = 'none'; }, 1500); }

// UI更新
function updateUI() {
  document.getElementById('lv').textContent = hero.lv;
  document.getElementById('side-lv').textContent = hero.lv;
  document.getElementById('gold').textContent = gold;
  document.getElementById('wave').textContent = wave;
  document.getElementById('kills').textContent = kills;
  document.getElementById('enemies').textContent = enemies.length;
  document.getElementById('enemies').style.color = enemies.length > 80 ? '#f44336' : enemies.length > 60 ? '#ff9800' : '#ffd700';
  var hd = getHeroData();
  document.getElementById('class-skin').textContent = hd.skin;
  document.getElementById('class-name').textContent = hd.name;
  document.getElementById('hp-bar').style.width = (hero.hp/hero.maxHp*100)+'%';
  document.getElementById('mp-bar').style.width = (hero.mp/hero.maxMp*100)+'%';
  document.getElementById('exp-bar').style.width = (hero.exp/hero.expNeed*100)+'%';
  document.getElementById('move-cd').textContent = moveCd > 0 ? Math.ceil(moveCd)+'s' : '';
  updateSkUI();
}
function updateSkUI() {
  var costs = [12, 8, 25];
  for (var i = 0; i < 3; i++) {
    var btn = document.querySelector('[data-skill="'+i+'"]');
    var sk = hero.skills[i];
    btn.querySelector('.ic').textContent = sk.ic;
    btn.querySelector('.nm').textContent = sk.name;
    var old = btn.querySelector('.cd'); if (old) old.remove();
    if (sk.cd > 0) {
      btn.classList.add('off'); btn.classList.remove('on');
      var d = document.createElement('div'); d.className = 'cd'; d.textContent = Math.ceil(sk.cd); btn.appendChild(d);
    } else if (hero.mp < costs[i]) { btn.classList.add('off'); btn.classList.remove('on'); }
    else { btn.classList.remove('off'); btn.classList.add('on'); }
  }
}

// 绘制
function drawMap() {
  var bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#1a2a1a'); bg.addColorStop(1, '#0d1b0d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  // 路线
  drawPath(PATHS.outer, 'rgba(100,70,40,0.5)', 30);
  drawPath(PATHS.inner, 'rgba(80,80,120,0.4)', 24);
  // 塔位
  for (var i = 0; i < TOWERS.length; i++) {
    var t = TOWERS[i];
    var tx = t.x*W, ty = t.y*H;
    var active = hero.towerIdx === i;
    ctx.strokeStyle = active ? '#ffd700' : 'rgba(150,150,150,0.5)';
    ctx.lineWidth = active ? 3 : 2;
    ctx.beginPath(); ctx.arc(tx, ty, 25, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = active ? 'rgba(74,144,217,0.2)' : 'rgba(50,50,50,0.2)';
    ctx.fill();
    ctx.fillStyle = active ? '#ffd700' : 'rgba(255,255,255,0.4)';
    ctx.font = (active ? 'bold ' : '') + '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText((active?'📍':'') + t.name, tx, ty+38);
  }
}
function drawPath(path, col, w) {
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(path[0].x*W, path[0].y*H);
  for (var i = 1; i < path.length; i++) ctx.lineTo(path[i].x*W, path[i].y*H);
  ctx.closePath(); ctx.stroke();
}
// 卡通英雄绘制函数
function drawHero() {
  var hp = getHeroPos();
  var hd = getHeroData();
  var x = hp.x, y = hp.y;
  var sz = 28; // 英雄大小
  
  // 攻击范围
  ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
  ctx.setLineDash([5,5]); ctx.beginPath(); ctx.arc(x, y, hd.range*Math.min(W,H), 0, Math.PI*2); ctx.stroke();
  ctx.setLineDash([]); ctx.restore();
  
  // 光环效果
  ctx.save(); ctx.globalAlpha = 0.12 + Math.sin(Date.now()/500)*0.05;
  var gl = ctx.createRadialGradient(x, y, 0, x, y, 40);
  gl.addColorStop(0, hd.color); gl.addColorStop(1, 'transparent');
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, 40, 0, Math.PI*2); ctx.fill();
  ctx.restore();
  
  // 影子
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(x, y+sz*0.9, sz*0.7, sz*0.2, 0, 0, Math.PI*2); ctx.fill();
  
  // 身体(圆润)
  var bodyGrad = ctx.createRadialGradient(x-5, y-8, 5, x, y, sz);
  bodyGrad.addColorStop(0, lighten(hd.color, 40));
  bodyGrad.addColorStop(0.5, hd.color);
  bodyGrad.addColorStop(1, shade(hd.color, -30));
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(x, y, sz, 0, Math.PI*2);
  ctx.fill();
  
  // 边框发光
  ctx.shadowColor = hd.color; ctx.shadowBlur = 15;
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
  ctx.stroke(); ctx.shadowBlur = 0;
  
  // 脸部底色(浅色圆形)
  ctx.fillStyle = '#ffe0b2';
  ctx.beginPath();
  ctx.arc(x, y-2, sz*0.55, 0, Math.PI*2);
  ctx.fill();
  
  // 眼睛(大眼睛卡通风格)
  var eyeY = y - 5;
  var eyeX = 8;
  // 眼白
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(x-eyeX, eyeY, 7, 8, 0, 0, Math.PI*2);
  ctx.ellipse(x+eyeX, eyeY, 7, 8, 0, 0, Math.PI*2);
  ctx.fill();
  // 瞄孔
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.arc(x-eyeX+1, eyeY+1, 4, 0, Math.PI*2);
  ctx.arc(x+eyeX+1, eyeY+1, 4, 0, Math.PI*2);
  ctx.fill();
  // 高光
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x-eyeX-1, eyeY-2, 2, 0, Math.PI*2);
  ctx.arc(x+eyeX-1, eyeY-2, 2, 0, Math.PI*2);
  ctx.fill();
  
  // 嘴巴(微笑)
  ctx.strokeStyle = '#d32f2f'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(x, y+5, 6, 0.1*Math.PI, 0.9*Math.PI);
  ctx.stroke();
  
  // 腮红
  ctx.fillStyle = 'rgba(255,150,150,0.4)';
  ctx.beginPath();
  ctx.ellipse(x-12, y+2, 5, 3, 0, 0, Math.PI*2);
  ctx.ellipse(x+12, y+2, 5, 3, 0, 0, Math.PI*2);
  ctx.fill();
  
  // 根据职业添加特征
  if (hd.type === 'str') {
    // 力量型: 头盔/角
    ctx.fillStyle = shade(hd.color, -20);
    ctx.beginPath();
    ctx.moveTo(x-sz*0.6, y-sz*0.7);
    ctx.lineTo(x-sz*0.3, y-sz*1.3);
    ctx.lineTo(x, y-sz*0.8);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x+sz*0.6, y-sz*0.7);
    ctx.lineTo(x+sz*0.3, y-sz*1.3);
    ctx.lineTo(x, y-sz*0.8);
    ctx.fill();
    // 武器标记
    ctx.font = '14px Arial'; ctx.textAlign = 'center';
    ctx.fillText('⚔️', x+sz*0.8, y-sz*0.3);
  } else if (hd.type === 'agi') {
    // 敏捷型: 尖耳朵
    ctx.fillStyle = '#ffe0b2';
    ctx.beginPath();
    ctx.moveTo(x-sz*0.8, y-5);
    ctx.lineTo(x-sz*1.2, y-15);
    ctx.lineTo(x-sz*0.6, y+2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x+sz*0.8, y-5);
    ctx.lineTo(x+sz*1.2, y-15);
    ctx.lineTo(x+sz*0.6, y+2);
    ctx.fill();
    // 武器标记
    ctx.font = '14px Arial'; ctx.textAlign = 'center';
    ctx.fillText('🏹', x+sz*0.8, y-sz*0.3);
  } else {
    // 智力型: 帽子
    ctx.fillStyle = hd.color;
    ctx.beginPath();
    ctx.moveTo(x, y-sz*1.5);
    ctx.lineTo(x-sz*0.7, y-sz*0.6);
    ctx.lineTo(x+sz*0.7, y-sz*0.6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2;
    ctx.stroke();
    // 帽檐
    ctx.fillStyle = shade(hd.color, -20);
    ctx.beginPath();
    ctx.ellipse(x, y-sz*0.6, sz*0.8, sz*0.15, 0, 0, Math.PI*2);
    ctx.fill();
    // 武器标记
    ctx.font = '14px Arial'; ctx.textAlign = 'center';
    ctx.fillText('🔮', x+sz*0.8, y-sz*0.3);
  }
  
  // 名字
  ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
  ctx.fillStyle = hd.color;
  ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
  ctx.strokeText(hd.name+' Lv.'+hero.lv, x, y+sz+18);
  ctx.fillText(hd.name+' Lv.'+hero.lv, x, y+sz+18);
  
  // 血条
  var bw = 50, bh = 6;
  var bx = x-bw/2, by = y-sz-20;
  ctx.fillStyle = '#222'; ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = hero.hp > hero.maxHp*0.5 ? '#4caf50' : '#f44336';
  ctx.fillRect(bx, by, bw*(hero.hp/hero.maxHp), bh);
  ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw, bh);
  
  // 蓝条
  ctx.fillStyle = '#1a1a3a'; ctx.fillRect(bx, by+bh+2, bw, 4);
  ctx.fillStyle = '#2196f3'; ctx.fillRect(bx, by+bh+2, bw*(hero.mp/hero.maxMp), 4);
}

// 颜色变亮函数
function lighten(c, p) { return shade(c, Math.abs(p)); }

// 主循环
function update() {
  if (state !== 'playing') return;
  if (moveCd > 0) moveCd -= 0.016;
  if (hero.hp > 0) autoAtk();
  if (hero.mp < hero.maxMp) hero.mp += 0.06;
  for (var i = 0; i < hero.skills.length; i++) if (hero.skills[i].cd > 0) hero.skills[i].cd -= 0.016;
  for (var i = enemies.length-1; i >= 0; i--) {
    enemies[i].update();
    if (enemies[i].hp <= 0) {
      kills++; gold += enemies[i].boss ? 60 : 8;
      gainExp(enemies[i].exp);
      playSound('kill');
      addP(enemies[i].x*W, enemies[i].y*H, '+'+enemies[i].exp+'EXP', '#4fc3f7', 11);
      enemies.splice(i, 1);
    }
  }
  for (var i = particles.length-1; i >= 0; i--) if (!particles[i].update()) particles.splice(i, 1);
  if (dungeonActive) { dungeonTimer -= 0.016; if (dungeonTimer <= 0) failDungeon(); }
  waveT -= 0.016;
  if (waveT <= 0) { wave++; waveT = C.WAVE_CD + wave; spawnWave(); }
  if (shake > 0) shake *= 0.85; if (shake < 0.5) shake = 0;
  checkEnd(); updateUI();
}
function draw() {
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  if (shake > 0) ctx.translate((Math.random()-0.5)*shake, (Math.random()-0.5)*shake);
  drawMap();
  for (var i = 0; i < enemies.length; i++) enemies[i].draw();
  if (dungeonEnemy) dungeonEnemy.draw();
  drawHero();
  for (var i = 0; i < particles.length; i++) particles[i].draw();
  ctx.restore();
}
function loop() { update(); draw(); requestAnimationFrame(loop); }

// 初始化
function init() {
  canvas = document.getElementById('game');
  ctx = canvas.getContext('2d');
  var app = document.getElementById('app');
  W = canvas.width = app.clientWidth;
  H = canvas.height = app.clientHeight;
  initLayout();
  initAudio();
  requestAnimationFrame(loop);
  setupEvents();
  // 首次点击初始化音频
  document.addEventListener('click', function() { initAudio(); }, {once: true});
  document.addEventListener('touchstart', function() { initAudio(); }, {once: true});
}

function setupEvents() {
  // 技能按钮
  var sks = document.querySelectorAll('.sk');
  for (var i = 0; i < sks.length; i++) {
    (function(btn) {
      var fn = function(e) { e.preventDefault(); if (state === 'playing') useSkill(parseInt(btn.dataset.skill)); };
      btn.addEventListener('touchstart', fn);
      btn.addEventListener('click', fn);
    })(sks[i]);
  }
  // 点击塔位移动
  canvas.addEventListener('click', function(e) {
    if (state !== 'playing' || moveCd > 0) return;
    var rect = canvas.getBoundingClientRect();
    var x = (e.clientX - rect.left) * (W / rect.width);
    var y = (e.clientY - rect.top) * (H / rect.height);
    for (var i = 0; i < TOWERS.length; i++) {
      var t = TOWERS[i];
      var tx = t.x*W, ty = t.y*H;
      if (dist(x, y, tx, ty) < 35) {
        if (hero.towerIdx !== i) { hero.towerIdx = i; moveCd = 3; addP(tx, ty-30, '移动!', '#fff', 14); playSound('move'); }
        return;
      }
    }
  });
  // 副本按钮
  document.getElementById('btn-dungeon').addEventListener('click', function() {
    if (!dungeonActive) showDungeonMenu(); else showToast('已在副本中!');
  });
  document.getElementById('btn-lvl').addEventListener('click', showLevelSelect);
  document.getElementById('btn-close-dungeon').addEventListener('click', function() {
    document.getElementById('dungeon-modal').classList.remove('show'); state = 'playing';
  });
}

// 启动
window.onload = init;
