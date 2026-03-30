/**
 * 魔兽RPG塔防 - 英雄之路
 * 腾讯级品质小游戏
 * 军师开发团队出品
 */

// ====== 游戏配置 ======
const CONFIG = {
  CANVAS_W: 400,
  CANVAS_H: 600,
  TOWER_COUNT: 5,
  WAVE_INTERVAL: 30,
  AUTO_ATK_INTERVAL: 0.8,
  MAX_WAVES: 999
};

// ====== 游戏状态 ======
let canvas, ctx;
let gameState = 'playing';
let gold = 0;
let wave = 1;
let waveTimer = CONFIG.WAVE_INTERVAL;
let kills = 0;
let screenShake = 0;
let selectedTower = null;
let selectedHero = 0;

// ====== 职业系统 ======
const CLASSES = {
  // 基础职业
  warrior: { name: '战士', icon: '⚔️', color: '#4a90d9', type: 'melee' },
  archer: { name: '弓手', icon: '🏹', color: '#4caf50', type: 'ranged' },
  
  // 战士转职
  blademaster: { name: '剑圣', icon: '⚔️', color: '#66ccff', type: 'melee', parent: 'warrior' },
  mountainking: { name: '山丘', icon: '🛡️', color: '#ffd700', type: 'tank', parent: 'warrior' },
  bloodmage: { name: '血法', icon: '🔥', color: '#ff4444', type: 'mage', parent: 'warrior' },
  
  // 弓手转职  
  windrunner: { name: '风行', icon: '💨', color: '#00e676', type: 'ranged', parent: 'archer' },
  shadowhunter: { name: '暗猎', icon: '🌑', color: '#9c27b0', type: 'assassin', parent: 'archer' },
  keeper: { name: '守护', icon: '🌿', color: '#795548', type: 'summoner', parent: 'archer' },
  
  // 终极形态
  swordgod: { name: '剑神', icon: '⚡', color: '#00bcd4', type: 'melee', ultimate: true },
  titan: { name: '泰坦', icon: '🏔️', color: '#ffc107', type: 'tank', ultimate: true },
  inferno: { name: '炎魔', icon: '🌋', color: '#ff5722', type: 'mage', ultimate: true }
};

// ====== 塔位系统 ======
const TOWER_POSITIONS = [
  { x: 80, y: 200, level: 1 },
  { x: 320, y: 200, level: 1 },
  { x: 80, y: 350, level: 1 },
  { x: 320, y: 350, level: 1 },
  { x: 200, y: 480, level: 1 }
];

// ====== 路线系统 (怪物行走路径) ======
const PATHS = [
  // 路线1: 左侧蜿蜒
  [
    {x:0,y:100}, {x:100,y:100}, {x:100,y:180}, {x:60,y:220},
    {x:100,y:280}, {x:100,y:350}, {x:60,y:400}, {x:100,y:450},
    {x:150,y:500}, {x:200,y:550}, {x:200,y:620}
  ],
  // 路线2: 右侧蜿蜒
  [
    {x:400,y:100}, {x:300,y:100}, {x:300,y:180}, {x:340,y:220},
    {x:300,y:280}, {x:300,y:350}, {x:340,y:400}, {x:300,y:450},
    {x:250,y:500}, {x:200,y:550}, {x:200,y:620}
  ],
  // 路线3: 中间直通(Boss)
  [
    {x:200,y:0}, {x:200,y:80}, {x:200,y:160}, {x:200,y:240},
    {x:200,y:320}, {x:200,y:400}, {x:200,y:480}, {x:200,y:560}, {x:200,y:620}
  ]
];

