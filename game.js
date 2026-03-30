/**
 * 魔兽RPG塔防 - 英雄之路
 * 腾讯级品质小游戏 - 修复版
 */

// ====== 游戏配置 ======
const CONFIG = {
  CANVAS_W: 400,
  CANVAS_H: 600,
  TOWER_COUNT: 5,
  WAVE_INTERVAL: 25,
  AUTO_ATK_INTERVAL: 0.8,
  MAX_ENEMIES: 200  // 失败条件：超过200敌人
};

// ====== 游戏状态 ======
let canvas, ctx;
let gameState = 'playing';
let gold = 50;
let wave = 1;
let waveTimer = 5;  // 第一波更快
let kills = 0;
let screenShake = 0;
let selectedTower = null;
let selectedHero = 0;
let lastTime = 0;

// ====== 职业系统 ======
const CLASSES = {
  warrior: { name: '战士', icon: '⚔️', color: '#4a90d9' },
  archer: { name: '弓手', icon: '🏹', color: '#4caf50' },
  blademaster: { name: '剑圣', icon: '⚡', color: '#66ccff' },
  mountainking: { name: '山丘', icon: '🛡️', color: '#ffd700' },
  bloodmage: { name: '血法', icon: '🔥', color: '#ff4444' },
  windrunner: { name: '风行', icon: '💨', color: '#00e676' },
  shadowhunter: { name: '暗猎', icon: '🌑', color: '#9c27b0' },
  keeper: { name: '守护', icon: '🌿', color: '#795548' }
};

// ====== 塔位系统 ======
const TOWER_POSITIONS = [
  { x: 80, y: 180, level: 1 },
  { x: 320, y: 180, level: 1 },
  { x: 80, y: 340, level: 1 },
  { x: 320, y: 340, level: 1 },
  { x: 200, y: 460, level: 1 }
];

// ====== 路线系统 ======
const PATHS = [
  // 路线1: 左侧
  [{x:0,y:80},{x:80,y:80},{x:80,y:160},{x:50,y:220},{x:80,y:280},{x:80,y:340},{x:50,y:400},{x:80,y:460},{x:120,y:520},{x:200,y:560},{x:200,y:620}],
  // 路线2: 右侧
  [{x:400,y:80},{x:320,y:80},{x:320,y:160},{x:350,y:220},{x:320,y:280},{x:320,y:340},{x:350,y:400},{x:320,y:460},{x:280,y:520},{x:200,y:560},{x:200,y:620}],
  // 路线3: 中间(Boss)
  [{x:200,y:0},{x:200,y:100},{x:200,y:200},{x:200,y:300},{x:200,y:400},{x:200,y:500},{x:200,y:620}]
];

// ====== 数组 ======
let heroes = [];
let enemies = [];
let particles = [];

// ====== 英雄类 ======
class Hero {
  constructor(classType, towerIdx) {
    this.classType = classType;
    this.towerIdx = towerIdx;
    this.level = 1;
    this.exp = 0;
    this.expNeed = 100;
    this.hp = 100;
    this.maxHp = 100;
    this.mp = 50;
    this.maxMp = 50;
    this.atk = 20;
    this.def = 5;
    this.atkRange = 120;
    this.atkTimer = 0;
    this.skills = [
      { name: '攻击', cd: 0, maxCd: 0.5, dmg: 1.0, icon: '⚔️' },
      { name: '旋风', cd: 0, maxCd: 4, dmg: 2.0, icon: '🌀' },
      { name: '治疗', cd: 0, maxCd: 8, heal: 40, icon: '💚' },
      { name: '大招', cd: 0, maxCd: 20, dmg: 5.0, icon: '⚡' }
    ];
    this.promotionLevel = 0;
    this.buff = 1.0;
  }
  
  getPos() {
    return { x: TOWER_POSITIONS[this.towerIdx].x, y: TOWER_POSITIONS[this.towerIdx].y };
  }
  
  gainExp(amt) {
    this.exp += amt;
    while (this.exp >= this.expNeed) {
      this.exp -= this.expNeed;
      this.levelUp();
    }
  }
  