// ====== 英雄系统 ======
let heroes = [];

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
    this.atk = 15;
    this.def = 5;
    this.atkRange = 100;
    this.atkTimer = 0;
    this.atkSpeed = CONFIG.AUTO_ATK_INTERVAL;
    this.skills = this.initSkills();
    this.promotionReady = false;
    this.promotionLevel = 0; // 0=未转职, 1=一转, 2=二转
    this.buffMultiplier = 1.0;
  }
  
  initSkills() {
    const cls = CLASSES[this.classType];
    return [
      { name: '攻击', cd: 0, maxCd: 0.5, dmg: 1.0, icon: '⚔️' },
      { name: '旋风', cd: 0, maxCd: 5, dmg: 2.0, icon: '🌀', range: 80 },
      { name: '治疗', cd: 0, maxCd: 10, heal: 30, icon: '💚' },
      { name: '大招', cd: 0, maxCd: 25, dmg: 5.0, icon: '⚡', range: 200 }
    ];
  }
  
  getPosition() {
    const tower = TOWER_POSITIONS[this.towerIdx];
    return { x: tower.x, y: tower.y };
  }
  
  gainExp(amount) {
    this.exp += amount;
    while (this.exp >= this.expNeed) {
      this.exp -= this.expNeed;
      this.levelUp();
    }
  }
  
  levelUp() {
    this.level++;
    this.expNeed = Math.floor(100 * Math.pow(this.level, 1.2));
    this.maxHp += 20;
    this.hp = this.maxHp;
    this.maxMp += 10;
    this.mp = this.maxMp;
    this.atk += 3;
    this.def += 1;
    
    // 检查转职条件
    if (this.level >= 10 && this.promotionLevel === 0) {
      this.promotionReady = true;
      showClassModal(this);
    }
    if (this.level >= 25 && this.promotionLevel === 1) {
      this.promotionReady = true;
      showClassModal(this);
    }
    
    // 解锁英雄槽位
    checkHeroSlots();
    
    addParticle(this.getPosition().x, this.getPosition().y - 30, 'LEVEL UP!', '#ffd700', 18);
  }
  
  promote(classType, isAuto) {
    const bonus = isAuto ? 1.2 : 1.1;
    this.classType = classType;
    this.buffMultiplier *= bonus;
    this.atk = Math.floor(this.atk * bonus);
    this.def = Math.floor(this.def * bonus);
    this.maxHp = Math.floor(this.maxHp * bonus);
    this.maxMp = Math.floor(this.maxMp * bonus);
    this.hp = this.maxHp;
    this.mp = this.maxMp;
    this.promotionLevel++;
    this.promotionReady = false;
    
    // 更新技能
    this.updateSkills();
    
    addParticle(this.getPosition().x, this.getPosition().y - 40, '转职成功!', '#ffd700', 22);
  }
  
  updateSkills() {
    const cls = CLASSES[this.classType];
    // 根据职业更新技能
    if (cls.type === 'melee') {
      this.skills[1].name = '斩击';
      this.skills[1].dmg = 2.5;
    } else if (cls.type === 'mage') {
      this.skills[0].name = '火球';
      this.skills[1].name = '烈焰';
    } else if (cls.type === 'ranged') {
      this.skills[0].name = '箭雨';
      this.skills[1].name = '穿透';
    }
    
    // 大招根据转职等级增强
    this.skills[3].dmg = 5.0 * (1 + this.promotionLevel * 0.2);
  }
  
  autoAttack(enemies) {
    this.atkTimer += 0.016;
    if (this.atkTimer < this.atkSpeed) return;
    this.atkTimer = 0;
    
    const pos = this.getPosition();
    let nearest = null;
    let minDist = Infinity;
    
    for (const enemy of enemies) {
      const dist = Math.sqrt((enemy.x - pos.x) ** 2 + (enemy.y - pos.y) ** 2);
      if (dist < this.atkRange && dist < minDist) {
        minDist = dist;
        nearest = enemy;
      }
    }
    
    if (nearest) {
      const dmg = Math.max(1, Math.floor(this.atk * this.buffMultiplier - nearest.def));
      nearest.hp -= dmg;
      addParticle(nearest.x, nearest.y - 15, '-' + dmg, '#ff6f00', 12);
      
      // 经验获取
      if (nearest.hp <= 0) {
        this.gainExp(nearest.exp);
      }
    }
  }
  
  useSkill(idx, enemies) {
    const skill = this.skills[idx];
    const mpCost = idx === 3 ? 30 : (idx === 2 ? 15 : 8);
    
    if (skill.cd > 0 || this.mp < mpCost) return false;
    
    skill.cd = skill.maxCd;
    this.mp -= mpCost;
    
    const pos = this.getPosition();
    const cls = CLASSES[this.classType];
    
    if (idx === 0) {
      // Q技能
      let target = findNearestEnemy(pos, this.atkRange * 1.5, enemies);
      if (target) {
        const dmg = Math.max(1, Math.floor(this.atk * skill.dmg * this.buffMultiplier - target.def));
        target.hp -= dmg;
        addParticle(target.x, target.y - 15, '-' + dmg, cls.color, 14);
      }
    } else if (idx === 1) {
      // W技能 - 范围
      for (const enemy of enemies) {
        const dist = Math.sqrt((enemy.x - pos.x) ** 2 + (enemy.y - pos.y) ** 2);
        if (dist < (skill.range || 80)) {
          const dmg = Math.max(1, Math.floor(this.atk * skill.dmg * this.buffMultiplier - enemy.def));
          enemy.hp -= dmg;
          addParticle(enemy.x, enemy.y - 15, '-' + dmg, cls.color, 14);
        }
      }
      screenShake = 5;
    } else if (idx === 2) {
      // E技能 - 治疗
      const healAmt = Math.floor(skill.heal * this.buffMultiplier);
      this.hp = Math.min(this.maxHp, this.hp + healAmt);
      addParticle(pos.x, pos.y - 25, '+' + healAmt, '#4caf50', 14);
    } else if (idx === 3) {
      // R大招 - 全屏
      for (const enemy of enemies) {
        const dmg = Math.max(1, Math.floor(this.atk * skill.dmg * this.buffMultiplier - enemy.def));
        enemy.hp -= dmg;
        addParticle(enemy.x, enemy.y - 15, '-' + dmg, '#ffd700', 16);
      }
      screenShake = 10;
      addParticle(pos.x, pos.y - 40, '大招!', '#ffd700', 24);
    }
    
    return true;
  }
  
  update() {
    // MP回复
    if (this.mp < this.maxMp) this.mp += 0.05;
    
    // 技能冷却
    for (const skill of this.skills) {
      if (skill.cd > 0) skill.cd -= 0.016;
    }
  }
  
  draw() {
    const pos = this.getPosition();
    const cls = CLASSES[this.classType];
    const sx = pos.x;
    const sy = pos.y;
    
    // 攻击范围圈
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(sx, sy, this.atkRange, 0, Math.PI * 2);
    ctx.stroke();
    
    // 英雄身体
    const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, 20);
    gradient.addColorStop(0, cls.color);
    gradient.addColorStop(1, shadeColor(cls.color, -30));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(sx, sy, 20, 0, Math.PI * 2);
    ctx.fill();
    
    // 边框
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // 职业图标
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cls.icon, sx, sy);
    
    // 等级显示
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 10px Arial';
    ctx.fillText('Lv' + this.level, sx, sy + 28);
    
    // 血条
    if (this.hp < this.maxHp) {
      const barW = 36;
      ctx.fillStyle = '#333';
      ctx.fillRect(sx - barW/2, sy - 30, barW, 4);
      ctx.fillStyle = this.hp / this.maxHp > 0.5 ? '#4caf50' : '#f44336';
      ctx.fillRect(sx - barW/2, sy - 30, barW * (this.hp / this.maxHp), 4);
    }
    
    // 转职提示
    if (this.promotionReady) {
      ctx.fillStyle = '#ff9800';
      ctx.font = 'bold 12px Arial';
      ctx.fillText('可转职!', sx, sy - 38);
    }
  }
}