  levelUp() {
    this.level++;
    this.expNeed = Math.floor(100 * Math.pow(this.level, 1.15));
    this.maxHp += 25;
    this.hp = this.maxHp;
    this.maxMp += 12;
    this.mp = this.maxMp;
    this.atk += 4;
    this.def += 2;
    
    const pos = this.getPos();
    addParticle(pos.x, pos.y - 35, 'LEVEL UP!', '#ffd700', 18);
    
    // 解锁新英雄槽
    checkHeroSlots();
    
    // 转职提示
    if (this.level === 10 && this.promotionLevel === 0) {
      showPromotionOptions(this);
    }
  }
  
  autoAttack() {
    this.atkTimer += 0.016;
    const atkSpeed = 0.7;
    if (this.atkTimer < atkSpeed) return;
    this.atkTimer = 0;
    
    const pos = this.getPos();
    let nearest = null, minDist = Infinity;
    
    for (const e of enemies) {
      const dist = Math.hypot(e.x - pos.x, e.y - pos.y);
      if (dist < this.atkRange && dist < minDist) {
        minDist = dist;
        nearest = e;
      }
    }
    
    if (nearest) {
      const dmg = Math.max(1, Math.floor(this.atk * this.buff - nearest.def));
      nearest.hp -= dmg;
      addParticle(nearest.x, nearest.y - 15, '-' + dmg, CLASSES[this.classType].color, 12);
    }
  }
  
  useSkill(idx) {
    const skill = this.skills[idx];
    const costs = [5, 15, 10, 30];
    if (skill.cd > 0 || this.mp < costs[idx]) return;
    
    skill.cd = skill.maxCd;
    this.mp -= costs[idx];
    
    const pos = this.getPos();
    
    if (idx === 0) {
      // Q: 单体攻击
      let target = findNearest(pos, this.atkRange * 1.5);
      if (target) {
        const dmg = Math.max(1, Math.floor(this.atk * 1.5 * this.buff - target.def));
        target.hp -= dmg;
        addParticle(target.x, target.y - 15, '-' + dmg, '#ff6f00', 14);
      }
    } else if (idx === 1) {
      // W: 范围攻击
      for (const e of enemies) {
        if (Math.hypot(e.x - pos.x, e.y - pos.y) < 100) {
          const dmg = Math.max(1, Math.floor(this.atk * 2 * this.buff - e.def));
          e.hp -= dmg;
          addParticle(e.x, e.y - 15, '-' + dmg, '#4fc3f7', 14);
        }
      }
      screenShake = 5;
    } else if (idx === 2) {
      // E: 治疗
      this.hp = Math.min(this.maxHp, this.hp + skill.heal);
      addParticle(pos.x, pos.y - 25, '+' + skill.heal, '#4caf50', 14);
    } else if (idx === 3) {
      // R: 大招
      for (const e of enemies) {
        const dmg = Math.max(1, Math.floor(this.atk * 5 * this.buff - e.def));
        e.hp -= dmg;
        addParticle(e.x, e.y - 15, '-' + dmg, '#ffd700', 16);
      }
      screenShake = 10;
      addParticle(pos.x, pos.y - 40, '大招!', '#ffd700', 24);
    }
    
    updateSkillUI();
  }
  
  update() {
    if (this.mp < this.maxMp) this.mp += 0.06;
    for (const s of this.skills) if (s.cd > 0) s.cd -= 0.016;
  }
  
  draw() {
    const pos = this.getPos();
    const cls = CLASSES[this.classType];
    
    // 攻击范围
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, this.atkRange, 0, Math.PI * 2);
    ctx.stroke();
    