// ====== 敌人系统 ======
let enemies = [];

class Enemy {
  constructor(type, pathIdx, isBoss = false) {
    this.type = type;
    this.pathIdx = pathIdx;
    this.pathWaypoint = 0;
    this.isBoss = isBoss;
    
    const path = PATHS[pathIdx];
    this.x = path[0].x;
    this.y = path[0].y;
    
    const waveMultiplier = 1 + wave * 0.15;
    
    if (isBoss) {
      this.hp = Math.floor((300 + wave * 100) * waveMultiplier);
      this.maxHp = this.hp;
      this.atk = Math.floor((20 + wave * 5) * (1 + wave * 0.1));
      this.def = Math.floor(10 + wave * 2);
      this.speed = 0.8;
      this.exp = 100 + wave * 30;
      this.size = 30;
      this.color = '#ffd600';
    } else if (type === 'fast') {
      this.hp = Math.floor((30 + wave * 10) * waveMultiplier);
      this.maxHp = this.hp;
      this.atk = Math.floor((5 + wave * 2) * (1 + wave * 0.1));
      this.def = Math.floor(2 + wave * 0.5);
      this.speed = 2.0;
      this.exp = 15 + wave * 5;
      this.size = 12;
      this.color = '#00bcd4';
    } else {
      this.hp = Math.floor((50 + wave * 15) * waveMultiplier);
      this.maxHp = this.hp;
      this.atk = Math.floor((8 + wave * 2) * (1 + wave * 0.1));
      this.def = Math.floor(3 + wave);
      this.speed = 1.2;
      this.exp = 25 + wave * 8;
      this.size = 16;
      this.color = '#66bb6a';
    }
    
    this.atkTimer = 0;
    this.reachedEnd = false;
  }
  
  update() {
    const path = PATHS[this.pathIdx];
    
    if (this.pathWaypoint < path.length) {
      const target = path[this.pathWaypoint];
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < this.speed + 2) {
        this.pathWaypoint++;
      } else {
        this.x += (dx / dist) * this.speed;
        this.y += (dy / dist) * this.speed;
      }
    } else {
      // 到达终点
      this.reachedEnd = true;
      return false;
    }
    
    // 检测与英雄碰撞
    for (const hero of heroes) {
      const pos = hero.getPosition();
      const dist = Math.sqrt((this.x - pos.x) ** 2 + (this.y - pos.y) ** 2);
      
      if (dist < this.size + 25) {
        this.atkTimer++;
        if (this.atkTimer >= 60) {
          this.atkTimer = 0;
          const dmg = Math.max(1, this.atk - hero.def);
          hero.hp -= dmg;
          addParticle(pos.x, pos.y - 20, '-' + dmg, '#ff5252', 13);
          screenShake = 3;
          
          if (hero.hp <= 0) {
            // 英雄死亡检查
            checkGameOver();
          }
        }
      }
    }
    
    return true;
  }
  
  draw() {
    // 影子
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + this.size * 0.8, this.size * 0.8, this.size * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 身体
    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
    gradient.addColorStop(0, this.color);
    gradient.addColorStop(1, shadeColor(this.color, -40));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    
    // Boss光环
    if (this.isBoss) {
      ctx.save();
      ctx.globalAlpha = 0.3 + Math.sin(Date.now() / 200) * 0.2;
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    
    // 血条
    if (this.hp < this.maxHp) {
      const barW = this.size * 2;
      ctx.fillStyle = '#333';
      ctx.fillRect(this.x - barW/2, this.y - this.size - 10, barW, 5);
      ctx.fillStyle = this.hp / this.maxHp > 0.5 ? '#4caf50' : '#f44336';
      ctx.fillRect(this.x - barW/2, this.y - this.size - 10, barW * (this.hp / this.maxHp), 5);
    }
  }
}