    // 英雄身体 - 圆形渐变
    const grad = ctx.createRadialGradient(pos.x - 5, pos.y - 5, 2, pos.x, pos.y, 22);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.3, cls.color);
    grad.addColorStop(1, shadeColor(cls.color, -40));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 22, 0, Math.PI * 2);
    ctx.fill();
    
    // 边框发光
    ctx.shadowColor = cls.color;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // 职业图标
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(cls.icon, pos.x, pos.y);
    
    // 等级
    ctx.font = 'bold 11px Arial';
    ctx.fillStyle = '#ffd700';
    ctx.fillText('Lv' + this.level, pos.x, pos.y + 32);
    
    // 血条
    if (this.hp < this.maxHp) {
      const w = 40;
      ctx.fillStyle = '#333';
      ctx.fillRect(pos.x - w/2, pos.y - 32, w, 5);
      ctx.fillStyle = this.hp > this.maxHp * 0.5 ? '#4caf50' : '#f44336';
      ctx.fillRect(pos.x - w/2, pos.y - 32, w * (this.hp / this.maxHp), 5);
    }
    
    // 蓝条
    const mw = 40;
    ctx.fillStyle = '#222';
    ctx.fillRect(pos.x - mw/2, pos.y - 26, mw, 3);
    ctx.fillStyle = '#2196f3';
    ctx.fillRect(pos.x - mw/2, pos.y - 26, mw * (this.mp / this.maxMp), 3);
  }
}

// ====== 敌人类 ======
class Enemy {
  constructor(type, pathIdx, isBoss) {
    this.type = type;
    this.pathIdx = pathIdx;
    this.waypoint = 0;
    this.isBoss = isBoss;
    
    const path = PATHS[pathIdx];
    this.x = path[0].x;
    this.y = path[0].y;
    
    const wm = 1 + wave * 0.12;
    if (isBoss) {
      this.hp = Math.floor((500 + wave * 150) * wm);
      this.atk = 30 + wave * 5;
      this.def = 15 + wave * 2;
      this.speed = 0.7;
      this.exp = 150 + wave * 40;
      this.size = 35;
      this.color = '#ffd600';
      this.name = 'BOSS';
    } else if (type === 'fast') {
      this.hp = Math.floor((40 + wave * 12) * wm);
      this.atk = 8 + wave * 2;
      this.def = 3 + wave;
      this.speed = 2.2;
      this.exp = 20 + wave * 6;
      this.size = 14;
      this.color = '#00bcd4';
      this.name = '快';
    } else {
      this.hp = Math.floor((70 + wave * 18) * wm);
      this.atk = 10 + wave * 3;
      this.def = 5 + wave;
      this.speed = 1.0;
      this.exp = 30 + wave * 10;
      this.size = 18;
      this.color = '#66bb6a';
      this.name = '怪';
    }
    this.maxHp = this.hp;
  }
  
  update() {
    const path = PATHS[this.pathIdx];
    if (this.waypoint >= path.length) return false; // 到达终点
    
    const target = path[this.waypoint];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist < this.speed + 3) {
      this.waypoint++;
    } else {
      this.x += (dx / dist) * this.speed;
      this.y += (dy / dist) * this.speed;
    }
    
    return true;
  }
  
  draw() {
    // 影子
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + this.size * 0.7, this.size * 0.8, this.size * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 身体渐变
    const grad = ctx.createRadialGradient(this.x - 3, this.y - 3, 2, this.x, this.y, this.size);
    grad.addColorStop(0, lightenColor(this.color, 30));
    grad.addColorStop(0.5, this.color);
    grad.addColorStop(1, shadeColor(this.color, -30));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    
    // Boss光环
    if (this.isBoss) {
      ctx.save();
      ctx.globalAlpha = 0.4 + Math.sin(Date.now() / 150) * 0.2;
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    
    // 眼睛
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x - this.size * 0.3, this.y - this.size * 0.15, this.size * 0.2, 0, Math.PI * 2);
    ctx.arc(this.x + this.size * 0.3, this.y - this.size * 0.15, this.size * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(this.x - this.size * 0.3, this.y - this.size * 0.15, this.size * 0.1, 0, Math.PI * 2);
    ctx.arc(this.x + this.size * 0.3, this.y - this.size * 0.15, this.size * 0.1, 0, Math.PI * 2);
    ctx.fill();
    
    // 血条
    const bw = this.size * 2;
    ctx.fillStyle = '#222';
    ctx.fillRect(this.x - bw/2, this.y - this.size - 10, bw, 5);
    const hpRatio = this.hp / this.maxHp;
    ctx.fillStyle = hpRatio > 0.5 ? '#4caf50' : hpRatio > 0.25 ? '#ff9800' : '#f44336';
    ctx.fillRect(this.x - bw/2, this.y - this.size - 10, bw * hpRatio, 5);
    
    // Boss名字
    if (this.isBoss) {
      ctx.fillStyle = '#ff4444';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('BOSS', this.x, this.y - this.size - 15);
    }
  }
}