// ====== 粒子系统 ======
let particles = [];

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
    this.life = 35;
  }
  
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.08;
    this.alpha -= 0.028;
    return this.alpha > 0;
  }
  
  draw() {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.font = `bold ${this.size}px Arial`;
    ctx.textAlign = 'center';
    ctx.strokeText(this.text, this.x, this.y);
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
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

function findNearestEnemy(pos, range, enemies) {
  let nearest = null;
  let minDist = Infinity;
  for (const e of enemies) {
    const dist = Math.sqrt((e.x - pos.x) ** 2 + (e.y - pos.y) ** 2);
    if (dist < range && dist < minDist) {
      minDist = dist;
      nearest = e;
    }
  }
  return nearest;
}

// ====== 转职系统 ======
function showClassModal(hero) {
  const modal = document.getElementById('class-modal');
  const options = document.getElementById('class-options');
  options.innerHTML = '';
  
  // 自动转职选项
  const autoCard = document.createElement('div');
  autoCard.className = 'class-card auto';
  autoCard.innerHTML = `
    <div class="icon">🎲</div>
    <div class="name">自动转职</div>
    <div class="bonus">+20% 属性加成</div>
    <div class="desc">随机获得职业<br>可能获得稀有职业!</div>
  `;
  autoCard.onclick = () => autoPromote(hero);
  options.appendChild(autoCard);
  
  // 手动转职选项
  const availableClasses = getAvailableClasses(hero);
  for (const cls of availableClasses) {
    const card = document.createElement('div');
    card.className = 'class-card';
    card.style.borderColor = cls.color;
    card.innerHTML = `
      <div class="icon">${cls.icon}</div>
      <div class="name">${cls.name}</div>
      <div class="bonus">+10% 属性加成</div>
      <div class="desc">${getClassDesc(cls.type)}</div>
    `;
    card.onclick = () => manualPromote(hero, cls.key);
    options.appendChild(card);
  }
  
  modal.classList.add('show');
  gameState = 'paused';
}

function getAvailableClasses(hero) {
  const cls = CLASSES[hero.classType];
  const available = [];
  
  if (hero.promotionLevel === 0) {
    // 一转
    if (hero.classType === 'warrior') {
      available.push({ key: 'blademaster', ...CLASSES.blademaster });
      available.push({ key: 'mountainking', ...CLASSES.mountainking });
      available.push({ key: 'bloodmage', ...CLASSES.bloodmage });
    } else if (hero.classType === 'archer') {
      available.push({ key: 'windrunner', ...CLASSES.windrunner });
      available.push({ key: 'shadowhunter', ...CLASSES.shadowhunter });
      available.push({ key: 'keeper', ...CLASSES.keeper });
    }
  } else {
    // 二转 - 终极形态
    available.push({ key: 'swordgod', ...CLASSES.swordgod });
    available.push({ key: 'titan', ...CLASSES.titan });
    available.push({ key: 'inferno', ...CLASSES.inferno });
  }
  
  return available;
}

function getClassDesc(type) {
  const descs = {
    melee: '近战输出，高伤害',
    tank: '坦克，高防御高血量',
    mage: '法师，法术伤害',
    ranged: '远程输出',
    assassin: '刺客，高暴击',
    summoner: '召唤师，召唤生物'
  };
  return descs[type] || '特殊职业';
}

function autoPromote(hero) {
  const available = getAvailableClasses(hero);
  const random = available[Math.floor(Math.random() * available.length)];
  hero.promote(random.key, true);
  closeClassModal();
}

function manualPromote(hero, classKey) {
  hero.promote(classKey, false);
  closeClassModal();
}

function closeClassModal() {
  document.getElementById('class-modal').classList.remove('show');
  gameState = 'playing';
}

// ====== 英雄槽位 ======
function checkHeroSlots() {
  const slots = document.querySelectorAll('.hero-slot');
  const heroLevel = heroes.length > 0 ? heroes[0].level : 1;
  
  // 检查是否可以解锁新英雄
  const unlockLevels = [1, 5, 10, 20, 30];
  for (let i = 0; i < slots.length; i++) {
    if (heroLevel >= unlockLevels[i] && i < heroes.length) {
      slots[i].classList.remove('locked');
      slots[i].classList.add('occupied');
      slots[i].innerHTML = CLASSES[heroes[i].classType].icon;
    } else if (heroLevel >= unlockLevels[i] && i === heroes.length) {
      slots[i].classList.remove('locked');
      slots[i].innerHTML = '➕';
    }
  }
}

function addHero(classType) {
  if (heroes.length >= 5) return;
  
  // 找一个空的塔位
  let towerIdx = -1;
  const occupiedTowers = heroes.map(h => h.towerIdx);
  for (let i = 0; i < TOWER_POSITIONS.length; i++) {
    if (!occupiedTowers.includes(i)) {
      towerIdx = i;
      break;
    }
  }
  
  if (towerIdx === -1) return;
  
  heroes.push(new Hero(classType, towerIdx));
  checkHeroSlots();
}

// ====== 波次系统 ======
function spawnWave() {
  const count = 5 + Math.floor(wave * 1.5);
  const hasBoss = wave % 5 === 0;
  
  // 显示波次提示
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
  setTimeout(() => { alert.style.display = 'none'; }, 2000);
  
  // 生成敌人
  let spawned = 0;
  const spawnInterval = setInterval(() => {
    if (spawned >= count) {
      clearInterval(spawnInterval);
      return;
    }
    
    if (hasBoss && spawned === 0) {
      // Boss从中间路线出
      enemies.push(new Enemy('normal', 2, true));
    } else {
      const pathIdx = Math.floor(Math.random() * 2); // 左或右
      const type = wave > 3 && Math.random() < 0.3 ? 'fast' : 'normal';
      enemies.push(new Enemy(type, pathIdx, false));
    }
    spawned++;
  }, 500);
}

// ====== 游戏结束检查 ======
function checkGameOver() {
  // 检查所有英雄是否死亡
  const allDead = heroes.every(h => h.hp <= 0);
  if (allDead) {
    gameState = 'gameover';
    document.getElementById('final-wave').textContent = wave;
    document.getElementById('final-kills').textContent = kills;
    document.getElementById('game-over').style.display = 'block';
  }
}

// ====== 塔位升级 ======
function upgradeTower(towerIdx) {
  const tower = TOWER_POSITIONS[towerIdx];
  const cost = [100, 300, 800][tower.level - 1] || 9999;
  
  if (gold >= cost && tower.level < 4) {
    gold -= cost;
    tower.level++;
    
    // 增强该塔位上的英雄
    const hero = heroes.find(h => h.towerIdx === towerIdx);
    if (hero) {
      hero.atk = Math.floor(hero.atk * 1.2);
      if (tower.level >= 3) {
        hero.atkRange *= 1.15;
      }
    }
    
    updateUI();
    addParticle(tower.x, tower.y - 40, '塔位升级!', '#ffd700', 18);
  }
}

// ====== 渲染函数 ======
function drawMap() {
  // 背景
  const bgGradient = ctx.createLinearGradient(0, 0, 0, CONFIG.CANVAS_H);
  bgGradient.addColorStop(0, '#1a2a1a');
  bgGradient.addColorStop(1, '#0d1b0d');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, CONFIG.CANVAS_W, CONFIG.CANVAS_H);
  
  // 草地纹理
  ctx.fillStyle = 'rgba(34,139,34,0.1)';
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * CONFIG.CANVAS_W;
    const y = Math.random() * CONFIG.CANVAS_H;
    ctx.beginPath();
    ctx.arc(x, y, Math.random() * 20 + 5, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // 绘制路线
  const pathColors = ['rgba(139,69,19,0.4)', 'rgba(139,69,19,0.4)', 'rgba(178,34,34,0.4)'];
  for (let p = 0; p < PATHS.length; p++) {
    const path = PATHS[p];
    
    // 路面
    ctx.strokeStyle = pathColors[p];
    ctx.lineWidth = 40;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();
    
    // 路线边框
    ctx.strokeStyle = 'rgba(100,100,100,0.3)';
    ctx.lineWidth = 44;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();
    
    // 路面中心线
    ctx.strokeStyle = 'rgba(200,200,200,0.15)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }
  
  // 绘制塔位
  for (let i = 0; i < TOWER_POSITIONS.length; i++) {
    const tower = TOWER_POSITIONS[i];
    const hasHero = heroes.some(h => h.towerIdx === i);
    const isSelected = selectedTower === i;
    
    // 塔位底座
    ctx.fillStyle = hasHero ? 'rgba(74,144,217,0.3)' : 'rgba(100,100,100,0.2)';
    ctx.beginPath();
    ctx.arc(tower.x, tower.y, 28, 0, Math.PI * 2);
    ctx.fill();
    
    // 塔位边框
    ctx.strokeStyle = isSelected ? '#ffd700' : (hasHero ? '#4a90d9' : '#666');
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.stroke();
    
    // 塔位等级
    if (tower.level > 1) {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('★'.repeat(tower.level - 1), tower.x, tower.y + 38);
    }
    
    // 空塔位提示
    if (!hasHero) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('➕', tower.x, tower.y);
    }
  }
}

function drawUI() {
  document.getElementById('hero-level').textContent = heroes.length > 0 ? heroes[0].level : 1;
  document.getElementById('gold').textContent = gold;
  document.getElementById('wave').textContent = wave;
  document.getElementById('kills').textContent = kills;
  
  // 更新技能按钮
  if (heroes.length > 0) {
    const hero = heroes[selectedHero];
    for (let i = 0; i < 4; i++) {
      const btn = document.querySelector(`[data-skill="${i}"]`);
      const skill = hero.skills[i];
      
      btn.querySelector('.icon').textContent = skill.icon;
      btn.querySelector('.name').textContent = skill.name;
      
      if (skill.cd > 0) {
        btn.classList.add('cooldown');
        btn.classList.remove('ready');
        let overlay = btn.querySelector('.cd-overlay');
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.className = 'cd-overlay';
          btn.appendChild(overlay);
        }
        overlay.textContent = Math.ceil(skill.cd);
      } else {
        btn.classList.remove('cooldown');
        btn.classList.add('ready');
        const overlay = btn.querySelector('.cd-overlay');
        if (overlay) overlay.remove();
      }
    }
  }
  
  // 升级按钮
  if (selectedTower !== null) {
    const tower = TOWER_POSITIONS[selectedTower];
    const costs = [100, 300, 800];
    const cost = costs[tower.level - 1];
    const btn = document.getElementById('upgrade-tower');
    
    if (cost && tower.level < 4) {
      btn.textContent = `升级塔位 💰${cost}`;
      btn.style.display = gold >= cost ? 'block' : 'none';
    } else {
      btn.style.display = 'none';
    }
  } else {
    document.getElementById('upgrade-tower').style.display = 'none';
  }
}

// ====== 主循环 ======
function update() {
  if (gameState !== 'playing') return;
  
  // 更新英雄
  for (const hero of heroes) {
    hero.update();
    hero.autoAttack(enemies);
  }
  
  // 更新敌人
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (!enemies[i].update()) {
      if (enemies[i].reachedEnd) {
        // 敌人到达终点，扣血
      } else {
        // 敌人死亡
        kills++;
        gold += enemies[i].isBoss ? 50 : 10;
        
        // 经验给最近的英雄
        for (const hero of heroes) {
          hero.gainExp(enemies[i].exp);
        }
      }
      enemies.splice(i, 1);
    }
  }
  
  // 更新粒子
  for (let i = particles.length - 1; i >= 0; i--) {
    if (!particles[i].update()) {
      particles.splice(i, 1);
    }
  }
  
  // 波次计时
  waveTimer -= 0.016;
  if (waveTimer <= 0) {
    wave++;
    waveTimer = CONFIG.WAVE_INTERVAL + wave * 2;
    spawnWave();
  }
  
  // 屏幕震动
  if (screenShake > 0) screenShake *= 0.85;
  if (screenShake < 0.5) screenShake = 0;
  
  // MP回复
  for (const hero of heroes) {
    if (hero.mp < hero.maxMp) hero.mp += 0.03;
  }
  
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
  for (const enemy of enemies) {
    enemy.draw();
  }
  
  // 绘制英雄
  for (const hero of heroes) {
    hero.draw();
  }
  
  // 绘制粒子
  for (const particle of particles) {
    particle.draw();
  }
  
  ctx.restore();
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// ====== 初始化 ======
function init() {
  canvas = document.getElementById('game');
  ctx = canvas.getContext('2d');
  
  // 设置画布大小
  canvas.width = CONFIG.CANVAS_W;
  canvas.height = CONFIG.CANVAS_H;
  
  // 添加初始英雄
  addHero('warrior');
  
  // 开始第一波
  spawnWave();
  
  // 启动游戏循环
  gameLoop();
  
  // 设置事件监听
  setupEventListeners();
}