// ====== 粒子类 ======
class Particle {
  constructor(x, y, text, color, size) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.size = size || 14;
    this.vy = -2;
    this.vx = (Math.random() - 0.5) * 2;
    this.alpha = 1;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.08;
    this.alpha -= 0.025;
    return this.alpha > 0;
  }
  draw() {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.font = `bold ${this.size}px Arial`;
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText(this.text, this.x, this.y);
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

function addParticle(x, y, text, color, size) {
  particles.push(new Particle(x, y, text, color, size));
}

// ====== 工具函数 ======
function shadeColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0xFF) + amt));
  const B = Math.max(0, Math.min(255, (num & 0xFF) + amt));
  return '#' + ((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1);
}

function lightenColor(color, percent) {
  return shadeColor(color, percent);
}

function findNearest(pos, range) {
  let nearest = null, minDist = Infinity;
  for (const e of enemies) {
    const dist = Math.hypot(e.x - pos.x, e.y - pos.y);
    if (dist < range && dist < minDist) {
      minDist = dist;
      nearest = e;
    }
  }
  return nearest;
}

// ====== 转职系统 ======
function showPromotionOptions(hero) {
  const modal = document.getElementById('class-modal');
  const options = document.getElementById('class-options');
  options.innerHTML = '';
  
  // 自动转职
  const autoCard = document.createElement('div');
  autoCard.className = 'class-card auto';
  autoCard.innerHTML = `<div class="icon">🎲</div><div class="name">自动转职</div><div class="bonus">+20% 属性</div><div class="desc">随机职业<br>惊喜或惊吓!</div>`;
  autoCard.onclick = () => {
    const classes = ['blademaster', 'mountainking', 'bloodmage', 'windrunner'];
    const random = classes[Math.floor(Math.random() * classes.length)];
    hero.classType = random;
    hero.buff *= 1.2;
    hero.atk = Math.floor(hero.atk * 1.2);
    hero.def = Math.floor(hero.def * 1.2);
    hero.maxHp = Math.floor(hero.maxHp * 1.2);
    hero.promotionLevel++;
    modal.classList.remove('show');
    gameState = 'playing';
    addParticle(hero.getPos().x, hero.getPos().y - 40, '转职:' + CLASSES[random].name, '#ffd700', 20);
  };
  options.appendChild(autoCard);
  
  // 手动选择
  const classes = [
    { key: 'blademaster', desc: '高攻速近战' },
    { key: 'mountainking', desc: '高防御坦克' },
    { key: 'bloodmage', desc: '法术伤害' },
    { key: 'windrunner', desc: '远程输出' }
  ];
  
  for (const c of classes) {
    const cls = CLASSES[c.key];
    const card = document.createElement('div');
    card.className = 'class-card';
    card.style.borderColor = cls.color;
    card.innerHTML = `<div class="icon">${cls.icon}</div><div class="name">${cls.name}</div><div class="bonus">+10% 属性</div><div class="desc">${c.desc}</div>`;
    card.onclick = () => {
      hero.classType = c.key;
      hero.buff *= 1.1;
      hero.atk = Math.floor(hero.atk * 1.1);
      hero.def = Math.floor(hero.def * 1.1);
      hero.maxHp = Math.floor(hero.maxHp * 1.1);
      hero.promotionLevel++;
      modal.classList.remove('show');
      gameState = 'playing';
      addParticle(hero.getPos().x, hero.getPos().y - 40, '转职:' + cls.name, '#ffd700', 20);
    };
    options.appendChild(card);
  }
  
  modal.classList.add('show');
  gameState = 'paused';
}

// ====== 英雄槽位 ======
function checkHeroSlots() {
  const slots = document.querySelectorAll('.hero-slot');
  const lvl = heroes.length > 0 ? Math.max(...heroes.map(h => h.level)) : 1;
  const unlockLevels = [1, 5, 10, 20, 30];
  
  for (let i = 0; i < slots.length; i++) {
    if (i < heroes.length) {
      slots[i].classList.remove('locked');
      slots[i].classList.add('occupied');
      slots[i].innerHTML = CLASSES[heroes[i].classType].icon;
    } else if (lvl >= unlockLevels[i]) {
      slots[i].classList.remove('locked');
      slots[i].innerHTML = '➕';
    }
  }
}

function addHero(classType) {
  if (heroes.length >= 5) return;
  let towerIdx = -1;
  const occupied = heroes.map(h => h.towerIdx);
  for (let i = 0; i < 5; i++) {
    if (!occupied.includes(i)) { towerIdx = i; break; }
  }
  if (towerIdx === -1) return;
  heroes.push(new Hero(classType, towerIdx));
  checkHeroSlots();
}

// ====== 波次系统 ======
function spawnWave() {
  const count = 5 + Math.floor(wave * 1.5);
  const hasBoss = wave % 5 === 0;
  
  const alert = document.getElementById('wave-alert');
  const text = document.getElementById('wave-text');
  const sub = document.getElementById('wave-sub');
  
  if (hasBoss) {
    alert.classList.add('boss');
    text.textContent = '⚠️ BOSS WAVE ⚠️';
    sub.textContent = '强大的敌人来袭!';
  } else {
    alert.classList.remove('boss');
    text.textContent = `WAVE ${wave}`;
    sub.textContent = `${count} 敌人来袭!`;
  }
  alert.style.display = 'block';
  setTimeout(() => alert.style.display = 'none', 2000);
  
  let spawned = 0;
  const interval = setInterval(() => {
    if (spawned >= count || gameState === 'gameover') {
      clearInterval(interval);
      return;
    }
    
    if (hasBoss && spawned === 0) {
      enemies.push(new Enemy('normal', 2, true));
    } else {
      const pathIdx = Math.random() < 0.5 ? 0 : 1;
      const type = wave > 3 && Math.random() < 0.25 ? 'fast' : 'normal';
      enemies.push(new Enemy(type, pathIdx, false));
    }
    spawned++;
  }, 600);
}

// ====== 失败检查 ======
function checkGameOver() {
  // 条件1: 敌人超过200
  if (enemies.length >= CONFIG.MAX_ENEMIES) {
    gameOver('敌人太多了! (超过200)');
    return;
  }
  // 条件2: 所有英雄死亡
  if (heroes.length > 0 && heroes.every(h => h.hp <= 0)) {
    gameOver('所有英雄阵亡!');
    return;
  }
}

function gameOver(reason) {
  gameState = 'gameover';
  document.getElementById('final-wave').textContent = wave;
  document.getElementById('final-kills').textContent = kills;
  document.getElementById('final-reason').textContent = reason;
  document.getElementById('game-over').style.display = 'block';
}

// ====== UI更新 ======
function updateUI() {
  document.getElementById('hero-level').textContent = heroes.length > 0 ? Math.max(...heroes.map(h => h.level)) : 1;
  document.getElementById('gold').textContent = gold;
  document.getElementById('wave').textContent = wave;
  document.getElementById('kills').textContent = kills;
  document.getElementById('enemy-count').textContent = enemies.length;
  
  // 敌人数量警告
  const ec = document.getElementById('enemy-count');
  if (enemies.length > 150) ec.style.color = '#ff4444';
  else if (enemies.length > 100) ec.style.color = '#ff9800';
  else ec.style.color = '#ffd700';
  
  updateSkillUI();
}