function setupEventListeners() {
  // 技能按钮
  document.querySelectorAll('.skill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const skillIdx = parseInt(btn.dataset.skill);
      if (heroes.length > 0) {
        heroes[selectedHero].useSkill(skillIdx, enemies);
      }
    });
  });
  
  // 塔位点击
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    // 检查是否点击了塔位
    for (let i = 0; i < TOWER_POSITIONS.length; i++) {
      const tower = TOWER_POSITIONS[i];
      const dist = Math.sqrt((x - tower.x) ** 2 + (y - tower.y) ** 2);
      
      if (dist < 30) {
        selectedTower = i;
        
        // 如果是空塔位且有可用英雄，放置英雄
        const hasHero = heroes.some(h => h.towerIdx === i);
        if (!hasHero && heroes.length < 5) {
          addHero('warrior');
        }
        return;
      }
    }
    
    selectedTower = null;
  });
  
  // 英雄栏点击
  document.querySelectorAll('.hero-slot').forEach(slot => {
    slot.addEventListener('click', () => {
      const idx = parseInt(slot.dataset.slot);
      if (!slot.classList.contains('locked')) {
        selectedHero = Math.min(idx, heroes.length - 1);
        document.querySelectorAll('.hero-slot').forEach(s => s.classList.remove('active'));
        slot.classList.add('active');
      }
    });
  });
  
  // 升级按钮
  document.getElementById('upgrade-tower').addEventListener('click', () => {
    if (selectedTower !== null) {
      upgradeTower(selectedTower);
    }
  });
}

// 启动游戏
window.onload = init;