function updateSkillUI() {
  if (heroes.length === 0) return;
  const hero = heroes[selectedHero];
  
  for (let i = 0; i < 4; i++) {
    const btn = document.querySelector(`[data-skill="${i}"]`);
    const skill = hero.skills[i];
    const costs = [5, 15, 10, 30];
    
    btn.querySelector('.icon').textContent = skill.icon;
    btn.querySelector('.name').textContent = skill.name;
    
    // 移除旧的CD覆盖
    const old = btn.querySelector('.cd-overlay');
    if (old) old.remove();
    
    if (skill.cd > 0) {
      btn.classList.add('cooldown');
      btn.classList.remove('ready');
      const div = document.createElement('div');
      div.className = 'cd-overlay';
      div.textContent = Math.ceil(skill.cd);
      btn.appendChild(div);
    } else if (hero.mp < costs[i]) {
      btn.classList.add('cooldown');
      btn.classList.remove('ready');
    } else {
      btn.classList.remove('cooldown');
      btn.classList.add('ready');
    }
  }
  
  // 升级按钮
  if (selectedTower !== null) {
    const costs = [100, 300, 800];
    const cost = costs[TOWER_POSITIONS[selectedTower].level - 1];
    const btn = document.getElementById('upgrade-tower');
    if (cost && TOWER_POSITIONS[selectedTower].level < 4) {
      btn.textContent = `升级塔位 💰${cost}`;
      btn.style.display = gold >= cost ? 'block' : 'none';
    } else {
      btn.style.display = 'none';
    }
  } else {
    document.getElementById('upgrade-tower').style.display = 'none';
  }
}

// ====== 渲染 ======
function drawMap() {
  // 背景
  const bg = ctx.createLinearGradient(0, 0, 0, CONFIG.CANVAS_H);
  bg.addColorStop(0, '#1a2a1a');
  bg.addColorStop(1, '#0d1b0d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
  
  // 草地纹理
  ctx.fillStyle = 'rgba(34,139,34,0.08)';
  for (let i = 0; i < 60; i++) {
    ctx.beginPath();
    ctx.arc((i * 73) % CONFIG.CANVAS_W, (i * 97) % CONFIG.CANVAS_H, 8 + (i % 15), 0, Math.PI * 2);
    ctx.fill();
  }
  
  // 绘制路线
  const pathColors = ['rgba(139,90,43,0.5)', 'rgba(139,90,43,0.5)', 'rgba(178,34,34,0.5)'];
  for (let p = 0; p < PATHS.length; p++) {
    const path = PATHS[p];
    
    // 路面
    ctx.strokeStyle = pathColors[p];
    ctx.lineWidth = 36;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
    ctx.stroke();
    
    // 路线边框
    ctx.strokeStyle = 'rgba(80,60,40,0.6)';
    ctx.lineWidth = 40;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
    ctx.stroke();
    
    // 路面内部
    ctx.strokeStyle = pathColors[p];
    ctx.lineWidth = 32;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
    ctx.stroke();
    
    // 虚线
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  
  // 绘制塔位
  for (let i = 0; i < TOWER_POSITIONS.length; i++) {
    const t = TOWER_POSITIONS[i];
    const hasHero = heroes.some(h => h.towerIdx === i);
    const selected = selectedTower === i;
    
    // 底座光晕
    if (hasHero) {
      ctx.fillStyle = 'rgba(74,144,217,0.15)';
      ctx.beginPath();
      ctx.arc(t.x, t.y, 35, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // 塔位圆环
    ctx.strokeStyle = selected ? '#ffd700' : (hasHero ? '#4a90d9' : 'rgba(100,100,100,0.5)');
    ctx.lineWidth = selected ? 3 : 2;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 28, 0, Math.PI * 2);
    ctx.stroke();
    
    // 填充
    ctx.fillStyle = hasHero ? 'rgba(74,144,217,0.2)' : 'rgba(50,50,50,0.3)';
    ctx.fill();
    
    // 塔位等级
    if (t.level > 1) {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('★'.repeat(t.level - 1), t.x, t.y + 40);
    }
    
    // 空塔位加号
    if (!hasHero) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '22px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', t.x, t.y);
    }
  }
}

// ====== 主循环 ======
function update() {
  if (gameState !== 'playing') return;
  
  // 更新英雄
  for (const hero of heroes) {
    hero.update();
    if (hero.hp > 0) hero.autoAttack();
  }
  
  // 更新敌人
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (!enemies[i].update()) {
      if (enemies[i].waypoint >= PATHS[enemies[i].pathIdx].length) {
        // 敌人到达终点
        enemies.splice(i, 1);
      }
    } else if (enemies[i].hp <= 0) {
      // 敌人死亡
      kills++;
      gold += enemies[i].isBoss ? 50 : 10;
      for (const h of heroes) h.gainExp(enemies[i].exp);
      addParticle(enemies[i].x, enemies[i].y, '+' + enemies[i].exp + 'EXP', '#4fc3f7', 12);
      enemies.splice(i, 1);
    }
  }
  
  // 更新粒子
  for (let i = particles.length - 1; i >= 0; i--) {
    if (!particles[i].update()) particles.splice(i, 1);
  }
  
  // 波次计时
  waveTimer -= 0.016;
  if (waveTimer <= 0) {
    wave++;
    waveTimer = CONFIG.WAVE_INTERVAL + wave * 1.5;
    spawnWave();
  }
  
  // 屏幕震动衰减
  if (screenShake > 0) screenShake *= 0.85;
  if (screenShake < 0.5) screenShake = 0;
  
  // 失败检查
  checkGameOver();
  
  updateUI();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  ctx.save();
  if (screenShake > 0) {
    ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
  }
  
  drawMap();
  
  // 绘制敌人
  for (const e of enemies) e.draw();
  
  // 绘制英雄
  for (const h of heroes) h.draw();
  
  // 绘制粒子
  for (const p of particles) p.draw();
  
  ctx.restore();
}

function gameLoop(timestamp) {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// ====== 初始化 ======
function init() {
  canvas = document.getElementById('game');
  ctx = canvas.getContext('2d');
  
  // 正确设置画布尺寸
  canvas.width = CONFIG.CANVAS_W;
  canvas.height = CONFIG.CANVAS_H;
  
  // 添加初始英雄
  addHero('warrior');
  
  // 启动游戏循环
  requestAnimationFrame(gameLoop);
  
  // 事件监听
  setupEvents();
}

function setupEvents() {
  // 技能按钮
  document.querySelectorAll('.skill-btn').forEach(btn => {
    const handler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (heroes.length > 0 && gameState === 'playing') {
        heroes[selectedHero].useSkill(parseInt(btn.dataset.skill));
      }
    };
    btn.addEventListener('touchstart', handler);
    btn.addEventListener('click', handler);
  });
  
  // 画布点击
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    for (let i = 0; i < TOWER_POSITIONS.length; i++) {
      const t = TOWER_POSITIONS[i];
      if (Math.hypot(x - t.x, y - t.y) < 30) {
        selectedTower = i;
        if (!heroes.some(h => h.towerIdx === i) && heroes.length < 5) {
          addHero(heroes.length === 0 ? 'warrior' : 'archer');
        }
        updateUI();
        return;
      }
    }
    selectedTower = null;
    updateUI();
  });
  
  // 英雄槽点击
  document.querySelectorAll('.hero-slot').forEach(slot => {
    slot.addEventListener('click', () => {
      const idx = parseInt(slot.dataset.slot);
      if (!slot.classList.contains('locked') && idx < heroes.length) {
        selectedHero = idx;
        document.querySelectorAll('.hero-slot').forEach(s => s.classList.remove('active'));
        slot.classList.add('active');
      } else if (!slot.classList.contains('locked') && idx === heroes.length && heroes.length < 5) {
        addHero('archer');
      }
    });
  });
  
  // 升级按钮
  document.getElementById('upgrade-tower').addEventListener('click', () => {
    if (selectedTower !== null) {
      const costs = [100, 300, 800];
      const cost = costs[TOWER_POSITIONS[selectedTower].level - 1];
      if (gold >= cost && TOWER_POSITIONS[selectedTower].level < 4) {
        gold -= cost;
        TOWER_POSITIONS[selectedTower].level++;
        const hero = heroes.find(h => h.towerIdx === selectedTower);
        if (hero) {
          hero.atk = Math.floor(hero.atk * 1.2);
          if (TOWER_POSITIONS[selectedTower].level >= 3) hero.atkRange *= 1.15;
        }
        updateUI();
        addParticle(TOWER_POSITIONS[selectedTower].x, TOWER_POSITIONS[selectedTower].y - 40, '塔位升级!', '#ffd700', 18);
      }
    }
  });
}

window.onload = init;
