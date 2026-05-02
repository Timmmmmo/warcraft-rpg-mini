// ====== 魔兽RPG V5.0 - 完全重写 ======
var canvas, ctx, W, H;
var state = 'playing';
var gold = 50, wave = 1, waveT = 0.5, kills = 0, shake = 0;
var moveCd = 0, showRangeTimer = 0;

// ====== 图片资源加载 ======
var IMAGES = {};
var imagesLoaded = false;
var imageList = {
  // 英雄头像
  hero_warrior: 'assets/images/hero_warrior.png',
  hero_archer: 'assets/images/hero_archer.png',
  hero_mage: 'assets/images/hero_mage.png',
  hero_blademaster: 'assets/images/hero_blademaster.png',
  hero_mountainking: 'assets/images/hero_mountainking.png',
  hero_windrunner: 'assets/images/hero_windrunner.png',
  hero_shadowhunter: 'assets/images/hero_shadowhunter.png',
  hero_frost: 'assets/images/hero_frost.png',
  hero_bloodmage: 'assets/images/hero_bloodmage.png',
  hero_storm: 'assets/images/hero_storm.png',
  // 怪物
  orc_normal: 'assets/images/orc_normal.png',
  orc_fast: 'assets/images/orc_fast.png',
  orc_tank: 'assets/images/orc_tank.png',
  orc_elite: 'assets/images/orc_elite.png',
  centaur_boss: 'assets/images/centaur_boss.png',
  centaur_elite: 'assets/images/centaur_elite.png',
  // 环境
  tower_active: 'assets/images/tower_active.png',
  tower_inactive: 'assets/images/tower_inactive.png',
  bg_tile: 'assets/images/bg_tile.png'
};

function loadImages(cb){
  var keys=Object.keys(imageList), loaded=0;
  if(keys.length===0){imagesLoaded=true;if(cb)cb();return;}
  keys.forEach(function(k){
    var img=new Image();
    img.onload=function(){loaded++;IMAGES[k]=img;if(loaded>=keys.length){imagesLoaded=true;if(cb)cb();}};
    img.onerror=function(){loaded++;console.log('Failed to load:',k);if(loaded>=keys.length){imagesLoaded=true;if(cb)cb();}};
    img.src=imageList[k];
  });
}

// 塔位
var TOWERS = [
  {x:0.15,y:0.18,name:'左上',lv:1},{x:0.85,y:0.18,name:'右上',lv:1},
  {x:0.15,y:0.82,name:'左下',lv:1},{x:0.85,y:0.82,name:'右下',lv:1},
  {x:0.5,y:0.5,name:'中心',lv:1}
];

// 路线
var PATHS = {
  inner: [{x:0.25,y:0.28},{x:0.75,y:0.28},{x:0.75,y:0.72},{x:0.25,y:0.72},{x:0.25,y:0.28}],
  outer: [{x:0.08,y:0.09},{x:0.92,y:0.09},{x:0.92,y:0.91},{x:0.08,y:0.91},{x:0.08,y:0.09}]
};

// 职业 - 10位英雄，古代人物风格头像 + 独特被动
var HEROES = {
  warrior: {
    name:'战士',cnName:'铁山',title:'破军',
    icon:'⚔️',avatar:'👨‍🦲',color:'#ff1744',skin:'🗡️',range:0.48,type:'str',atkSpd:0.9,ultCd:18,
    passive:'15%眩晕',extraPassive:'不屈：HP低于30%时攻击力+50%',
    skills:[
      {name:'裂地击',ic:'💥',cd:0,maxCd:7,dmg:3.75,aoe:0.506,type:'small',cost:75,
       fx:'earth_split',desc:'重击地面，裂缝扩散'},
      {name:'旋风斩',ic:'🌪️',cd:0,maxCd:18,dmg:4.5,aoe:0.8,type:'big',cost:150,
       fx:'spin',desc:'360°旋风斩，超高AOE'}
    ]
  },
  archer: {
    name:'弓手',cnName:'凌风',title:'飞将',
    icon:'🏹',avatar:'🧝',color:'#2979ff',skin:'🎯',range:0.48,type:'agi',atkSpd:0.45,ultCd:18,
    passive:'20%双倍',extraPassive:'鹰眼：暴击率+15%，暴击伤害+50%',
    skills:[
      {name:'穿云箭',ic:'➹',cd:0,maxCd:7,dmg:3.75,aoe:0.506,type:'small',cost:75,
       fx:'pierce',desc:'一箭穿云，贯穿直线'},
      {name:'箭雨',ic:'🌧️',cd:0,maxCd:18,dmg:3.0,aoe:1.0,type:'big',cost:150,
       fx:'rain',desc:'箭雨覆盖全场，持续伤害'}
    ]
  },
  mage: {
    name:'法师',cnName:'星落',title:'天机',
    icon:'🔮',avatar:'🧙',color:'#ffd600',skin:'✨',range:0.48,type:'int',atkSpd:0.7,ultCd:18,
    passive:'普攻减速',extraPassive:'法穿：无视敌人30%护甲',
    skills:[
      {name:'奥术爆破',ic:'💜',cd:0,maxCd:7,dmg:3.75,aoe:0.506,type:'small',cost:75,
       fx:'arcane',desc:'奥术能量炸裂'},
      {name:'陨石雨',ic:'☄️',cd:0,maxCd:18,dmg:5.5,aoe:0.7,type:'big',cost:150,
       fx:'meteor',desc:'陨石从天而降，毁灭性打击'}
    ]
  },
  blademaster: {
    name:'剑圣',cnName:'残月',title:'无极',
    icon:'⚔️',avatar:'🥷',color:'#ff5252',skin:'🗡️',range:0.48,type:'str',atkSpd:0.85,ultCd:18,
    passive:'15%眩晕',extraPassive:'剑意：每击杀一个敌人攻击力+1（上限50）',
    skills:[
      {name:'瞬斩',ic:'⚡',cd:0,maxCd:7,dmg:3.75,aoe:0.506,type:'small',cost:75,
       fx:'slash',desc:'瞬间出剑，十字斩击'},
      {name:'剑刃风暴',ic:'🌀',cd:0,maxCd:18,dmg:5.0,aoe:0.65,type:'big',cost:150,
       fx:'bladestorm',desc:'化身风暴，斩灭一切'}
    ]
  },
  mountainking: {
    name:'山丘',cnName:'磐石',title:'镇岳',
    icon:'🛡️',avatar:'🧔',color:'#ffd700',skin:'🔨',range:0.48,type:'str',atkSpd:1.0,ultCd:18,
    passive:'15%眩晕',extraPassive:'磐体：受到伤害减少20%，反弹10%伤害',
    skills:[
      {name:'地震波',ic:'🌋',cd:0,maxCd:7,dmg:3.75,aoe:0.506,type:'small',cost:75,
       fx:'quake',desc:'震地冲击波扩散'},
      {name:'雷霆一击',ic:'⚡',cd:0,maxCd:18,dmg:6.0,aoe:0.6,type:'big',cost:150,
       fx:'thunder',desc:'雷霆震地，眩晕全场'}
    ]
  },
  windrunner: {
    name:'风行',cnName:'逐影',title:'踏风',
    icon:'💨',avatar:'🏃',color:'#00e676',skin:'💨',range:0.48,type:'agi',atkSpd:0.4,ultCd:18,
    passive:'20%双倍',extraPassive:'疾步：攻击速度+25%，移动冷却-50%',
    skills:[
      {name:'疾风刺',ic:'🗡️',cd:0,maxCd:7,dmg:3.75,aoe:0.506,type:'small',cost:75,
       fx:'gale_stab',desc:'疾风突刺，快速连击'},
      {name:'精准射击',ic:'🎯',cd:0,maxCd:18,dmg:8.0,aoe:0.15,type:'big',cost:150,
       fx:'snipe',desc:'一击必杀，超高单体伤害'}
    ]
  },
  shadowhunter: {
    name:'暗猎',cnName:'幽冥',title:'噬魂',
    icon:'🌑',avatar:'🧛',color:'#7b1fa2',skin:'🗡️',range:0.48,type:'agi',atkSpd:0.35,ultCd:18,
    passive:'25%双倍',extraPassive:'吸血：造成伤害的15%转化为生命',
    skills:[
      {name:'暗影突袭',ic:'👁️',cd:0,maxCd:7,dmg:3.75,aoe:0.506,type:'small',cost:75,
       fx:'shadow_strike',desc:'暗影中突袭，诅咒敌人'},
      {name:'毒蛇陷阱',ic:'🐍',cd:0,maxCd:18,dmg:3.5,aoe:0.85,type:'big',cost:150,
       fx:'poison',desc:'毒雾弥漫，持续毒伤'}
    ]
  },
  frost: {
    name:'冰法',cnName:'霜语',title:'玄冰',
    icon:'❄️',avatar:'🧝‍♀️',color:'#4fc3f7',skin:'❄️',range:0.48,type:'int',atkSpd:0.75,ultCd:18,
    passive:'普攻减速',extraPassive:'冰心：被攻击时20%概率冻结敌人2秒',
    skills:[
      {name:'冰锥术',ic:'🧊',cd:0,maxCd:7,dmg:3.75,aoe:0.506,type:'small',cost:75,
       fx:'ice_bolt',desc:'冰锥散射，冻伤敌人'},
      {name:'冰封领域',ic:'❄️',cd:0,maxCd:18,dmg:3.0,aoe:0.9,type:'big',cost:150,
       fx:'frost',desc:'冰封全场，减速+持续伤害'}
    ]
  },
  bloodmage: {
    name:'血法',cnName:'赤焰',title:'焚天',
    icon:'🔥',avatar:'👹',color:'#d32f2f',skin:'🔥',range:0.48,type:'int',atkSpd:0.65,ultCd:18,
    passive:'普攻减速',extraPassive:'燃魂：击杀敌人恢复10点HP和5点MP',
    skills:[
      {name:'火球术',ic:'🔥',cd:0,maxCd:7,dmg:3.75,aoe:0.506,type:'small',cost:75,
       fx:'fireball',desc:'火球爆裂，灼烧范围'},
      {name:'烈焰之柱',ic:'🌋',cd:0,maxCd:18,dmg:4.0,aoe:0.75,type:'big',cost:150,
       fx:'flame',desc:'地火喷涌，焚尽万物'}
    ]
  },
  storm: {
    name:'雷法',cnName:'雷泽',title:'天罚',
    icon:'⚡',avatar:'🧙‍♂️',color:'#7c4dff',skin:'⚡',range:0.48,type:'int',atkSpd:0.6,ultCd:18,
    passive:'普攻减速',extraPassive:'感电：攻击有10%概率触发额外闪电伤害',
    skills:[
      {name:'电弧闪',ic:'⚡',cd:0,maxCd:7,dmg:3.75,aoe:0.506,type:'small',cost:75,
       fx:'arc',desc:'电弧跳跃，连锁打击'},
      {name:'连锁闪电',ic:'⚡',cd:0,maxCd:18,dmg:4.5,aoe:0.85,type:'big',cost:150,
       fx:'chain',desc:'闪电链弹射，连锁打击'}
    ]
  }
};

// 怪物类型
var MTYPES = {
  normal: {col:'#66bb6a',hpM:1,spdM:1},
  fast: {col:'#00bcd4',hpM:0.6,spdM:1.8},
  tank: {col:'#8d6e63',hpM:2.5,spdM:0.6},
  elite: {col:'#e040fb',hpM:2,spdM:1},
  boss: {col:'#ffd600',hpM:8,spdM:0.7}
};

// 副本系统 - 重新平衡数值
var DUNGEONS = [
  {name:'经验副本',icon:'⭐',type:'exp'},
  {name:'镜像副本',icon:'🪞',type:'boss'}
];

// 新版副本数值表（10级全量数据）
var DUNGEON_STATS = {
  gold: [
    {hp:200,   time:15, reward:80,    exp:30,   cost:30},
    {hp:500,   time:18, reward:160,   exp:60,   cost:60},
    {hp:1000,  time:20, reward:280,   exp:100,  cost:100},
    {hp:2000,  time:22, reward:450,   exp:160,  cost:160},
    {hp:4000,  time:25, reward:700,   exp:250,  cost:250},
    {hp:7000,  time:28, reward:1100,  exp:400,  cost:400},
    {hp:12000, time:30, reward:1700,  exp:600,  cost:600},
    {hp:20000, time:33, reward:2500,  exp:900,  cost:900},
    {hp:35000, time:36, reward:3800,  exp:1400, cost:1400},
    {hp:60000, time:40, reward:5500,  exp:2000, cost:2000}
  ],
  exp: [
    {hp:150,   time:15, reward:0,     exp:50,   cost:20},
    {hp:400,   time:18, reward:0,     exp:100,  cost:45},
    {hp:800,   time:20, reward:0,     exp:170,  cost:80},
    {hp:1600,  time:22, reward:0,     exp:280,  cost:130},
    {hp:3500,  time:25, reward:0,     exp:400,  cost:180},
    {hp:6000,  time:28, reward:0,     exp:650,  cost:300},
    {hp:10000, time:30, reward:0,     exp:1000, cost:450},
    {hp:17000, time:33, reward:0,     exp:1500, cost:700},
    {hp:30000, time:36, reward:0,     exp:2200, cost:1000},
    {hp:50000, time:38, reward:0,     exp:3000, cost:1500}
  ],
  boss: [
    {hp:500,   time:20, reward:100,   exp:40,   cost:50},
    {hp:1200,  time:22, reward:250,   exp:90,   cost:100},
    {hp:2500,  time:24, reward:450,   exp:150,  cost:180},
    {hp:5000,  time:26, reward:750,   exp:250,  cost:280},
    {hp:8000,  time:28, reward:800,   exp:350,  cost:300},
    {hp:15000, time:30, reward:1500,  exp:550,  cost:500},
    {hp:25000, time:33, reward:2500,  exp:850,  cost:750},
    {hp:40000, time:36, reward:3800,  exp:1300, cost:1100},
    {hp:70000, time:40, reward:5500,  exp:2000, cost:1700},
    {hp:100000,time:45, reward:6000,  exp:2500, cost:2500}
  ]
};

function getDungeonStats(d, level) {
  var l = Math.max(1, Math.min(level, 10)) - 1; // 0-indexed
  var table = DUNGEON_STATS[d.type];
  if (!table || !table[l]) return {hp:300, time:15, reward:0, exp:10, cost:10};
  var s=table[l];
  return {hp:s.hp*3, time:s.time, reward:s.reward, exp:s.exp, cost:s.cost}; // HP×3
}

// 副本状态变量
var dungeonLevels = {gold:1,exp:1,boss:1};
var dungeonCompleted = {};
var dungeonActive = null, dungeonEnemy = null, dungeonTimer = 0;
var selectedDungeon = null;

// ====== 收集 & 连横系统 ======
var heroCollection = []; // 玩家收集到的英雄 key 列表
var towerSlots = [null, null, null, null, null]; // 每个塔位放的英雄 key
var heroCards = []; // 地面上浮动的英雄卡牌
var lastCardDropTime = 0;
var synergyInfo = null; // 当前连横信息 {type, heroes, bonus}
var cardDropInterval = 10000; // 10秒检查一次
var cardDropChance = 0.08; // 8%概率

// 塔位英雄战斗状态（每个塔位独立计算攻击和技能CD）
var towerHeroStates = [null,null,null,null,null]; // {atkTimer, skills:[{cd}], mp}
function initTowerHeroState(idx){
  var key = towerSlots[idx];
  if(!key){towerHeroStates[idx]=null;return;}
  var h = HEROES[key];
  towerHeroStates[idx] = {
    atkTimer: 0,
    mp: 200,
    maxMp: 200,
    skills: [
      {cd:0, maxCd:h.skills[0].maxCd, dmg:h.skills[0].dmg, aoe:h.skills[0].aoe, type:h.skills[0].type, cost:h.skills[0].cost, name:h.skills[0].name, ic:h.skills[0].ic, fx:h.skills[0].fx},
      {cd:0, maxCd:h.skills[1].maxCd, dmg:h.skills[1].dmg, aoe:h.skills[1].aoe, type:h.skills[1].type, cost:h.skills[1].cost, name:h.skills[1].name, ic:h.skills[1].ic, fx:h.skills[1].fx}
    ]
  };
}

// 英雄卡牌类
function HeroCard(classKey){
  this.classKey = classKey;
  this.x = 0.15 + Math.random() * 0.7;
  this.y = 0.2 + Math.random() * 0.6;
  this.spawnTime = Date.now();
  this.alive = true;
  this.sz = 0.03;
  this.floatOffset = Math.random() * Math.PI * 2;
}
HeroCard.prototype.update = function(){
  if(!this.alive) return false;
  if(Date.now() - this.spawnTime > 30000) { this.alive = false; return false; }
  return true;
};
HeroCard.prototype.draw = function(){
  if(!this.alive) return;
  var x = this.x * W, y = this.y * H + Math.sin(Date.now()/500 + this.floatOffset) * 6;
  var sz = this.sz * Math.min(W, H);
  var h = HEROES[this.classKey];
  if(!h) return;
  var remain = Math.max(0, Math.ceil(30 - (Date.now()-this.spawnTime)/1000));
  // 光晕
  ctx.save();
  ctx.globalAlpha = 0.3 + Math.sin(Date.now()/300) * 0.15;
  var gl = ctx.createRadialGradient(x, y, 0, x, y, sz*2.5);
  gl.addColorStop(0, h.color); gl.addColorStop(1, 'transparent');
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y, sz*2.5, 0, Math.PI*2); ctx.fill();
  ctx.restore();
  // 卡牌背景
  ctx.save();
  ctx.shadowColor = h.color; ctx.shadowBlur = 12;
  ctx.fillStyle = 'rgba(20,20,40,0.9)';
  var cw = sz*1.6, ch = sz*2.2;
  ctx.beginPath();
  ctx.roundRect(x-cw, y-ch, cw*2, ch*2, 6);
  ctx.fill();
  ctx.strokeStyle = h.color; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
  // 英雄图标
  var heroImg = IMAGES['hero_'+this.classKey];
  if(heroImg){
    ctx.drawImage(heroImg, x-sz, y-sz*1.2, sz*2, sz*2);
  } else {
    ctx.font = (sz*1.4)+'px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(h.icon, x, y-sz*0.2);
  }
  // 名字
  ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center';
  ctx.fillStyle = h.color; ctx.fillText(h.name, x, y+sz+4);
  // 类型标签
  var typeName = h.type==='str'?'力量':(h.type==='agi'?'敏捷':'智力');
  ctx.font = '8px Arial'; ctx.fillStyle = '#aaa'; ctx.fillText(typeName, x, y+sz+14);
  // 倒计时
  ctx.font = 'bold 9px Arial'; ctx.fillStyle = remain<=10?'#f44336':'#ffd700';
  ctx.fillText(remain+'s', x, y-ch-6);
  // 提示
  ctx.font = '8px Arial'; ctx.fillStyle = '#fff'; ctx.fillText('✨ 点击收集', x, y+sz+24);
};
HeroCard.prototype.hitTest = function(mx, my){
  var x = this.x*W, y = this.y*H, sz = this.sz*Math.min(W,H)*2.5;
  var dx = mx-x, dy = my-y; return (dx*dx+dy*dy) < sz*sz;
};

// 检查连横
function checkSynergy(){
  synergyInfo = null;
  // 统计每个塔位上英雄的类型
  var typeCount = {str:[], agi:[], int:[]};
  for(var i = 0; i < towerSlots.length; i++){
    var key = towerSlots[i];
    if(!key) continue;
    var h = HEROES[key];
    if(h && typeCount[h.type]) typeCount[h.type].push({tower:i, key:key});
  }
  // 检查是否有3个同类型
  for(var t in typeCount){
    if(typeCount[t].length >= 3){
      synergyInfo = {type: t, heroes: typeCount[t].slice(0,3), bonus: 0.5}; // +50%攻击力
      return;
    }
  }
}

// 英雄收集（去重）
function collectHero(classKey){
  if(heroCollection.indexOf(classKey) < 0){
    heroCollection.push(classKey);
    var h = HEROES[classKey];
    showToast('🎉 收集到 '+h.icon+' '+h.cnName+'（'+h.name+'）');
    playSound('ult');
    // 每日任务: 收集英雄
    updateTaskProgress('collect2',heroCollection.length);
  } else {
    // 重复获得 → 小量经验补偿
    gainExp(20);
    showToast('已有 '+HEROES[classKey].cnName+'，补偿20EXP');
  }
}

// 放置英雄到塔位
function placeHeroOnTower(towerIdx, classKey){
  if(towerSlots[towerIdx]) return false; // 已有英雄
  towerSlots[towerIdx] = classKey;
  initTowerHeroState(towerIdx);
  checkSynergy();
  if(synergyInfo){
    var h = HEROES[synergyInfo.heroes[0].key];
    var typeName = synergyInfo.type==='str'?'力量':(synergyInfo.type==='agi'?'敏捷':'智力');
    showToast('⚡ 连横触发！'+typeName+'系3英雄共鸣，攻击+50%！');
  }
  return true;
}

// 从塔位撤回英雄
function removeHeroFromTower(towerIdx){
  if(!towerSlots[towerIdx]) return;
  towerSlots[towerIdx] = null;
  towerHeroStates[towerIdx] = null;
  checkSynergy();
}

// 英雄
var hero = {
  cls:'warrior',towerIdx:4,lv:1,exp:0,expNeed:100,
  hp:150,maxHp:150,mp:200,maxMp:200,atk:30,def:8,atkTimer:0,
  crit:0.1,critDmg:2.0,promo:0,buff:1.0,
  killStacks:0, // 剑意叠加
  skills: null
};

function getMpRegen(){
  var hd=hData();
  if(hd.type==='int') return 4.0;
  if(hd.type==='agi') return 3.0;
  return 2.0; // str
}
// 连横攻击加成
function getSynergyMult(){return synergyInfo?(1+synergyInfo.bonus):1.0;}
// 智力英雄普攻80%
function getAtkMult(){var hd=hData();return hd.type==='int'?0.8:1.0;}

// 转职颜色: 0=黑, 1=蓝, 2=浅黄, 3=金
function getPromoColor(p){
  return ['rgba(40,40,40,0.6)','rgba(30,80,200,0.5)','rgba(220,210,80,0.5)','rgba(255,215,0,0.5)'][Math.min(p,3)];
}
function getPromoGlow(p){
  return ['rgba(80,80,80,0.3)','rgba(50,100,255,0.4)','rgba(255,240,100,0.4)','rgba(255,215,0,0.5)'][Math.min(p,3)];
}
function getPromoBorder(p){
  return ['#666','#4a90d9','#ffe082','#ffd700'][Math.min(p,3)];
}
// 转职攻击加成: 每次转职普攻+80%, 同时基础属性大幅提升
function getPromoAtkMult(p){return [1.0,1.8,3.0,5.0,7.0][Math.min(p,4)];}
// 转职时MP上限提升: 0转=200(1大), 1转=300(2大), 2转=450(3大), 3转=750(5大)
function getMpByPromo(p){return [200,300,450,750,750][Math.min(p,4)];}

function initHeroSkills(){
  var hd = HEROES[hero.cls] || HEROES.warrior;
  hero.skills = [
    {name:hd.skills[0].name, ic:hd.skills[0].ic, cd:0, maxCd:hd.skills[0].maxCd, dmg:hd.skills[0].dmg, aoe:hd.skills[0].aoe, type:hd.skills[0].type, cost:hd.skills[0].cost, fx:hd.skills[0].fx},
    {name:hd.skills[1].name, ic:hd.skills[1].ic, cd:0, maxCd:hd.skills[1].maxCd, dmg:hd.skills[1].dmg, aoe:hd.skills[1].aoe, type:hd.skills[1].type, cost:hd.skills[1].cost, fx:hd.skills[1].fx}
  ];
}

function hPos() { return {x:TOWERS[hero.towerIdx].x*W, y:TOWERS[hero.towerIdx].y*H}; }
function hData() { return HEROES[hero.cls]||HEROES.warrior; }

var enemies=[], particles=[], effects=[], lastingEffects=[], neutrals=[];

// ====== 中立怪系统 ======
function NeutralCreature(type){
  var path=Math.random()<0.5?PATHS.inner:PATHS.outer;
  this.path=path;this.wp=0;this.type=type; // 'gold' or 'exp'
  this.x=path[0].x+(Math.random()-0.5)*0.08;this.y=path[0].y+(Math.random()-0.5)*0.08;
  this.maxHp=80+wave*20;this.hp=this.maxHp;
  this.def=0;this.spd=0.0015; // 移动较慢
  this.sz=0.035;this.alive=true;this.spawnTime=Date.now();
  // 奖励
  if(type==='gold'){this.goldReward=30+wave*8;this.expReward=0;this.col='#ffd700';this.icon='💰';}
  else{this.goldReward=0;this.expReward=25+wave*6;this.col='#4fc3f7';this.icon='⭐';}
}
NeutralCreature.prototype.update=function(){
  if(!this.alive)return false;
  // 60秒后消失
  if(Date.now()-this.spawnTime>60000){this.alive=false;return false;}
  var t=this.path[this.wp],dx=t.x-this.x,dy=t.y-this.y,d=Math.sqrt(dx*dx+dy*dy);
  if(d<this.spd+0.01)this.wp=(this.wp+1)%this.path.length;
  else{this.x+=(dx/d)*this.spd;this.y+=(dy/d)*this.spd;}
  return true;
};
NeutralCreature.prototype.draw=function(){
  if(!this.alive)return;
  var x=this.x*W,y=this.y*H,sz=this.sz*Math.min(W,H);
  // 倒计时
  var elapsed=(Date.now()-this.spawnTime)/1000;
  var remain=Math.max(0,Math.ceil(60-elapsed));
  // 光晕 - 脉冲
  ctx.save();ctx.globalAlpha=0.2+Math.sin(Date.now()/300)*0.1;
  var gl=ctx.createRadialGradient(x,y,0,x,y,sz*2);gl.addColorStop(0,this.col);gl.addColorStop(1,'transparent');
  ctx.fillStyle=gl;ctx.beginPath();ctx.arc(x,y,sz*2,0,Math.PI*2);ctx.fill();ctx.restore();
  // 身体
  ctx.save();ctx.shadowColor=this.col;ctx.shadowBlur=12;
  ctx.fillStyle=this.col;ctx.beginPath();ctx.arc(x,y,sz,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,0.6)';ctx.lineWidth=2;ctx.stroke();ctx.restore();
  // 图标
  ctx.font=(sz*1.2)+'px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(this.icon,x,y);
  // 血条
  var bw=sz*2.2,by=y-sz-8;ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillRect(x-bw/2,by,bw,4);
  ctx.fillStyle=this.col;ctx.fillRect(x-bw/2,by,bw*(this.hp/this.maxHp),4);
  // 倒计时读秒
  ctx.font='bold 10px Arial';ctx.fillStyle=remain<=10?'#f44336':'#ffd700';
  ctx.fillText(remain+'s',x,y+sz+12);
  ctx.font='8px Arial';ctx.fillStyle='#fff';ctx.fillText('点击攻击',x,y+sz+24);
};
NeutralCreature.prototype.hitTest=function(mx,my){
  var x=this.x*W,y=this.y*H,sz=this.sz*Math.min(W,H)*1.5;
  var dx=mx-x,dy=my-y;return (dx*dx+dy*dy)<sz*sz;
};
NeutralCreature.prototype.die=function(){
  this.alive=false;
  if(this.goldReward>0){gold+=this.goldReward;addP(this.x*W,this.y*H,'+'+this.goldReward+'金!','#ffd700',18);}
  if(this.expReward>0){gainExp(this.expReward);addP(this.x*W,this.y*H,'+'+this.expReward+'EXP!','#4fc3f7',18);}
  for(var j=0;j<10;j++){var a=j*36*Math.PI/180;addP(this.x*W+Math.cos(a)*15,this.y*H+Math.sin(a)*15,'✦',this.col,12);}
};

// 生成中立怪
function spawnNeutrals(){
  if(wave<5||wave%5!==0)return; // 每5波出现
  for(var i=0;i<2;i++)neutrals.push(new NeutralCreature(Math.random()<0.5?'gold':'exp'));
}

// ====== 音效 ======
var audioCtx=null;
function initAudio(){if(!audioCtx)try{audioCtx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}}
function playSound(t){if(!audioCtx)return;try{
  if(t==='ult'){
    // 大招音效 - 低沉轰鸣+高频闪光
    var o1=audioCtx.createOscillator(),g1=audioCtx.createGain();
    o1.connect(g1);g1.connect(audioCtx.destination);
    o1.type='sawtooth';o1.frequency.setValueAtTime(150,audioCtx.currentTime);
    o1.frequency.exponentialRampToValueAtTime(600,audioCtx.currentTime+0.2);
    g1.gain.value=0.2;g1.gain.exponentialRampToValueAtTime(0.01,audioCtx.currentTime+0.4);
    o1.start();o1.stop(audioCtx.currentTime+0.4);
    var o2=audioCtx.createOscillator(),g2=audioCtx.createGain();
    o2.connect(g2);g2.connect(audioCtx.destination);
    o2.type='square';o2.frequency.setValueAtTime(800,audioCtx.currentTime);
    o2.frequency.exponentialRampToValueAtTime(200,audioCtx.currentTime+0.3);
    g2.gain.value=0.1;g2.gain.exponentialRampToValueAtTime(0.01,audioCtx.currentTime+0.3);
    o2.start();o2.stop(audioCtx.currentTime+0.3);
  } else if(t==='hit'){
    var o=audioCtx.createOscillator(),g=audioCtx.createGain();
    o.connect(g);g.connect(audioCtx.destination);
    o.type='square';o.frequency.value=300+Math.random()*200;
    g.gain.value=0.08;g.gain.exponentialRampToValueAtTime(0.01,audioCtx.currentTime+0.08);
    o.start();o.stop(audioCtx.currentTime+0.08);
  } else {
    var o=audioCtx.createOscillator(),g=audioCtx.createGain();
    o.connect(g);g.connect(audioCtx.destination);
    o.frequency.value=400;g.gain.value=0.1;
    g.gain.exponentialRampToValueAtTime(0.01,audioCtx.currentTime+0.15);
    o.start();o.stop(audioCtx.currentTime+0.15);
  }
}catch(e){}}

// ====== 新手教程系统 ======
var TUTORIAL_STEPS = [
  {
    title: '⚔️ 欢迎来到魔兽RPG！',
    desc: '在无尽的怪物浪潮中生存下来！\n点击任意位置开始教程',
    highlight: null,
    arrow: null,
    pos: 'center'
  },
  {
    title: '📊 状态栏',
    desc: '这里显示你的等级、金币、波次\n击杀数和场上怪物数\n怪物超过100个就GG！',
    highlight: '.top',
    arrow: 'down',
    pos: 'top'
  },
  {
    title: '🦸 英雄面板',
    desc: '右侧显示你的职业和属性\n❤️ 生命值 | 💙 魔法值 | ⭐ 经验值\nHP归零也会Game Over！',
    highlight: '.side',
    arrow: 'left',
    pos: 'right'
  },
  {
    title: '💫 释放技能',
    desc: '点击底部技能按钮释放大招！\n💫小必杀：范围伤害，CD短\n⚡大必杀：毁天灭地，CD长\n释放技能消耗MP，MP会自动恢复',
    highlight: '.bot',
    arrow: 'up',
    pos: 'bottom'
  },
  {
    title: '🏰 移动塔位',
    desc: '点击地图上的塔可以移动英雄！\n不同位置打不同路线的怪\n移动有3秒冷却时间',
    highlight: null,
    arrow: null,
    pos: 'center'
  },
  {
    title: '💰 金币与副本',
    desc: '打怪获得金币 → 金币挑战副本\n副本产出海量经验！\n点击⚔️副本按钮进入挑战\n\n🎮 准备好了？开始战斗吧！',
    highlight: '#btn-dungeon',
    arrow: 'up',
    pos: 'bottom'
  }
];

var tutorialStep = -1;
var tutorialDone = false;

function checkTutorial() {
  if (localStorage.getItem('warcraft_tutorial_done')) {
    tutorialDone = true;
    return;
  }
  startTutorial();
}

function startTutorial() {
  tutorialStep = 0;
  state = 'tutorial';
  showTutorialStep();
}

function showTutorialStep() {
  var overlay = document.getElementById('tutorial-overlay');
  var step = TUTORIAL_STEPS[tutorialStep];
  if (!step) { endTutorial(); return; }

  // 清除旧高亮
  var oldHL = document.querySelector('.tutorial-highlight');
  if (oldHL) oldHL.remove();

  // 显示遮罩
  overlay.style.display = 'flex';
  document.getElementById('tut-title').textContent = step.title;
  document.getElementById('tut-desc').textContent = step.desc;
  document.getElementById('tut-counter').textContent = (tutorialStep + 1) + '/' + TUTORIAL_STEPS.length;

  // 高亮区域
  if (step.highlight) {
    var el = document.querySelector(step.highlight);
    if (el) {
      var rect = el.getBoundingClientRect();
      var hl = document.createElement('div');
      hl.className = 'tutorial-highlight';
      hl.style.cssText = 'position:fixed;border:3px solid #ffd700;border-radius:12px;box-shadow:0 0 0 9999px rgba(0,0,0,0.82),0 0 20px rgba(255,215,0,0.5);z-index:999;pointer-events:none;transition:all 0.3s;';
      hl.style.left = (rect.left - 6) + 'px';
      hl.style.top = (rect.top - 6) + 'px';
      hl.style.width = (rect.width + 12) + 'px';
      hl.style.height = (rect.height + 12) + 'px';
      document.body.appendChild(hl);

      // 箭头
      if (step.arrow) {
        var arrow = document.createElement('div');
        arrow.className = 'tutorial-arrow';
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;
        var arrowCSS = 'position:fixed;z-index:1000;pointer-events:none;font-size:32px;animation:arrowBounce 0.8s infinite;';
        if (step.arrow === 'down') { arrowCSS += 'left:' + (cx - 16) + 'px;top:' + (rect.top - 50) + 'px;'; arrow.textContent = '👇'; }
        if (step.arrow === 'up') { arrowCSS += 'left:' + (cx - 16) + 'px;top:' + (rect.bottom + 10) + 'px;'; arrow.textContent = '👆'; }
        if (step.arrow === 'left') { arrowCSS += 'left:' + (rect.left - 50) + 'px;top:' + (cy - 16) + 'px;'; arrow.textContent = '👉'; }
        arrow.style.cssText = arrowCSS;
        document.body.appendChild(arrow);
      }
    }
  }

  // 按钮文字
  var btn = document.getElementById('tut-next');
  btn.textContent = tutorialStep === TUTORIAL_STEPS.length - 1 ? '🎮 开始游戏！' : '下一步 ➡️';
}

function nextTutorialStep() {
  // 清理
  var hl = document.querySelector('.tutorial-highlight');
  if (hl) hl.remove();
  var ar = document.querySelector('.tutorial-arrow');
  if (ar) ar.remove();

  tutorialStep++;
  if (tutorialStep >= TUTORIAL_STEPS.length) {
    endTutorial();
  } else {
    showTutorialStep();
  }
}

function endTutorial() {
  tutorialDone = true;
  localStorage.setItem('warcraft_tutorial_done', '1');
  var overlay = document.getElementById('tutorial-overlay');
  overlay.style.display = 'none';
  var hl = document.querySelector('.tutorial-highlight');
  if (hl) hl.remove();
  var ar = document.querySelector('.tutorial-arrow');
  if (ar) ar.remove();
  state = 'playing';
  showToast('教程完成！祝你好运！');
}

function skipTutorial() {
  endTutorial();
}

// ====== 敌人类 ======
function Enemy(pk,tk){
  var path=pk==='inner'?PATHS.inner:PATHS.outer,type=MTYPES[tk];
  this.path=path;this.wp=0;this.pk=pk;this.tk=tk;
  this.x=path[0].x+(Math.random()-0.5)*0.05;this.y=path[0].y+(Math.random()-0.5)*0.05;
  this.boss=tk==='boss';var wm=1+wave*0.1;
  // 后期指数增长：前10波正常，10波后怪物大幅增强
  var lateScale = wave>10 ? Math.pow(1.12, wave-10) : 1;
  this.hp=(50+wave*12)*type.hpM*wm*lateScale;this.maxHp=this.hp;
  this.def=(3+wave*(this.boss?2:0.8))*lateScale;this.spd=(pk==='inner'?0.004:0.0025)*type.spdM*0.5;
  this.exp=Math.floor((20+wave*8)*(this.boss?5:1)*0.21); // 原始的21%（30%*70%）
  this.sz=this.boss?0.04:(tk==='elite'?0.028:(tk==='tank'?0.03:0.02));
  this.col=type.col;
}
Enemy.prototype.update=function(){
  var t=this.path[this.wp],dx=t.x-this.x,dy=t.y-this.y,d=Math.sqrt(dx*dx+dy*dy);
  if(d<this.spd+0.01)this.wp=(this.wp+1)%this.path.length;
  else{this.x+=(dx/d)*this.spd;this.y+=(dy/d)*this.spd;}
  return true;
};
Enemy.prototype.draw=function(){
  var x=this.x*W,y=this.y*H,sz=this.sz*Math.min(W,H);
  var isCentaur = this.boss || this.tk==='elite';
  
  // 优先使用图片素材
  var spriteKey = isCentaur ? (this.boss?'centaur_boss':'centaur_elite') : ('orc_'+this.tk);
  var sprite = IMAGES[spriteKey] || (isCentaur ? IMAGES.centaur_boss : IMAGES.orc_normal);
  
  if(sprite){
    var imgSz = sz*3;
    // 影子
    ctx.fillStyle='rgba(0,0,0,0.35)';ctx.beginPath();
    ctx.ellipse(x,y+sz*0.8,imgSz*0.4,imgSz*0.1,0,0,Math.PI*2);ctx.fill();
    // 精灵图
    ctx.save();
    ctx.drawImage(sprite, x-imgSz/2, y-imgSz/2, imgSz, imgSz);
    ctx.restore();
  } else {
    // ====== 回退: Canvas绘制 ======
    // (保留原有绘制逻辑)
    var col=this.col;
    ctx.fillStyle='rgba(0,0,0,0.4)';ctx.beginPath();ctx.ellipse(x,y+sz*0.9,sz*0.85,sz*0.22,0,0,Math.PI*2);ctx.fill();
    var g=ctx.createRadialGradient(x-sz*0.2,y-sz*0.2,sz*0.1,x,y,sz*1.1);g.addColorStop(0,shade(col,40));g.addColorStop(0.6,col);g.addColorStop(1,shade(col,-50));
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,sz,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=shade(col,-60);ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(x-sz*0.3,y-sz*0.15,sz*0.2,sz*0.22,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(x+sz*0.3,y-sz*0.15,sz*0.2,sz*0.22,0,0,Math.PI*2);ctx.fill();
    var eyeCol=this.boss?'#f00':'#ff1744';
    ctx.fillStyle=eyeCol;ctx.beginPath();ctx.arc(x-sz*0.28,y-sz*0.12,sz*0.09,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(x+sz*0.32,y-sz*0.12,sz*0.09,0,Math.PI*2);ctx.fill();
  }
  
  // 血条（通用）
  var bw=isCentaur?sz*2.4:sz*2.2,by=y-(isCentaur?sz*1.4:sz)-12,bh=5;
  ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(x-bw/2-1,by-1,bw+2,bh+2);
  var hpPct=this.hp/this.maxHp;
  ctx.fillStyle=hpPct>0.5?'#4caf50':(hpPct>0.25?'#ff9800':'#f44336');
  ctx.fillRect(x-bw/2,by,bw*hpPct,bh);
  ctx.fillStyle='rgba(255,255,255,0.2)';ctx.fillRect(x-bw/2,by,bw*hpPct,bh*0.4);
};

// ====== 副本敌人 ======
function DungeonEnemy(d,level){
  var s=getDungeonStats(d,level);this.x=0.5;this.y=0.5;this.hp=s.hp;this.maxHp=s.hp;this.sz=0.06;this.dungeon=d;this.level=level;this.def=0;
}
DungeonEnemy.prototype.update=function(){return true;};
DungeonEnemy.prototype.draw=function(){
  // 始终在英雄上方
  var hp=hPos();var x=hp.x,y=hp.y-60;
  this.x=x/W;this.y=y/H;
  var sz=this.sz*Math.min(W,H);
  // 光晕脉冲
  ctx.save();var pulse=Math.sin(Date.now()/200)*0.15+0.85;
  ctx.shadowColor='#ffd700';ctx.shadowBlur=20*pulse;
  ctx.fillStyle='#ffd700';ctx.beginPath();ctx.arc(x,y,sz,0,Math.PI*2);ctx.fill();ctx.restore();
  // 副本怪图标
  ctx.font='bold '+(sz*1.0)+'px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.fillText(this.dungeon.icon,x,y);
  // 血条
  ctx.fillStyle='rgba(0,0,0,0.8)';ctx.fillRect(x-50,y-sz-18,100,10);
  var hpPct=this.hp/this.maxHp;
  ctx.fillStyle=hpPct>0.5?'#ffd700':'#ff5252';ctx.fillRect(x-50,y-sz-18,100*hpPct,10);
  ctx.fillStyle='rgba(255,255,255,0.3)';ctx.fillRect(x-50,y-sz-18,100*hpPct,4);
  // 副本名称
  ctx.font='bold 12px Arial';ctx.fillStyle='#ffd700';ctx.fillText(this.dungeon.name+' Lv.'+this.level,x,y-sz-26);
  // 倒计时
  ctx.fillStyle=dungeonTimer<5?'#f44336':'#fff';ctx.font='bold 18px Arial';
  ctx.fillText(Math.ceil(dungeonTimer)+'s',x,y+sz+25);
};

// ====== 粒子 ======
function Particle(x,y,t,c,s){this.x=x;this.y=y;this.t=t;this.c=c;this.s=s||14;this.vy=-2;this.a=1;}
Particle.prototype.update=function(){this.y+=this.vy;this.vy+=0.08;this.a-=0.025;return this.a>0;};
Particle.prototype.draw=function(){ctx.save();ctx.globalAlpha=this.a;ctx.font='bold '+this.s+'px Arial';ctx.textAlign='center';ctx.strokeStyle='#000';ctx.lineWidth=3;ctx.strokeText(this.t,this.x,this.y);ctx.fillStyle=this.c;ctx.fillText(this.t,this.x,this.y);ctx.restore();};
function addP(x,y,t,c,s){particles.push(new Particle(x,y,t,c,s));}

// ====== 持续效果 ======
function LastingEffect(type,x,y,aoe,dmg,dur){this.type=type;this.x=x;this.y=y;this.aoe=aoe;this.dmg=dmg;this.life=dur||120;this.maxLife=this.life;this.tick=0;}
LastingEffect.prototype.update=function(){
  this.life--;this.tick++;
  if(this.tick>=30){this.tick=0;var d=this.dmg;
    if(dungeonEnemy){dungeonEnemy.hp-=d;addP(dungeonEnemy.x*W,dungeonEnemy.y*H-20,'-'+d,'#ffd700',10);if(dungeonEnemy.hp<=0)completeDungeon();}
    else for(var i=0;i<enemies.length;i++){var e=enemies[i];if(dist(this.x,this.y,e.x*W,e.y*H)<this.aoe){e.hp-=d;addP(e.x*W,e.y*H-15,'-'+d,this.type==='big'?'#ffd700':'#4fc3f7',10);}}
  }return this.life>0;
};
LastingEffect.prototype.draw=function(){
  var a=this.life/this.maxLife,p=Math.sin(Date.now()/80)*0.3+0.7;
  ctx.save();
  if(this.type==='small'){
    ctx.globalAlpha=a*0.5;ctx.strokeStyle='#4fc3f7';ctx.lineWidth=3;ctx.beginPath();ctx.arc(this.x,this.y,this.aoe*0.5*p,0,Math.PI*2);ctx.stroke();
    for(var i=0;i<8;i++){var ang=(Date.now()/40+i*45)*Math.PI/180;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(this.x+Math.cos(ang)*this.aoe*0.4,this.y+Math.sin(ang)*this.aoe*0.4,5,0,Math.PI*2);ctx.fill();}
  }else{
    ctx.globalAlpha=a*0.3;var g=ctx.createRadialGradient(this.x,this.y,0,this.x,this.y,this.aoe);g.addColorStop(0,'rgba(255,215,0,0.8)');g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.beginPath();ctx.arc(this.x,this.y,this.aoe,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=a*0.7;ctx.strokeStyle='#fff';ctx.lineWidth=2;for(var i=0;i<6;i++){var ang=Math.random()*Math.PI*2,d2=Math.random()*this.aoe*0.8;ctx.beginPath();ctx.moveTo(this.x,this.y);ctx.lineTo(this.x+Math.cos(ang)*d2,this.y+Math.sin(ang)*d2);ctx.stroke();}
    for(var i=0;i<12;i++){var ang=(Date.now()/30+i*30)*Math.PI/180,r=this.aoe*(0.3+Math.sin(Date.now()/200+i)*0.2);ctx.fillStyle=i%2?'#ffd700':'#ff6f00';ctx.beginPath();ctx.arc(this.x+Math.cos(ang)*r,this.y+Math.sin(ang)*r,5,0,Math.PI*2);ctx.fill();}
  }
  ctx.restore();
};

// ====== 工具 ======
function dist(x1,y1,x2,y2){return Math.sqrt((x1-x2)*(x1-x2)+(y1-y2)*(y1-y2));}
function shade(c,p){if(!c||c[0]!=='#')return c;var n=parseInt(c.slice(1),16),a=Math.round(2.55*p);return '#'+(0x1000000+Math.max(0,Math.min(255,(n>>16)+a))*0x10000+Math.max(0,Math.min(255,((n>>8)&0xff)+a))*0x100+Math.max(0,Math.min(255,(n&0xff)+a))).toString(16).slice(1);}
function showToast(t){var e=document.getElementById('toast');e.textContent=t;e.style.display='block';setTimeout(function(){e.style.display='none';},2000);}

// ====== 自动攻击 ======
function autoAtk(){
  hero.atkTimer+=0.016;var hd=hData();
  var atkInterval=hd.atkSpd*0.5/Math.pow(1.2,hero.promo||0); // 200%速度 + 每转+120%
  if(hero.atkTimer<atkInterval)return;hero.atkTimer=0;
  var hp=hPos(),range=hd.range*Math.min(W,H);
  if(dungeonEnemy){
    var d=Math.max(1,Math.floor(hero.atk*3.0*getAtkMult()*hero.buff*(hero._atkBonus||1)*getSynergyMult()));
    // 法穿: 无视30%护甲
    var hd2=hData();if(hd2.extraPassive&&hd2.extraPassive.indexOf('法穿')>=0){d=Math.max(1,Math.floor(d*1.15));}
    dungeonEnemy.hp-=d;addP(dungeonEnemy.x*W,dungeonEnemy.y*H-20,'-'+d,'#ffd700',14);playSound('hit');
    // 吸血
    if(hd2.extraPassive&&hd2.extraPassive.indexOf('吸血')>=0){hero.hp=Math.min(hero.maxHp,hero.hp+Math.floor(d*0.15));}
    if(dungeonEnemy.hp<=0)completeDungeon();return;
  }
  var t=null,md=Infinity;for(var i=0;i<enemies.length;i++){var e=enemies[i],d=dist(hp.x,hp.y,e.x*W,e.y*H);if(d<range&&d<md){md=d;t=e;}}
  if(t){
    var d=Math.max(1,Math.floor(hero.atk*3.0*getAtkMult()*hero.buff*(hero._atkBonus||1)*getSynergyMult()-t.def));
    var hd2=hData();if(hd2.extraPassive&&hd2.extraPassive.indexOf('法穿')>=0){d=Math.max(1,Math.floor(d*1.15));}
    // 感电: 10%概率额外闪电
    if(hd2.extraPassive&&hd2.extraPassive.indexOf('感电')>=0&&Math.random()<0.1){
      d=Math.floor(d*1.5);addP(t.x*W,t.y*H-25,'⚡','#7c4dff',18);
    }
    t.hp-=d;addP(t.x*W,t.y*H-15,'-'+d,hd.color,12);playSound('hit');
    // 吸血
    if(hd2.extraPassive&&hd2.extraPassive.indexOf('吸血')>=0){hero.hp=Math.min(hero.maxHp,hero.hp+Math.floor(d*0.15));}
  }
}

// ====== 塔位副英雄自动攻击 ======
function towerHeroesAutoAtk(){
  for(var ti=0; ti<towerSlots.length; ti++){
    if(ti===hero.towerIdx || !towerSlots[ti] || !towerHeroStates[ti]) continue;
    var key = towerSlots[ti];
    var h = HEROES[key];
    var st = towerHeroStates[ti];
    st.atkTimer += 0.016;
    var atkInterval = h.atkSpd * 0.6; // 副英雄攻速稍慢
    if(st.atkTimer < atkInterval) continue;
    st.atkTimer = 0;
    // MP自然恢复
    var mpRegen = h.type==='int'?3.0:(h.type==='agi'?2.0:1.5);
    st.mp = Math.min(st.maxMp, st.mp + mpRegen/60);
    var tx = TOWERS[ti].x*W, ty = TOWERS[ti].y*H;
    var range = h.range * Math.min(W,H);
    // 副英雄攻击力 = 主英雄的50%
    var towerAtk = Math.floor(hero.atk * 0.5);
    var typeAtkMult = h.type==='int'?0.8:1.0;
    if(dungeonEnemy){
      var d = Math.max(1, Math.floor(towerAtk * 3.0 * typeAtkMult * hero.buff * getSynergyMult()));
      dungeonEnemy.hp -= d;
      addP(dungeonEnemy.x*W, dungeonEnemy.y*H-20, '-'+d, h.color, 10);
      if(dungeonEnemy.hp<=0) completeDungeon();
      continue;
    }
    var target=null, minDist=Infinity;
    for(var i=0;i<enemies.length;i++){
      var e=enemies[i], dd=dist(tx,ty,e.x*W,e.y*H);
      if(dd<range && dd<minDist){minDist=dd;target=e;}
    }
    if(target){
      var d = Math.max(1, Math.floor(towerAtk * 3.0 * typeAtkMult * hero.buff * getSynergyMult() - target.def));
      // 法穿
      if(h.extraPassive && h.extraPassive.indexOf('法穿')>=0) d = Math.max(1, Math.floor(d*1.15));
      // 感电
      if(h.extraPassive && h.extraPassive.indexOf('感电')>=0 && Math.random()<0.1){
        d = Math.floor(d*1.5); addP(target.x*W,target.y*H-25,'⚡','#7c4dff',14);
      }
      target.hp -= d;
      addP(target.x*W, target.y*H-15, '-'+d, h.color, 10);
      // 吸血
      if(h.extraPassive && h.extraPassive.indexOf('吸血')>=0){
        hero.hp = Math.min(hero.maxHp, hero.hp + Math.floor(d*0.15));
      }
    }
  }
}

// 塔位副英雄释放技能
function useTowerHeroSkill(towerIdx, skillIdx){
  var key = towerSlots[towerIdx];
  var st = towerHeroStates[towerIdx];
  if(!key || !st) return;
  var h = HEROES[key];
  var sk = st.skills[skillIdx];
  if(sk.cd > 0){showToast(sk.name+' 冷却中: '+Math.ceil(sk.cd)+'s');return;}
  if(st.mp < sk.cost){showToast('MP不足!');return;}
  sk.cd = sk.maxCd;
  st.mp -= sk.cost;
  var tx = TOWERS[towerIdx].x*W, ty = TOWERS[towerIdx].y*H;
  var aoe = sk.aoe * Math.min(W,H);
  var towerAtk = Math.floor(hero.atk * 0.5);
  var dmg = Math.floor(towerAtk * sk.dmg * hero.buff * 0.15 * getSynergyMult());
  // 技能名称
  addP(tx, ty-70, sk.name, sk.type==='big'?h.color:'#fff', sk.type==='big'?28:22);
  addP(tx, ty-40, sk.ic, h.color, 24);
  // 持续效果
  lastingEffects.push(new LastingEffect(sk.type, tx, ty, aoe, dmg, 120));
  // 伤害
  if(dungeonEnemy){
    var d = Math.max(1, Math.floor(towerAtk * sk.dmg * hero.buff * getSynergyMult()));
    dungeonEnemy.hp -= d;
    addP(dungeonEnemy.x*W, dungeonEnemy.y*H-20, '-'+d, '#ffd700', 14);
    if(dungeonEnemy.hp<=0) completeDungeon();
  } else {
    for(var i=0;i<enemies.length;i++){
      var e=enemies[i];
      if(dist(tx,ty,e.x*W,e.y*H)<aoe){
        var d = Math.max(1, Math.floor(towerAtk * sk.dmg * hero.buff * getSynergyMult() - e.def));
        e.hp -= d;
        addP(e.x*W, e.y*H-15, '-'+d, sk.type==='big'?h.color:'#4fc3f7', 12);
      }
    }
  }
  // 粒子特效
  var fxCount = sk.type==='big'?12:6;
  for(var j=0;j<fxCount;j++){
    var ang = j*(360/fxCount)*Math.PI/180;
    addP(tx+Math.cos(ang)*aoe*0.5, ty+Math.sin(ang)*aoe*0.5, sk.ic, h.color, 18);
  }
  shake = sk.type==='big'?8:4;
  playSound('ult');
}
function useSkill(idx){
  var sk=hero.skills[idx];if(sk.cd>0||hero.mp<sk.cost)return;
  sk.cd=sk.maxCd;hero.mp-=sk.cost;var hp=hPos(),hd=hData(),aoe=sk.aoe*Math.min(W,H);
  
  // 技能名称大字
  var nameColor=sk.type==='big'?hd.color:'#fff';
  var nameSize=sk.type==='big'?36:28;
  addP(hp.x,hp.y-70,sk.name,nameColor,nameSize);
  addP(hp.x,hp.y-40,sk.ic,nameColor,32);
  
  // 显示范围
  showRangeTimer=30;
  
  // 持续伤害效果
  var dmg=Math.floor(hero.atk*sk.dmg*hero.buff*0.15*getSynergyMult());
  lastingEffects.push(new LastingEffect(sk.type,hp.x,hp.y,aoe,dmg,120));
  
  // ====== 英雄专属特效 ======
  var fxCount = sk.type==='big'?20:10;
  
  switch(sk.fx){
    // ====== 小必杀特效 ======
    case 'earth_split': // 裂地击 - 地面裂缝
      for(var j=0;j<8;j++){
        var ang=j*45*Math.PI/180;
        addP(hp.x+Math.cos(ang)*aoe*0.4,hp.y+Math.sin(ang)*aoe*0.4,'💥','#8B4513',16);
      }
      addP(hp.x,hp.y,' fissure','#ff6f00',28);
      break;
    case 'pierce': // 穿云箭 - 直线穿透
      for(var j=0;j<6;j++){addP(hp.x+(Math.random()-0.5)*aoe,hp.y-j*20,'➹','#2979ff',18);}
      addP(hp.x,hp.y-60,'💨','#fff',24);
      break;
    case 'arcane': // 奥术爆破 - 紫色能量
      for(var j=0;j<8;j++){var ang=j*45*Math.PI/180;addP(hp.x+Math.cos(ang)*aoe*0.35,hp.y+Math.sin(ang)*aoe*0.35,'💜','#ffd600',18);}
      addP(hp.x,hp.y,'✨','#ff00ff',28);
      break;
    case 'slash': // 瞬斩 - 十字斩
      addP(hp.x-aoe*0.3,hp.y,'╱','#ff5252',30);addP(hp.x+aoe*0.3,hp.y,'╲','#ff5252',30);
      addP(hp.x,hp.y,'⚔️','#fff',24);
      break;
    case 'quake': // 地震波 - 同心圆扩散
      for(var r=1;r<=3;r++){for(var j=0;j<6;j++){var ang=j*60*Math.PI/180+r*20;addP(hp.x+Math.cos(ang)*aoe*r*0.2,hp.y+Math.sin(ang)*aoe*r*0.2,'🌋','#ff8f00',14);}}
      break;
    case 'gale_stab': // 疾风刺 - 快速连击
      for(var j=0;j<5;j++){addP(hp.x+Math.cos(j*0.8)*aoe*0.4,hp.y+Math.sin(j*0.8)*aoe*0.4,'🗡️','#00e676',16);}
      addP(hp.x,hp.y,'💨','#fff',24);
      break;
    case 'shadow_strike': // 暗影突袭 - 暗影漩涡
      for(var j=0;j<8;j++){var ang=j*45*Math.PI/180;addP(hp.x+Math.cos(ang)*aoe*0.3,hp.y+Math.sin(ang)*aoe*0.3,'👁️','#7b1fa2',16);}
      addP(hp.x,hp.y,'🌑','#000',28);
      break;
    case 'ice_bolt': // 冰锥术 - 冰锥散射
      for(var j=0;j<8;j++){var ang=j*45*Math.PI/180;addP(hp.x+Math.cos(ang)*aoe*0.4,hp.y+Math.sin(ang)*aoe*0.4,'❄️','#4fc3f7',18);}
      addP(hp.x,hp.y,'🧊','#b3e5fc',24);
      break;
    case 'fireball': // 火球术 - 火焰爆裂
      for(var j=0;j<6;j++){var ang=Math.random()*Math.PI*2,d2=Math.random()*aoe*0.4;addP(hp.x+Math.cos(ang)*d2,hp.y+Math.sin(ang)*d2,'🔥','#ff4400',20);}
      addP(hp.x,hp.y,'💥','#ff6f00',30);
      break;
    case 'arc': // 电弧闪 - 电流跳跃
      var ax=hp.x,ay=hp.y;for(var j=0;j<5;j++){var nx=ax+(Math.random()-0.5)*aoe*0.5,ny=ay+(Math.random()-0.5)*aoe*0.5;addP(nx,ny,'⚡','#7c4dff',18);ax=nx;ay=ny;}
      break;
    // ====== 大必杀特效 ======
    case 'spin': // 旋风斩 - 旋转刀光
      for(var j=0;j<fxCount;j++){
        var ang=j*(360/fxCount)*Math.PI/180;
        addP(hp.x+Math.cos(ang)*aoe*0.6,hp.y+Math.sin(ang)*aoe*0.6,'⚔️',hd.color,22);
      }
      addP(hp.x,hp.y,'💥','#ff6f00',40);
      break;
    case 'rain': // 箭雨 - 从上方落下
      for(var j=0;j<fxCount*2;j++){
        var rx=hp.x+(Math.random()-0.5)*aoe*2,ry=hp.y+(Math.random()-0.5)*aoe*2;
        addP(rx,ry-80,'↓','#2979ff',18);
        addP(rx,ry-60,'➳','#fff',14);
      }
      break;
    case 'meteor': // 陨石雨 - 燃烧陨石
      for(var j=0;j<fxCount;j++){
        var ang=Math.random()*Math.PI*2,dist2=Math.random()*aoe*0.8;
        addP(hp.x+Math.cos(ang)*dist2,hp.y+Math.sin(ang)*dist2-60,'☄️','#ff6f00',28);
        addP(hp.x+Math.cos(ang)*dist2,hp.y+Math.sin(ang)*dist2,'💥','#ffd700',20);
      }
      addP(hp.x,hp.y,'🔥','#ff4400',36);
      break;
    case 'bladestorm': // 剑刃风暴 - 高速旋转
      for(var j=0;j<fxCount*2;j++){
        var ang=(Date.now()/5+j*18)*Math.PI/180;
        addP(hp.x+Math.cos(ang)*aoe*0.5,hp.y+Math.sin(ang)*aoe*0.5,'🗡️','#ff5252',20);
      }
      addP(hp.x,hp.y,'🌀','#ff0000',42);
      break;
    case 'thunder': // 雷霆一击 - 闪电劈落
      for(var j=0;j<8;j++){
        var ang=j*45*Math.PI/180;
        addP(hp.x+Math.cos(ang)*aoe*0.3,hp.y+Math.sin(ang)*aoe*0.3,'⚡','#ffd700',30);
        addP(hp.x+Math.cos(ang)*aoe*0.6,hp.y+Math.sin(ang)*aoe*0.6,'⚡','#fff',22);
      }
      addP(hp.x,hp.y-20,'💫','#ffd700',40);
      break;
    case 'snipe': // 精准射击 - 单点爆发
      addP(hp.x,hp.y,'🎯','#00e676',40);
      addP(hp.x,hp.y-10,'💥','#ff0000',50);
      for(var j=0;j<6;j++){
        addP(hp.x+(Math.random()-0.5)*40,hp.y+(Math.random()-0.5)*40,'✦','#00e676',16);
      }
      break;
    case 'poison': // 毒蛇陷阱 - 毒雾弥漫
      for(var j=0;j<fxCount;j++){
        var ang=Math.random()*Math.PI*2,d2=Math.random()*aoe*0.7;
        addP(hp.x+Math.cos(ang)*d2,hp.y+Math.sin(ang)*d2,'☠️','#7b1fa2',18);
      }
      addP(hp.x,hp.y,'🐍','#9c27b0',36);
      break;
    case 'frost': // 冰封领域 - 冰晶扩散
      for(var j=0;j<fxCount;j++){
        var ang=j*(360/fxCount)*Math.PI/180;
        addP(hp.x+Math.cos(ang)*aoe*0.7,hp.y+Math.sin(ang)*aoe*0.7,'❄️','#4fc3f7',24);
        addP(hp.x+Math.cos(ang)*aoe*0.4,hp.y+Math.sin(ang)*aoe*0.4,'💎','#b3e5fc',16);
      }
      addP(hp.x,hp.y,'🧊','#fff',40);
      break;
    case 'flame': // 烈焰之柱 - 地火喷涌
      for(var j=0;j<fxCount;j++){
        var ang=Math.random()*Math.PI*2,d2=Math.random()*aoe*0.6;
        addP(hp.x+Math.cos(ang)*d2,hp.y+Math.sin(ang)*d2,'🔥','#ff4400',26);
        addP(hp.x+Math.cos(ang)*d2,hp.y+Math.sin(ang)*d2-20,'🌋','#ff6f00',20);
      }
      addP(hp.x,hp.y,'💥','#ff0000',42);
      break;
    case 'chain': // 连锁闪电 - 弹射轨迹
      var prevX=hp.x,prevY=hp.y;
      for(var j=0;j<8;j++){
        var nx=prevX+(Math.random()-0.5)*aoe*0.6,ny=prevY+(Math.random()-0.5)*aoe*0.6;
        addP(nx,ny,'⚡','#7c4dff',22);
        addP((prevX+nx)/2,(prevY+ny)/2,'⚡','#b388ff',16);
        prevX=nx;prevY=ny;
      }
      addP(hp.x,hp.y,'⚡','#fff',38);
      break;
    default: // ring - 默认环形冲击
      for(var j=0;j<(sk.type==='big'?15:8);j++){
        var ang=j*(sk.type==='big'?24:45)*Math.PI/180;
        addP(hp.x+Math.cos(ang)*aoe*0.5,hp.y+Math.sin(ang)*aoe*0.5,sk.ic,hd.color,20);
      }
      if(sk.type==='big'){addP(hp.x,hp.y,'💥','#ff6f00',36);}
  }
  
  // 伤害判定
  if(dungeonEnemy){var d=Math.max(1,Math.floor(hero.atk*sk.dmg*hero.buff*getSynergyMult()));dungeonEnemy.hp-=d;addP(dungeonEnemy.x*W,dungeonEnemy.y*H-20,'-'+d,'#ffd700',16);if(dungeonEnemy.hp<=0)completeDungeon();}
  else{for(var i=0;i<enemies.length;i++){var e=enemies[i];if(dist(hp.x,hp.y,e.x*W,e.y*H)<aoe){var d=Math.max(1,Math.floor(hero.atk*sk.dmg*hero.buff-e.def));e.hp-=d;addP(e.x*W,e.y*H-15,'-'+d,sk.type==='big'?hd.color:'#4fc3f7',14);}}}
  shake=sk.type==='big'?12:6;playSound('ult');updateSkUI();
}

// ====== 看广告回蓝 ======
var adCooldown=0;
function watchAd(){
  if(state!=='playing'){showToast('战斗中才能看广告!');return;}
  if(adCooldown>0){showToast('冷却中: '+Math.ceil(adCooldown)+'s');return;}
  if(hero.mp>=hero.maxMp){showToast('蓝量已满!');return;}
  // 模拟广告 - 3秒倒计时
  state='paused';
  var adModal=document.getElementById('ad-modal');
  var adTimer=3;
  adModal.classList.add('show');
  document.getElementById('ad-timer').textContent=adTimer;
  var adIv=setInterval(function(){
    adTimer--;
    document.getElementById('ad-timer').textContent=adTimer;
    if(adTimer<=0){
      clearInterval(adIv);
      adModal.classList.remove('show');
      hero.mp=hero.maxMp;
      adCooldown=30; // 30秒冷却
      state='playing';
      showToast('✨ 魔法全满!');
    }
  },1000);
}
function showDungeonMenu(){
  console.log('打开副本菜单');state='paused';selectedDungeon=null;
  var modal=document.getElementById('dungeon-modal'),list=document.getElementById('dungeon-list'),panel=document.getElementById('lvl-panel');
  list.innerHTML='';
  for(var i=0;i<DUNGEONS.length;i++){
    var d=DUNGEONS[i],lvl=dungeonLevels[d.type],s=getDungeonStats(d,lvl);
    var card=document.createElement('div');card.className='card';card.style.cursor='pointer';
    // 显示当前可挑战的最高等级和消耗
    card.innerHTML='<div class="icon">'+d.icon+'</div><div class="name">'+d.name+'</div><div class="level">Lv.1-'+lvl+'</div><div class="desc" style="color:#ffd700;font-size:11px;font-weight:bold;">💰'+s.cost+'金 → ⭐'+s.exp+'EXP</div><div class="desc">挑战副本获取海量经验！</div>';
    (function(dd){card.onclick=function(){selectedDungeon=dd;showLevelSelect();};})(d);
    list.appendChild(card);
  }
  if(panel)panel.style.display='none';if(modal)modal.classList.add('show');
}

function showLevelSelect(){
  if(!selectedDungeon)return;console.log('显示等级:',selectedDungeon.name);
  var panel=document.getElementById('lvl-panel'),grid=document.getElementById('lvl-grid');
  grid.innerHTML='';var maxLvl=dungeonLevels[selectedDungeon.type];
  for(var i=1;i<=10;i++){
    var btn=document.createElement('div'),key=selectedDungeon.type+'_'+i,completed=dungeonCompleted[key],locked=i>maxLvl;
    var s=getDungeonStats(selectedDungeon,i);
    btn.className='lvl-btn'+(locked?' locked':'')+(completed?' completed':'');
    btn.innerHTML='Lv.'+i+(completed?' ✓':'')+'<div style="font-size:8px;color:#ffd700;margin-top:2px;">💰'+s.cost+'</div>';
    if(i<=maxLvl&&!completed){
      (function(dType,lvl){btn.onclick=function(){var d=null;for(var j=0;j<DUNGEONS.length;j++)if(DUNGEONS[j].type===dType){d=DUNGEONS[j];break;}
      if(d){var s=getDungeonStats(d,lvl);if(gold<s.cost){showToast('金币不足!需'+s.cost+'金，当前'+gold+'金');return;}enterDungeon(d,lvl);}};})(selectedDungeon.type,i);
    }grid.appendChild(btn);
  }panel.style.display='block';
}

function enterDungeon(d,level){
  var s=getDungeonStats(d,level);if(gold<s.cost){showToast('金币不足!');return;}
  gold-=s.cost;dungeonActive=d;dungeonEnemy=new DungeonEnemy(d,level);dungeonTimer=s.time;
  // 英雄回到中心站桩
  hero.towerIdx=4;moveCd=0;
  // 副本怪显示在英雄上方
  dungeonEnemy.x=TOWERS[4].x;dungeonEnemy.y=TOWERS[4].y-0.12;
  document.getElementById('dungeon-modal').classList.remove('show');state='playing';
  showToast('⚔️ 进入'+d.name+' Lv.'+level+'!');
}

function completeDungeon(){
  var d=dungeonActive,lvl=dungeonEnemy.level,s=getDungeonStats(d,lvl);
  var expGain=Math.floor(s.exp*2.5); // 经验250%
  gainExp(expGain);addP(W/2,H/2,'+'+expGain+'EXP!','#4fc3f7',22);
  dungeonCompleted[d.type+'_'+lvl]=true;
  if(dungeonLevels[d.type]===lvl&&lvl<10)dungeonLevels[d.type]++;
  dungeonEnemy=null;dungeonActive=null;playSound('ult');showToast('副本完成!');
  // 每日任务: 副本完成
  addTaskProgress('dungeon1',1);
}
function failDungeon(){dungeonEnemy=null;dungeonActive=null;showToast('副本失败!');}

// ====== 开局英雄选择 ======
function showHeroSelect(){
  state='paused';
  var modal=document.getElementById('hero-select-modal'),cards=document.getElementById('hero-select-cards');
  cards.innerHTML='';
  var heroKeys=Object.keys(HEROES);
  for(var i=0;i<heroKeys.length;i++){
    var key=heroKeys[i],h=HEROES[key];
    var card=document.createElement('div');
    card.className='card';
    card.style.borderColor=h.color;
    card.innerHTML='<div class="icon">'+h.icon+'</div>'
      +'<div class="name" style="color:'+h.color+'">'+h.name+'</div>'
      +'<div class="desc" style="color:#aaa;font-size:9px;">['+(h.type==='str'?'力量':h.type==='agi'?'敏捷':'智力')+']</div>'
      +'<div class="desc">'+h.passive+'</div>'
      +'<div class="desc" style="color:'+h.color+';margin-top:4px;font-weight:bold;">'+h.skills[1].ic+' '+h.skills[1].name+'</div>'
      +'<div class="desc" style="font-size:8px;">'+h.skills[1].desc+'</div>';
    (function(k){card.onclick=function(){selectHero(k);};})(key);
    cards.appendChild(card);
  }
  modal.classList.add('show');
}

function selectHero(key){
  hero.cls=key;
  initHeroSkills();
  heroCollection=[key];
  towerSlots=[null,null,null,null,null];
  towerSlots[hero.towerIdx]=key;
  document.getElementById('hero-select-modal').classList.remove('show');
  state='playing';
  var hd=HEROES[key];
  showToast('选择了 '+hd.icon+' '+hd.name+'！');
}

// ====== 升级转职 ======
function gainExp(a){hero.exp+=a;while(hero.exp>=hero.expNeed){hero.exp-=hero.expNeed;levelUp();}}
function levelUp(){hero.lv++;hero.expNeed=Math.floor(100*Math.pow(hero.lv,1.15));hero.maxHp+=25;hero.hp=hero.maxHp;hero.atk+=4;hero.def+=2;
  var hd=hData();if(hd.extraPassive&&hd.extraPassive.indexOf('剑意')>=0){hero.atk+=1;hero.killStacks=Math.min((hero.killStacks||0)+1,50);}
  var hp=hPos();addP(hp.x,hp.y-35,'LEVEL UP!','#ffd700',20);playSound('ult');
  var hp=hPos();addP(hp.x,hp.y-35,'LEVEL UP!','#ffd700',20);playSound('ult');
  if(hero.lv===10&&hero.promo===0)showPromo();if(hero.lv===20&&hero.promo===1)showPromo();if(hero.lv===30&&hero.promo===2)showPromo();
}

function showPromo(){
  state='paused';var modal=document.getElementById('promo-modal'),cards=document.getElementById('promo-cards');cards.innerHTML='';
  var hd=hData();
  // 保留当前英雄
  var keep=document.createElement('div');keep.className='card';keep.style.borderColor=hd.color;keep.style.minWidth='130px';
  keep.innerHTML='<div class="icon" style="font-size:42px;">'+hd.icon+'</div>'
    +'<div class="name" style="color:'+hd.color+';font-size:16px;">'+hd.cnName+'</div>'
    +'<div class="desc" style="color:#aaa;font-size:10px;">【'+hd.title+'】'+hd.name+'（当前）</div>'
    +'<div class="bonus" style="font-size:12px;color:#4caf50;margin-top:4px;">全属性+5%</div>'
    +'<div class="desc" style="color:#ffd700;font-size:10px;margin-top:4px;">保留当前英雄</div>';
  keep.onclick=function(){doPromo(false,hero.cls);};cards.appendChild(keep);
  // 自动转职
  var auto=document.createElement('div');auto.className='card auto';
  auto.innerHTML='<div class="icon" style="font-size:48px;">🎲</div><div class="name" style="color:#ff9800;font-size:15px;">随机转职</div><div class="bonus" style="font-size:13px;color:#4caf50;">全属性+15%</div><div class="desc">命运决定你的道路</div>';
  auto.onclick=function(){doPromo(true);};cards.appendChild(auto);
  // 其他英雄选择
  var opts=getPromoOpts();for(var i=0;i<opts.length;i++){
    var o=opts[i],c=document.createElement('div');c.className='card';c.style.borderColor=o.color;c.style.minWidth='130px';
    c.innerHTML='<div class="icon" style="font-size:42px;">'+o.icon+'</div>'
      +'<div class="name" style="color:'+o.color+';font-size:16px;">'+o.cnName+'</div>'
      +'<div class="desc" style="color:#aaa;font-size:10px;">【'+o.title+'】'+o.name+'</div>'
      +'<div class="bonus" style="font-size:12px;color:#4caf50;margin-top:4px;">全属性+5%</div>'
      +'<div class="desc" style="color:'+o.color+';font-size:10px;margin-top:4px;">'+o.skills[1].ic+' '+o.skills[1].name+'</div>'
      +'<div class="desc" style="font-size:9px;color:#888;">'+(o.extraPassive||'')+'</div>';
    (function(k){c.onclick=function(){doPromo(false,k);};})(o.key);cards.appendChild(c);
  }
  modal.classList.add('show');
}
function getPromoOpts(){var hd=hData(),o=[],keys=Object.keys(HEROES);
  // 排除当前职业，随机显示2-3个可选职业
  var available=keys.filter(function(k){return k!==hero.cls;});
  // 根据类型偏好选择
  var sameType=available.filter(function(k){return HEROES[k].type===hd.type;});
  var diffType=available.filter(function(k){return HEROES[k].type!==hd.type;});
  if(sameType.length>0)o.push({key:sameType[0],...HEROES[sameType[0]]});
  if(diffType.length>0)o.push({key:diffType[0],...HEROES[diffType[0]]});
  if(diffType.length>1)o.push({key:diffType[1],...HEROES[diffType[1]]});
  return o;
}
function doPromo(auto,key){var b=auto?1.15:1.05;if(auto){var o=getPromoOpts();key=o[Math.floor(Math.random()*o.length)].key;}hero.cls=key;hero.buff*=b;
  hero.promo++;
  // 攻击基于转职倍率重新计算
  var baseAtk=30+(hero.lv-1)*4;hero.atk=Math.floor(baseAtk*getPromoAtkMult(hero.promo));
  hero.def=Math.floor(hero.def*b)+hero.promo*5;
  hero.maxHp=Math.floor(hero.maxHp*b)+hero.promo*50;hero.hp=hero.maxHp;
  hero.maxMp=getMpByPromo(hero.promo);hero.mp=hero.maxMp;
  initHeroSkills(); // 转职后重新初始化技能
  // 更新收集和塔位
  if(heroCollection.indexOf(key)<0) heroCollection.push(key);
  towerSlots[hero.towerIdx]=key;
  checkSynergy();
  document.getElementById('promo-modal').classList.remove('show');state='playing';var hp=hPos();addP(hp.x,hp.y-40,'转职:'+HEROES[key].name,'#ffd700',24);playSound('ult');
}

// ====== 波次 ======
function spawnWave(){
  var count=wave<=10?Math.max(10,(6+Math.floor(wave*1.5))*2):(10+Math.floor(Math.random()*11)),boss=wave%5===0;
  var ann=document.getElementById('wave-ann');ann.className=boss?'wave-ann boss':'wave-ann';ann.innerHTML=boss?'⚠️ BOSS ⚠️':'WAVE '+wave;ann.style.display='block';setTimeout(function(){ann.style.display='none';},2000);
  var n=0;var iv=setInterval(function(){if(n>=count||state==='gameover'){clearInterval(iv);return;}
    if(boss&&n===0)enemies.push(new Enemy('outer','boss'));else{var pk=Math.random()<0.5?'inner':'outer',r=Math.random(),tk='normal';if(wave>2&&r<0.15)tk='fast';else if(wave>4&&r<0.25)tk='tank';else if(wave>6&&r<0.32)tk='elite';enemies.push(new Enemy(pk,tk));}n++;},500);
  spawnNeutrals(); // 生成中立怪
}

function checkEnd(){
  if(kills>=1000)gameOver('🏆 胜利！击杀1000敌人！');
  if(enemies.length>=180)gameOver('敌人超过180!');
  if(hero.hp<=0)gameOver('英雄阵亡!');
}
function gameOver(r){
  state='gameover';
  var goDiv=document.getElementById('gameover');
  var isWin = r.indexOf('胜利')>=0;
  goDiv.className = 'gameover show '+(isWin?'go-victory':'go-defeat');
  document.getElementById('go-title').textContent = isWin?'🏆 胜 利 🏆':'💀 败 北 💀';
  document.getElementById('go-subtitle').textContent = isWin?'千军之中取敌首级！':'乱军之中力竭而亡...';
  document.getElementById('go-wave').textContent=wave;
  document.getElementById('go-kills').textContent=kills;
  document.getElementById('go-lv').textContent=hero.lv;
  document.getElementById('go-collect').textContent=heroCollection.length;
  document.getElementById('go-reason').textContent=r;
  // 英雄信息
  var hd=hData();
  document.getElementById('go-hero').innerHTML='<span class="go-hero-icon">'+hd.icon+'</span><span class="go-hero-name">'+hd.cnName+' Lv.'+hero.lv+'</span>';
  // 连横信息
  if(synergyInfo){
    var tn=synergyInfo.type==='str'?'力量':(synergyInfo.type==='agi'?'敏捷':'智力');
    document.getElementById('go-synergy').textContent='⚡ '+tn+'连横已激活';
  } else {
    document.getElementById('go-synergy').textContent='';
  }
  // 粒子特效
  var pDiv=document.getElementById('go-particles');
  pDiv.innerHTML='';
  var colors = isWin?['#ffd700','#ff9800','#ffeb3b','#fff']:['#ff4444','#ff0000','#ff6600','#990000'];
  for(var i=0;i<40;i++){
    var p=document.createElement('div');
    var sz=2+Math.random()*4;
    var c=colors[Math.floor(Math.random()*colors.length)];
    p.style.cssText='position:absolute;width:'+sz+'px;height:'+sz+'px;background:'+c+';border-radius:50%;left:'+Math.random()*100+'%;top:'+Math.random()*100+'%;opacity:'+(0.3+Math.random()*0.7)+';animation:goParticle '+(2+Math.random()*3)+'s infinite '+(Math.random()*2)+'s;';
    pDiv.appendChild(p);
  }
}

// ====== UI ======
function updateUI(){
  document.getElementById('lv').textContent=hero.lv;document.getElementById('side-lv').textContent=hero.lv;
  document.getElementById('gold').textContent=gold;document.getElementById('wave').textContent=wave;
  document.getElementById('kills').textContent=kills;document.getElementById('enemies').textContent=enemies.length;
  document.getElementById('enemies').style.color=enemies.length>150?'#f44336':enemies.length>120?'#ff9800':'#ffd700';
  var hd=hData();document.getElementById('class-skin').textContent=hd.avatar;document.getElementById('class-name').textContent=hd.cnName;
  document.getElementById('class-sub').textContent='【'+hd.title+'】'+hd.name;
  document.getElementById('passive-skill').textContent=hd.extraPassive||'';
  // 不屈被动: HP<30%时攻击+50%
  var atkBonus=1;
  if(hd.extraPassive&&hd.extraPassive.indexOf('不屈')>=0&&hero.hp<hero.maxHp*0.3)atkBonus=1.5;
  hero._atkBonus=atkBonus;
  document.getElementById('hp-bar').style.width=(hero.hp/hero.maxHp*100)+'%';
  document.getElementById('mp-bar').style.width=(hero.mp/hero.maxMp*100)+'%';
  document.getElementById('exp-bar').style.width=(hero.exp/hero.expNeed*100)+'%';
  var mc=document.getElementById('move-cd');if(moveCd>0){mc.textContent='移动: '+Math.ceil(moveCd)+'s';mc.style.display='block';}else{mc.style.display='none';}
  updateSkUI();
}
function updateSkUI(){
  for(var i=0;i<2;i++){
    var btn=document.querySelector('[data-skill="'+i+'"]'),sk=hero.skills[i];
    btn.querySelector('.ic').textContent=sk.ic;btn.querySelector('.nm').textContent=sk.name;
    var old=btn.querySelector('.cd');if(old)old.remove();
    var old2=btn.querySelector('.mp-msg');if(old2)old2.remove();
    if(sk.cd>0){btn.classList.add('off');btn.classList.remove('on');var d=document.createElement('div');d.className='cd';d.textContent=Math.ceil(sk.cd);btn.appendChild(d);}
    else if(hero.mp<sk.cost){
      btn.classList.add('off');btn.classList.remove('on');
      var m=document.createElement('div');m.className='mp-msg';m.textContent='等待魔法恢复';m.style.cssText='position:absolute;bottom:-2px;left:0;right:0;font-size:7px;color:#4fc3f7;text-align:center;';
      btn.appendChild(m);
    }
    else{btn.classList.remove('off');btn.classList.add('on');}
  }
}

// ====== 绘制 ======
function drawMap(){
  // 背景 - 使用生成的素材或回退到渐变
  if(IMAGES.bg_tile){
    var pat=ctx.createPattern(IMAGES.bg_tile,'repeat');ctx.fillStyle=pat;ctx.fillRect(0,0,W,H);
  }else{
    var bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#0f1f0f');bg.addColorStop(0.5,'#1a2a1a');bg.addColorStop(1,'#0d1b0d');
    ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  }
  // 网格
  ctx.strokeStyle='rgba(50,80,50,0.12)';ctx.lineWidth=1;
  for(var gx=0;gx<W;gx+=50){ctx.beginPath();ctx.moveTo(gx,0);ctx.lineTo(gx,H);ctx.stroke();}
  for(var gy=0;gy<H;gy+=50){ctx.beginPath();ctx.moveTo(0,gy);ctx.lineTo(W,gy);ctx.stroke();}
  // 路径 - 带发光效果
  ctx.save();ctx.shadowColor='rgba(139,119,80,0.5)';ctx.shadowBlur=15;
  drawPath(PATHS.outer,'rgba(120,90,50,0.6)',32);ctx.restore();
  drawPath(PATHS.outer,'rgba(80,60,30,0.8)',20);
  ctx.save();ctx.shadowColor='rgba(80,80,160,0.4)';ctx.shadowBlur=12;
  drawPath(PATHS.inner,'rgba(60,60,120,0.5)',26);ctx.restore();
  drawPath(PATHS.inner,'rgba(40,40,100,0.7)',16);
  // 塔位 - 使用图片素材
  for(var i=0;i<TOWERS.length;i++){
    var t=TOWERS[i],tx=t.x*W,ty=t.y*H,active=hero.towerIdx===i;
    var towerImg=active?IMAGES.tower_active:IMAGES.tower_inactive;
    if(towerImg){
      ctx.save();
      if(active){ctx.shadowColor='#ffd700';ctx.shadowBlur=20;}
      ctx.drawImage(towerImg,tx-35,ty-35,70,70);
      ctx.restore();
    }else{
      ctx.save();
      if(active){ctx.shadowColor='#ffd700';ctx.shadowBlur=20;}
      ctx.fillStyle=active?'rgba(74,144,217,0.3)':'rgba(50,50,50,0.3)';
      ctx.beginPath();ctx.arc(tx,ty,28,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=active?'#ffd700':'rgba(150,150,150,0.5)';
      ctx.lineWidth=active?3:2;ctx.stroke();
      ctx.restore();
    }
    ctx.font=active?'18px Arial':'14px Arial';
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(active?'🏰':'🏚️',tx,ty);
    ctx.font='10px Arial';ctx.fillStyle=active?'#ffd700':'rgba(255,255,255,0.4)';
    ctx.fillText(t.name,tx,ty+42);
  }
}
function drawPath(path,col,w){ctx.strokeStyle=col;ctx.lineWidth=w;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(path[0].x*W,path[0].y*H);for(var i=1;i<path.length;i++)ctx.lineTo(path[i].x*W,path[i].y*H);ctx.closePath();ctx.stroke();}

// 绘制连横连线
function drawSynergyLines(){
  if(!synergyInfo) return;
  var towers = synergyInfo.heroes;
  if(towers.length < 3) return;
  var typeColor = synergyInfo.type==='str'?'rgba(255,23,68,' : (synergyInfo.type==='agi'?'rgba(41,121,255,':'rgba(255,214,0,');
  var typeRGB = synergyInfo.type==='str'?[255,23,68] : (synergyInfo.type==='agi'?[41,121,255]:[255,214,0]);
  var pulse = Math.sin(Date.now()/300) * 0.3 + 0.7;
  var pts = [];
  for(var i = 0; i < towers.length; i++){
    var t = TOWERS[towers[i].tower];
    pts.push({x: t.x*W, y: t.y*H});
  }
  ctx.save();
  // 填充三角区域 - 能量场
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for(var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  // 渐变填充
  var cx = (pts[0].x+pts[1].x+pts[2].x)/3;
  var cy = (pts[0].y+pts[1].y+pts[2].y)/3;
  var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(dist(cx,cy,pts[0].x,pts[0].y), 100));
  grad.addColorStop(0, typeColor+(0.25*pulse)+')');
  grad.addColorStop(0.6, typeColor+(0.1*pulse)+')');
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.fill();
  // 能量粒子在三角内流动
  var t = Date.now()/1000;
  for(var i = 0; i < 12; i++){
    var seed = i * 1.618;
    var px = cx + Math.sin(t*2+seed)*80 + Math.cos(t*3+seed*2)*40;
    var py = cy + Math.cos(t*1.5+seed)*60 + Math.sin(t*2.5+seed*1.5)*30;
    // 检查是否在三角内
    if(pointInTriangle(px, py, pts[0], pts[1], pts[2])){
      ctx.fillStyle = typeColor+(0.4+Math.sin(t*4+i)*0.2)+')';
      ctx.beginPath(); ctx.arc(px, py, 3+Math.sin(t*3+i)*1.5, 0, Math.PI*2); ctx.fill();
    }
  }
  // 三角边框
  ctx.strokeStyle = typeColor + (0.6*pulse) + ')';
  ctx.lineWidth = 3;
  ctx.shadowColor = typeColor + '0.8)';
  ctx.shadowBlur = 15;
  ctx.setLineDash([8, 4]);
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for(var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);
  // 连线中点能量球
  for(var i = 0; i < pts.length; i++){
    var mx = (pts[i].x + pts[(i+1)%pts.length].x)/2;
    var my = (pts[i].y + pts[(i+1)%pts.length].y)/2;
    for(var r = 12; r > 0; r -= 2){
      ctx.fillStyle = typeColor + (0.15 * (1 - r/12)) + ')';
      ctx.beginPath(); ctx.arc(mx, my, r, 0, Math.PI*2); ctx.fill();
    }
  }
  // 连横标签
  var typeName = synergyInfo.type==='str'?'力量':(synergyInfo.type==='agi'?'敏捷':'智力');
  ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd700';
  ctx.fillText('⚡ '+typeName+'连横 攻击+50% | 领域伤害', W/2, H*0.08);
  ctx.restore();
}

// 判断点是否在三角形内
function pointInTriangle(px, py, v1, v2, v3){
  var d1 = (px-v2.x)*(v1.y-v2.y)-(v1.x-v2.x)*(py-v2.y);
  var d2 = (px-v3.x)*(v2.y-v3.y)-(v2.x-v3.x)*(py-v3.y);
  var d3 = (px-v1.x)*(v3.y-v1.y)-(v3.x-v1.x)*(py-v1.y);
  var hasNeg = (d1<0)||(d2<0)||(d3<0);
  var hasPos = (d1>0)||(d2>0)||(d3>0);
  return !(hasNeg && hasPos);
}

// 连横领域伤害
function synergyZoneTick(){
  if(!synergyInfo || synergyInfo.heroes.length < 3) return;
  var pts = [];
  for(var i = 0; i < synergyInfo.heroes.length; i++){
    var t = TOWERS[synergyInfo.heroes[i].tower];
    pts.push({x: t.x*W, y: t.y*H});
  }
  var zoneDmg = Math.floor(hero.atk * 0.8 * getSynergyMult());
  for(var i = 0; i < enemies.length; i++){
    var e = enemies[i];
    var ex = e.x*W, ey = e.y*H;
    if(pointInTriangle(ex, ey, pts[0], pts[1], pts[2])){
      e.hp -= zoneDmg;
      // 飘字
      if(Math.random()<0.1) addP(ex, ey-10, '-'+zoneDmg, '#ff0', 9);
    }
  }
}

// 绘制塔位上的辅助英雄
function drawTowerHeroes(){
  for(var i = 0; i < towerSlots.length; i++){
    if(!towerSlots[i] || i === hero.towerIdx) continue; // 主英雄塔位跳过
    var key = towerSlots[i];
    var h = HEROES[key];
    if(!h) continue;
    var t = TOWERS[i];
    var tx = t.x * W, ty = t.y * H;
    var sz = 24;
    // 光环
    ctx.save();
    ctx.globalAlpha = 0.2 + Math.sin(Date.now()/500) * 0.05;
    var gl = ctx.createRadialGradient(tx, ty, 0, tx, ty, 40);
    gl.addColorStop(0, h.color); gl.addColorStop(1, 'transparent');
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(tx, ty, 40, 0, Math.PI*2); ctx.fill();
    ctx.restore();
    // 英雄图
    var heroImg = IMAGES['hero_'+key];
    if(heroImg){
      ctx.drawImage(heroImg, tx-sz, ty-sz, sz*2, sz*2);
    } else {
      ctx.font = sz+'px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(h.icon, tx, ty);
    }
    // 边框
    ctx.strokeStyle = h.color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(tx, ty, sz+2, 0, Math.PI*2); ctx.stroke();
    // 名字
    ctx.font = 'bold 9px Arial'; ctx.textAlign = 'center';
    ctx.fillStyle = h.color; ctx.fillText(h.cnName, tx, ty+sz+10);
    // 类型标
    var typeName = h.type==='str'?'力量':(h.type==='agi'?'敏捷':'智力');
    ctx.font = '7px Arial'; ctx.fillStyle = '#aaa';
    ctx.fillText('['+typeName+']', tx, ty+sz+20);
  }
}
function drawHero(){
  var hp=hPos(),hd=hData(),x=hp.x,y=hp.y+Math.sin(Date.now()/300)*3,sz=38;
  var promo=hero.promo||0;
  var heroImg=IMAGES['hero_'+hero.cls];
  
  if(showRangeTimer>0){ctx.save();ctx.strokeStyle='rgba(255,255,255,0.3)';ctx.lineWidth=2;ctx.setLineDash([8,4]);ctx.beginPath();ctx.arc(x,y,hd.range*Math.min(W,H),0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.restore();}
  
  // 外圈光晕
  ctx.save();ctx.globalAlpha=0.25+Math.sin(Date.now()/400)*0.05;
  var gl=ctx.createRadialGradient(x,y,0,x,y,70);gl.addColorStop(0,getPromoGlow(promo));gl.addColorStop(1,'transparent');
  ctx.fillStyle=gl;ctx.beginPath();ctx.arc(x,y,70,0,Math.PI*2);ctx.fill();ctx.restore();
  
  if(heroImg){
    // 使用生成的头像素材
    var imgSz=sz*2.4;
    // 转职颜色叠加
    ctx.save();
    ctx.drawImage(heroImg, x-imgSz/2, y-imgSz/2+2, imgSz, imgSz);
    // 转职颜色层
    if(promo>0){
      ctx.globalCompositeOperation='source-atop';
      ctx.globalAlpha=0.15*promo;
      ctx.fillStyle=getPromoColor(promo);
      ctx.fillRect(x-imgSz/2,y-imgSz/2,imgSz,imgSz);
    }
    ctx.restore();
    // 边框
    ctx.save();ctx.shadowColor=getPromoGlow(promo);ctx.shadowBlur=promo>0?20:12;
    ctx.strokeStyle=getPromoBorder(promo);ctx.lineWidth=promo>0?4:3;
    ctx.beginPath();ctx.arc(x,y,imgSz/2+2,0,Math.PI*2);ctx.stroke();ctx.restore();
  } else {
    // 回退: canvas绘制
    ctx.fillStyle='rgba(0,0,0,0.4)';ctx.beginPath();ctx.ellipse(x,y+sz*0.85,sz*0.7,sz*0.15,0,0,Math.PI*2);ctx.fill();
    var frameG=ctx.createRadialGradient(x-sz*0.1,y-sz*0.1,sz*0.1,x,y,sz*1.0);
    frameG.addColorStop(0,shade(hd.color,50));frameG.addColorStop(0.6,hd.color);frameG.addColorStop(1,shade(hd.color,-50));
    ctx.fillStyle=frameG;ctx.beginPath();ctx.arc(x,y,sz,0,Math.PI*2);ctx.fill();
    ctx.save();ctx.shadowColor=hd.color;ctx.shadowBlur=15;ctx.strokeStyle='#ffd700';ctx.lineWidth=3;ctx.stroke();ctx.restore();
    ctx.font=(sz*1.1)+'px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(hd.avatar,x,y+2);
  }
  
  // 转职星标
  if(promo>0){
    var starStr=['','⭐','⭐⭐','⭐⭐⭐'][promo];
    ctx.font='11px Arial';ctx.textAlign='center';ctx.fillStyle='#ffd700';
    ctx.fillText(starStr,x,y-sz-6);
  }
  
  // 类型标签
  var typeLabel=hd.type==='str'?'力量':(hd.type==='agi'?'敏捷':'智力');
  var typeColor=hd.type==='str'?'#ff1744':(hd.type==='agi'?'#2979ff':'#ffd600');
  ctx.font='bold 9px Arial';ctx.textAlign='center';
  ctx.fillStyle='rgba(0,0,0,0.6)';ctx.fillText('['+typeLabel+']',x+1,y-sz-14+1);
  ctx.fillStyle=typeColor;ctx.fillText('['+typeLabel+']',x,y-sz-14);
  
  // 名字 - 中文名
  ctx.font='bold 13px Arial';
  ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillText(hd.cnName+' Lv.'+hero.lv,x+1,y+sz+19+1);
  ctx.fillStyle='#ffd700';ctx.fillText(hd.cnName+' Lv.'+hero.lv,x,y+sz+19);
  // 称号
  ctx.font='10px Arial';ctx.fillStyle=hd.color;ctx.fillText('【'+hd.title+'】',x,y+sz+32);
  
  // 血条
  var bw=56,bh=6;
  ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(x-bw/2-1,y+sz+38,bw+2,bh+2);
  var hpPct=hero.hp/hero.maxHp;
  ctx.fillStyle=hpPct>0.5?'#4caf50':(hpPct>0.25?'#ff9800':'#f44336');
  ctx.fillRect(x-bw/2,y+sz+39,bw*hpPct,bh);
  ctx.fillStyle='rgba(255,255,255,0.25)';ctx.fillRect(x-bw/2,y+sz+39,bw*hpPct,bh*0.35);
  // 蓝条
  ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(x-bw/2-1,y+sz+47,bw+2,4);
  ctx.fillStyle='#2196f3';ctx.fillRect(x-bw/2,y+sz+48,bw*(hero.mp/hero.maxMp),3);
}

function draw(){
  ctx.clearRect(0,0,W,H);ctx.save();if(shake>0)ctx.translate((Math.random()-0.5)*shake,(Math.random()-0.5)*shake);
  drawMap();drawSynergyLines();for(var i=0;i<lastingEffects.length;i++)lastingEffects[i].draw();
  for(var i=0;i<neutrals.length;i++)neutrals[i].draw(); // 中立怪
  for(var i=0;i<heroCards.length;i++)heroCards[i].draw(); // 英雄卡牌
  for(var i=0;i<enemies.length;i++)enemies[i].draw();if(dungeonEnemy)dungeonEnemy.draw();
  drawHero();drawTowerHeroes();for(var i=0;i<effects.length;i++)effects[i].draw();for(var i=0;i<particles.length;i++)particles[i].draw();ctx.restore();
}

// ====== 主循环 ======
function update(){
  if(state!=='playing')return;if(moveCd>0)moveCd-=0.016;if(showRangeTimer>0)showRangeTimer--;if(adCooldown>0)adCooldown-=0.016;
  if(hero.hp>0)autoAtk();if(hero.mp<hero.maxMp)hero.mp+=getMpRegen()/60;for(var i=0;i<hero.skills.length;i++)if(hero.skills[i].cd>0)hero.skills[i].cd-=0.016;
  // 副英雄攻击+CD
  towerHeroesAutoAtk();
  for(var ti=0;ti<towerHeroStates.length;ti++){
    var st=towerHeroStates[ti];
    if(!st||ti===hero.towerIdx) continue;
    for(var si=0;si<st.skills.length;si++) if(st.skills[si].cd>0) st.skills[si].cd-=0.016;
  }
  for(var i=enemies.length-1;i>=0;i--){enemies[i].update();if(enemies[i].hp<=0){kills++;gold+=enemies[i].boss?10:2;gainExp(enemies[i].exp);playSound('ult');
    // 每日任务: 击杀计数
    addTaskProgress('kill50',1);addTaskProgress('kill200',1);
    // 被动: 燃魂 - 击杀恢复HP和MP
    var hd=hData();if(hd.extraPassive&&hd.extraPassive.indexOf('燃魂')>=0){hero.hp=Math.min(hero.maxHp,hero.hp+10);hero.mp=Math.min(hero.maxMp,hero.mp+5);}
    // 被动: 剑意 - 击杀叠加攻击力
    if(hd.extraPassive&&hd.extraPassive.indexOf('剑意')>=0){hero.killStacks=Math.min((hero.killStacks||0)+1,50);hero.atk+=1;}
    var kx=enemies[i].x*W,ky=enemies[i].y*H;for(var j=0;j<8;j++){var a=j*45*Math.PI/180;addP(kx+Math.cos(a)*20,ky+Math.sin(a)*20,'✦',enemies[i].boss?'#ffd700':'#ff6f00',10);}
    addP(kx,ky,'+'+enemies[i].exp+'EXP','#4fc3f7',12);enemies.splice(i,1);}}
  for(var i=particles.length-1;i>=0;i--)if(!particles[i].update())particles.splice(i,1);
  for(var i=lastingEffects.length-1;i>=0;i--)if(!lastingEffects[i].update())lastingEffects.splice(i,1);
  // 更新中立怪
  for(var i=neutrals.length-1;i>=0;i--){if(!neutrals[i].update()||!neutrals[i].alive)neutrals.splice(i,1);}
  // 更新英雄卡牌
  for(var i=heroCards.length-1;i>=0;i--){if(!heroCards[i].update())heroCards.splice(i,1);}
  // 连横领域伤害
  synergyZoneTick();
  // 英雄卡牌掉落: 每10秒1%概率
  var now = Date.now();
  if(now - lastCardDropTime > cardDropInterval){
    lastCardDropTime = now;
    if(Math.random() < cardDropChance){
      var keys = Object.keys(HEROES);
      var dropKey = keys[Math.floor(Math.random()*keys.length)];
      heroCards.push(new HeroCard(dropKey));
      addP(W/2, H*0.3, '✨ 英雄卡牌降临！', '#ffd700', 20);
    }
  }
  if(dungeonActive){dungeonTimer-=0.016;if(dungeonTimer<=0)failDungeon();}
  waveT-=0.016;if(waveT<=0){wave++;waveT=10;spawnWave();updateTaskProgress('wave10',wave);}
  if(shake>0)shake*=0.85;if(shake<0.5)shake=0;checkEnd();updateUI();
}
function loop(){update();draw();requestAnimationFrame(loop);}

// ====== 初始化 ======
function init(){
  canvas=document.getElementById('game');ctx=canvas.getContext('2d');
  var app=document.getElementById('app');W=canvas.width=app.clientWidth;H=canvas.height=app.clientHeight;
  initAudio();
  // 随机选择英雄
  var heroKeys=Object.keys(HEROES);
  hero.cls=heroKeys[Math.floor(Math.random()*heroKeys.length)];
  initHeroSkills();
  // 初始化收集和塔位
  heroCollection=[hero.cls];
  towerSlots=[null,null,null,null,null];
  towerSlots[hero.towerIdx]=hero.cls;
  towerHeroStates=[null,null,null,null,null];
  initTowerHeroState(hero.towerIdx);
  lastCardDropTime=Date.now();
  // 加载图片资源后启动游戏
  loadImages(function(){
    requestAnimationFrame(loop);
  });
  setupEvents();
  document.addEventListener('click',initAudio,{once:true});document.addEventListener('touchstart',initAudio,{once:true});
  var hd=HEROES[hero.cls];
  showToast('英雄: '+hd.icon+' '+hd.cnName+'（'+hd.name+'）');
  // 教程
  setTimeout(function(){ checkTutorial(); }, 1500);
  // 签到系统初始化
  updateSigninBtn();
  if(canSignin()){
    setTimeout(function(){ showSigninModal(); }, 2500);
  }
}

function setupEvents(){
  var sks=document.querySelectorAll('.sk');for(var i=0;i<sks.length;i++){(function(btn){var fn=function(e){e.preventDefault();e.stopPropagation();if(state==='playing')useSkill(parseInt(btn.dataset.skill));};btn.addEventListener('touchstart',fn);btn.addEventListener('click',fn);})(sks[i]);}
  canvas.addEventListener('click',function(e){
    if(state!=='playing')return;var rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)*(W/rect.width),y=(e.clientY-rect.top)*(H/rect.height);
    // 收集英雄卡牌
    for(var i=0;i<heroCards.length;i++){
      if(heroCards[i].alive&&heroCards[i].hitTest(x,y)){
        showCardPickup(heroCards[i]);
        return;
      }
    }
    // 攻击中立怪
    for(var i=0;i<neutrals.length;i++){
      if(neutrals[i].alive&&neutrals[i].hitTest(x,y)){
        var n=neutrals[i],d=Math.max(1,Math.floor(hero.atk*3.0*getAtkMult()*hero.buff*getSynergyMult()));
        n.hp-=d;addP(n.x*W,n.y*H-20,'-'+d,'#fff',14);playSound('hit');
        if(n.hp<=0)n.die();
        return;
      }
    }
    var hp=hPos();if(dist(x,y,hp.x,hp.y)<35){showRangeTimer=120;return;}
    // 点击塔位 → 显示菜单
    for(var i=0;i<TOWERS.length;i++){var t=TOWERS[i],tx=t.x*W,ty=t.y*H;
      if(dist(x,y,tx,ty)<40){
        if(i===hero.towerIdx){showRangeTimer=60;} // 主英雄塔：显示范围
        else {showTowerMenu(i);} // 其他塔：显示放置/撤回菜单
        return;
      }
    }
    // 主英雄移动（点击空地的塔位区域以外不移动，只允许在已有菜单提示下移动）
    if(moveCd>0)return;
  });
  document.getElementById('btn-dungeon').onclick=function(e){if(e){e.preventDefault();e.stopPropagation();}if(state==='playing'&&!dungeonActive)showDungeonMenu();else if(dungeonActive)showToast('已在副本中!');return false;};
  document.getElementById('btn-collection').onclick=function(e){if(e){e.preventDefault();e.stopPropagation();}if(state==='playing')showCollectionModal();return false;};
}

// ====== 卡牌拾取弹窗 ======
var pendingCard = null;
function showCardPickup(card){
  state='paused';
  pendingCard = card;
  var h = HEROES[card.classKey];
  var typeName = h.type==='str'?'力量系':(h.type==='agi'?'敏捷系':'智力系');
  var modal = document.getElementById('card-modal');
  var content = document.getElementById('card-modal-content');
  content.innerHTML = '<div style="font-size:48px;margin-bottom:8px;">'+h.icon+'</div>'
    +'<div style="color:'+h.color+';font-size:20px;font-weight:bold;">'+h.cnName+'</div>'
    +'<div style="color:#aaa;font-size:13px;">'+h.name+' · '+typeName+'</div>'
    +'<div style="color:#888;font-size:11px;margin:6px 0;">'+h.passive+'</div>'
    +'<div style="display:flex;gap:12px;margin-top:15px;justify-content:center;">'
    +'<button onclick="doCollectCard()" style="padding:10px 24px;background:linear-gradient(180deg,#4caf50,#2e7d32);border:2px solid #66bb6a;border-radius:12px;color:#fff;font-size:14px;font-weight:bold;cursor:pointer;">📥 收集</button>'
    +'<button onclick="doDiscardCard()" style="padding:10px 24px;background:linear-gradient(180deg,#555,#333);border:2px solid #777;border-radius:12px;color:#ccc;font-size:14px;cursor:pointer;">🗑️ 废弃</button>'
    +'</div>';
  modal.classList.add('show');
}
function doCollectCard(){
  if(!pendingCard) return;
  collectHero(pendingCard.classKey);
  var hx=pendingCard.x*W, hy=pendingCard.y*H;
  for(var j=0;j<12;j++){var a=j*30*Math.PI/180;addP(hx+Math.cos(a)*15,hy+Math.sin(a)*15,'✦','#ffd700',12);}
  pendingCard.alive=false;
  pendingCard=null;
  document.getElementById('card-modal').classList.remove('show');
  state='playing';
}
function doDiscardCard(){
  if(!pendingCard) return;
  var hx=pendingCard.x*W, hy=pendingCard.y*H;
  addP(hx,hy,'废弃','#888',14);
  pendingCard.alive=false;
  pendingCard=null;
  document.getElementById('card-modal').classList.remove('show');
  state='playing';
}

// ====== 塔位菜单 ======
function showTowerMenu(towerIdx){
  state='paused';
  var modal=document.getElementById('tower-modal');
  var content=document.getElementById('tower-modal-content');
  var occupied = towerSlots[towerIdx];
  var html = '';
  if(occupied){
    var h = HEROES[occupied];
    var isMain = (towerIdx === hero.towerIdx);
    var typeName = h.type==='str'?'力量':(h.type==='agi'?'敏捷':'智力');
    html += '<div style="color:'+h.color+';font-size:18px;font-weight:bold;margin-bottom:4px;">'+h.icon+' '+h.cnName+'</div>';
    html += '<div style="color:#aaa;font-size:11px;margin-bottom:6px;">'+h.name+' · ['+typeName+'] · '+h.passive+'</div>';
    html += '<div style="color:#888;font-size:10px;margin-bottom:8px;">'+(isMain?'⭐ 主英雄':'副英雄')+' · '+TOWERS[towerIdx].name+'塔</div>';
    // 副英雄显示属性
    if(!isMain){
      var towerAtk = Math.floor(hero.atk * 0.5);
      html += '<div style="display:flex;gap:8px;justify-content:center;margin-bottom:10px;">';
      html += '<div style="background:rgba(255,255,255,0.05);border:1px solid #444;border-radius:8px;padding:6px 12px;font-size:11px;color:#ffd700;">⚔️攻击: '+towerAtk+'</div>';
      var st = towerHeroStates[towerIdx];
      if(st){
        html += '<div style="background:rgba(255,255,255,0.05);border:1px solid #444;border-radius:8px;padding:6px 12px;font-size:11px;color:#4fc3f7;">💙MP: '+Math.floor(st.mp)+'</div>';
      }
      html += '</div>';
      // 技能按钮
      if(st){
        html += '<div style="display:flex;gap:10px;justify-content:center;margin:8px 0;">';
        for(var si=0; si<st.skills.length; si++){
          var sk = st.skills[si];
          var onCd = sk.cd > 0;
          var noMp = st.mp < sk.cost;
          var clickable = !onCd && !noMp;
          var borderCol = clickable?(sk.type==='big'?h.color:'#4a90d9'):'#444';
          var opacity = clickable?'1':'0.5';
          html += '<div onclick="'+(clickable?'doTowerSkill('+towerIdx+','+si+')':'')+'" style="width:110px;padding:10px;background:'+(clickable?'linear-gradient(180deg,#2a2a4a,#1a1a3a)':'#1a1a2a')+';border:2px solid '+borderCol+';border-radius:12px;text-align:center;cursor:'+(clickable?'pointer':'default')+';opacity:'+opacity+';">';
          html += '<div style="font-size:24px;">'+sk.ic+'</div>';
          html += '<div style="font-size:11px;font-weight:bold;color:#fff;margin:3px 0;">'+sk.name+'</div>';
          if(onCd){
            html += '<div style="font-size:10px;color:#ff5252;">冷却 '+Math.ceil(sk.cd)+'s</div>';
          } else if(noMp){
            html += '<div style="font-size:10px;color:#4fc3f7;">MP不足 ('+sk.cost+')</div>';
          } else {
            html += '<div style="font-size:9px;color:#aaa;">消耗 '+sk.cost+' MP</div>';
          }
          html += '</div>';
        }
        html += '</div>';
      }
    }
    html += '<div class="btns" style="margin-top:10px;">';
    if(!isMain){
      html += '<button onclick="doRemoveFromTower('+towerIdx+')" style="border-color:#ff5252;">撤回英雄</button>';
    }
    html += '<button onclick="closeTowerModal()">返回</button></div>';
  } else {
    html += '<div style="color:#ffd700;font-size:16px;font-weight:bold;margin-bottom:8px;">'+TOWERS[towerIdx].name+' 塔 - 空闲</div>';
    html += '<div style="color:#aaa;font-size:12px;margin-bottom:12px;">选择操作：</div>';
    // 移动主英雄到这里
    if(hero.towerIdx!==towerIdx && moveCd<=0){
      html += '<div onclick="doMoveHeroTo('+towerIdx+')" style="padding:12px;margin-bottom:10px;background:linear-gradient(180deg,#2a4a7a,#1a2a4a);border:2px solid #4a90d9;border-radius:10px;cursor:pointer;text-align:center;">';
      html += '<div style="font-size:24px;">🏃</div>';
      html += '<div style="font-size:13px;font-weight:bold;color:#4a90d9;">移动主英雄至此</div>';
      html += '<div style="font-size:10px;color:#aaa;">'+HEROES[hero.cls].cnName+'</div>';
      html += '</div>';
    }
    // 显示可放置的英雄（排除主英雄和已放置的）
    var available = heroCollection.filter(function(k){
      if(k===hero.cls) return false; // 主英雄不能放
      for(var j=0;j<towerSlots.length;j++){if(towerSlots[j]===k) return false;}
      return true;
    });
    if(available.length === 0){
      html += '<div style="color:#888;font-size:13px;margin:15px 0;">暂无可放置英雄<br><span style="font-size:11px;">收集英雄卡牌来扩充图鉴！</span></div>';
    } else {
      html += '<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;padding:5px;">';
      for(var i=0;i<available.length;i++){
        var key = available[i], h = HEROES[key];
        var typeName = h.type==='str'?'力量':(h.type==='agi'?'敏捷':'智力');
        html += '<div onclick="doPlaceOnTower('+towerIdx+',\''+key+'\')" style="width:90px;padding:10px;background:linear-gradient(180deg,#2a2a4a,#1a1a3a);border:2px solid '+h.color+';border-radius:10px;cursor:pointer;text-align:center;">';
        html += '<div style="font-size:28px;">'+h.icon+'</div>';
        html += '<div style="font-size:12px;font-weight:bold;color:'+h.color+';">'+h.cnName+'</div>';
        html += '<div style="font-size:9px;color:#aaa;">'+typeName+'</div>';
        html += '<div style="font-size:8px;color:#888;margin-top:2px;">'+h.passive+'</div>';
        html += '</div>';
      }
      html += '</div>';
    }
    html += '<div class="btns" style="margin-top:12px;"><button onclick="closeTowerModal()">返回</button></div>';
  }
  content.innerHTML = html;
  modal.classList.add('show');
}
function closeTowerModal(){
  document.getElementById('tower-modal').classList.remove('show');
  state='playing';
}
function doTowerSkill(towerIdx, skillIdx){
  useTowerHeroSkill(towerIdx, skillIdx);
  // 刷新菜单显示
  showTowerMenu(towerIdx);
}
function doPlaceOnTower(towerIdx, classKey){
  placeHeroOnTower(towerIdx, classKey);
  closeTowerModal();
}
function doRemoveFromTower(towerIdx){
  var key = towerSlots[towerIdx];
  removeHeroFromTower(towerIdx);
  showToast('已撤回 '+HEROES[key].cnName);
  closeTowerModal();
}
function doMoveHeroTo(towerIdx){
  towerSlots[hero.towerIdx] = null; // 旧位置清空
  towerHeroStates[hero.towerIdx] = null;
  hero.towerIdx = towerIdx;
  towerSlots[towerIdx] = hero.cls; // 新位置放主英雄
  initTowerHeroState(towerIdx);
  moveCd = 3;
  checkSynergy();
  var tx=TOWERS[towerIdx].x*W,ty=TOWERS[towerIdx].y*H;
  addP(tx,ty-30,'移动!','#fff',14);playSound('ult');
  closeTowerModal();
}

// ====== 图鉴/收集面板 ======
function showCollectionModal(){
  state='paused';
  var modal=document.getElementById('collection-modal');
  var grid=document.getElementById('collection-grid');
  var synergyDiv=document.getElementById('collection-synergy');
  grid.innerHTML='';
  // 统计
  var typeCount={str:0,agi:0,int:0};
  var allKeys=Object.keys(HEROES);
  // 按类型分组显示
  var types=['str','agi','int'];
  var typeNames={str:'力量系',agi:'敏捷系',int:'智力系'};
  var typeColors={str:'#ff1744',agi:'#2979ff',int:'#ffd600'};
  for(var ti=0;ti<types.length;ti++){
    var t=types[ti];
    var section=document.createElement('div');
    section.style.cssText='width:100%;margin-bottom:10px;';
    var owned=allKeys.filter(function(k){return HEROES[k].type===t&&heroCollection.indexOf(k)>=0;});
    var total=allKeys.filter(function(k){return HEROES[k].type===t;});
    typeCount[t]=owned.length;
    section.innerHTML='<div style="color:'+typeColors[t]+';font-size:13px;font-weight:bold;margin-bottom:6px;text-align:left;padding-left:10px;">'+typeNames[t]+' ('+owned.length+'/'+total.length+')</div>';
    var row=document.createElement('div');
    row.style.cssText='display:flex;gap:8px;flex-wrap:wrap;justify-content:center;';
    for(var i=0;i<total.length;i++){
      var key=total[i],h=HEROES[key],has=heroCollection.indexOf(key)>=0;
      var card=document.createElement('div');
      card.style.cssText='width:80px;padding:8px;background:'+(has?'linear-gradient(180deg,#2a2a4a,#1a1a3a)':'rgba(30,30,40,0.5)')+';border:2px solid '+(has?h.color:'#333')+';border-radius:10px;text-align:center;opacity:'+(has?'1':'0.4')+';';
      card.innerHTML='<div style="font-size:24px;">'+(has?h.icon:'❓')+'</div>'
        +'<div style="font-size:10px;font-weight:bold;color:'+(has?h.color:'#555')+';">'+(has?h.cnName:'???')+'</div>'
        +'<div style="font-size:8px;color:#888;">'+h.name+'</div>'
        +(has?'<div style="font-size:7px;color:#666;margin-top:2px;">'+h.passive+'</div>':'');
      row.appendChild(card);
    }
    section.appendChild(row);
    grid.appendChild(section);
  }
  // 连横状态
  var synHTML='<div style="margin-top:10px;padding:10px;background:rgba(0,0,0,0.5);border-radius:10px;border:1px solid #444;">';
  synHTML+='<div style="color:#ffd700;font-size:13px;font-weight:bold;margin-bottom:6px;">⚡ 连横系统</div>';
  synHTML+='<div style="color:#aaa;font-size:11px;line-height:1.6;">同系3英雄上阵 → 攻击+50%<br>';
  synHTML+='力量: <span style="color:'+(typeCount.str>=3?'#4caf50':'#f44336')+';">'+typeCount.str+'/3</span> | ';
  synHTML+='敏捷: <span style="color:'+(typeCount.agi>=3?'#4caf50':'#f44336')+';">'+typeCount.agi+'/3</span> | ';
  synHTML+='智力: <span style="color:'+(typeCount.int>=3?'#4caf50':'#f44336')+';">'+typeCount.int+'/3</span></div>';
  if(synergyInfo){
    var tn=synergyInfo.type==='str'?'力量':(synergyInfo.type==='agi'?'敏捷':'智力');
    synHTML+='<div style="color:#4caf50;font-size:12px;font-weight:bold;margin-top:4px;">✅ '+tn+'连横已激活！攻击+50%</div>';
  }
  synHTML+='</div>';
  synergyDiv.innerHTML=synHTML;
  // 底部信息
  document.getElementById('collection-count').textContent='已收集: '+heroCollection.length+'/'+allKeys.length;
  modal.classList.add('show');
}
function closeCollectionModal(){
  document.getElementById('collection-modal').classList.remove('show');
  state='playing';
}

// ====== 每日签到系统 ======
var SIGNIN_REWARDS = [
  {day:1, gold:50,  icon:'💰', name:'金币×50'},
  {day:2, gold:80,  icon:'💎', name:'金币×80'},
  {day:3, gold:120, icon:'🎁', name:'金币×120'},
  {day:4, gold:180, icon:'🏆', name:'金币×180'},
  {day:5, gold:250, icon:'⚡', name:'金币×250'},
  {day:6, gold:350, icon:'🔥', name:'金币×350'},
  {day:7, gold:500, icon:'👑', name:'金币×500 + 魔法全满', fullMp:true}
];

function getSigninData(){
  try{
    var d=localStorage.getItem('warcraft_signin');
    if(!d) return {lastDay:'',streak:0,total:0,claimed:[]};
    return JSON.parse(d);
  }catch(e){return {lastDay:'',streak:0,total:0,claimed:[]};}
}
function saveSigninData(d){localStorage.setItem('warcraft_signin',JSON.stringify(d));}

function getTodayStr(){
  var n=new Date();
  return n.getFullYear()+'-'+(n.getMonth()+1)+'-'+n.getDate();
}

function canSignin(){
  var d=getSigninData();
  return d.lastDay!==getTodayStr();
}

function doSignin(){
  if(!canSignin()) return;
  var d=getSigninData();
  // 检查是否连续（昨天签过=连续，否则重置）
  var yesterday=new Date(); yesterday.setDate(yesterday.getDate()-1);
  var yStr=yesterday.getFullYear()+'-'+(yesterday.getMonth()+1)+'-'+yesterday.getDate();
  if(d.lastDay===yStr){
    d.streak=d.streak>=7?1:d.streak+1; // 第7天后循环回第1天
  } else if(d.lastDay!==getTodayStr()){
    d.streak=1; // 断签或首次，重置为1
  }
  // 计算奖励
  var reward=SIGNIN_REWARDS[d.streak-1]||SIGNIN_REWARDS[0];
  gold+=reward.gold;
  if(reward.fullMp){hero.mp=hero.maxMp;}
  d.lastDay=getTodayStr();
  d.total++;
  if(d.claimed.indexOf(d.streak)<0) d.claimed.push(d.streak);
  saveSigninData(d);
  // 反馈
  playSound('ult');
  addP(W/2, H*0.3, '+'+reward.gold+'💰', '#ffd700', 20);
  if(reward.fullMp){addP(W/2, H*0.25, 'MP全满!', '#4fc3f7', 18);}
  showToast('签到成功！'+reward.icon+' '+reward.name);
  updateSigninBtn();
  closeSigninModal();
  // 每日任务: 签到追踪
  var sd=getSigninData();
  updateTaskProgress('sign7',sd.streak);
  // 刷新HUD
  document.getElementById('gold').textContent=gold;
}

function showSigninModal(){
  state='paused';
  var d=getSigninData();
  var modal=document.getElementById('signin-modal');
  var grid=document.getElementById('signin-grid');
  var today=getTodayStr();
  var canDo=canSignin();
  // 标题区域
  var headerHtml='<div style="color:#ffd700;font-size:22px;font-weight:bold;text-shadow:2px 2px 4px #000;">📅 每日签到</div>';
  headerHtml+='<div style="color:#aaa;font-size:12px;margin-top:4px;">已连续签到 '+d.streak+' 天 | 累计 '+d.total+' 天</div>';
  document.getElementById('signin-header').innerHTML=headerHtml;
  // 签到格子
  var html='';
  for(var i=0;i<SIGNIN_REWARDS.length;i++){
    var r=SIGNIN_REWARDS[i];
    var dayNum=i+1;
    var isClaimed=d.claimed.indexOf(dayNum)>=0 && d.streak>=dayNum;
    var isToday=canDo && dayNum===(d.streak>=7?7:d.streak+1);
    var isFuture=!isClaimed&&!isToday;
    var bg=isClaimed?'linear-gradient(180deg,#1a3a1a,#0d2a0d)':(isToday?'linear-gradient(180deg,#2a4a7a,#1a2a4a)':'rgba(30,30,40,0.5)');
    var border=isClaimed?'#4caf50':(isToday?'#ffd700':'#333');
    var opacity=isFuture?'0.5':'1';
    html+='<div style="width:80px;padding:10px;background:'+bg+';border:2px solid '+border+';border-radius:10px;text-align:center;opacity:'+opacity+';'+(isToday?'animation:pulse 1.5s infinite;':'')+'">';
    html+='<div style="font-size:9px;color:#888;margin-bottom:2px;">第'+dayNum+'天</div>';
    html+='<div style="font-size:28px;">'+(isClaimed?'✅':r.icon)+'</div>';
    html+='<div style="font-size:10px;font-weight:bold;color:'+(isClaimed?'#4caf50':(isToday?'#ffd700':'#aaa'))+';">'+r.name+'</div>';
    if(isToday) html+='<div style="font-size:8px;color:#ffd700;margin-top:2px;">← 今天</div>';
    html+='</div>';
  }
  grid.innerHTML=html;
  // 签到按钮
  var btnHtml='';
  if(canDo){
    btnHtml='<button onclick="doSignin()" style="padding:12px 36px;background:linear-gradient(180deg,#ffd700,#ff9800);border:3px solid #ffe082;border-radius:20px;color:#000;font-size:16px;font-weight:bold;cursor:pointer;animation:pulse 1.5s infinite;">✅ 立即签到</button>';
  } else {
    btnHtml='<div style="color:#4caf50;font-size:15px;font-weight:bold;">✅ 今日已签到</div><div style="color:#888;font-size:11px;margin-top:4px;">明天记得再来哦！</div>';
  }
  document.getElementById('signin-btn-area').innerHTML=btnHtml;
  modal.classList.add('show');
}

function closeSigninModal(){
  document.getElementById('signin-modal').classList.remove('show');
  state='playing';
}

function updateSigninBtn(){
  var btn=document.getElementById('btn-signin');
  if(!btn) return;
  if(canSignin()){
    btn.style.borderColor='#ffd700';
    btn.style.animation='pulse 1.5s infinite';
    btn.innerHTML='📅 签到!';
  } else {
    btn.style.borderColor='#555';
    btn.style.animation='none';
    btn.innerHTML='📅 已签';
  }
}

// ====== 每日任务系统 ======
var DAILY_TASKS = [
  {id:'kill50',   name:'击杀50个敌人',    target:50,  icon:'💀', reward:{gold:30}},
  {id:'kill200',  name:'击杀200个敌人',   target:200, icon:'☠️', reward:{gold:80}},
  {id:'wave10',   name:'存活到第10波',     target:10,  icon:'🌊', reward:{gold:50}},
  {id:'dungeon1', name:'完成1次副本',      target:1,  icon:'⚔️', reward:{gold:60}},
  {id:'collect2', name:'收集2个英雄',      target:2,  icon:'📚', reward:{gold:40}},
  {id:'sign7',    name:'连续签到7天',      target:7,  icon:'📅', reward:{gold:200}}
];

function getDailyTaskData(){
  try{
    var d=localStorage.getItem('warcraft_daily_task');
    if(!d) return {date:'',progress:{},claimed:{}};
    return JSON.parse(d);
  }catch(e){return {date:'',progress:{},claimed:{}};}
}
function saveDailyTaskData(d){localStorage.setItem('warcraft_daily_task',JSON.stringify(d));}

function resetDailyTasksIfNeeded(){
  var d=getDailyTaskData();
  var today=getTodayStr();
  if(d.date!==today){
    d={date:today,progress:{},claimed:{}};
    saveDailyTaskData(d);
  }
}

function updateTaskProgress(taskId, value){
  resetDailyTasksIfNeeded();
  var d=getDailyTaskData();
  var task=DAILY_TASKS.find(function(t){return t.id===taskId;});
  if(!task) return;
  if(d.claimed[taskId]) return; // 已领奖
  var cur=d.progress[taskId]||0;
  d.progress[taskId]=Math.min(Math.max(cur,value),task.target);
  saveDailyTaskData(d);
  // 检查是否完成
  if(d.progress[taskId]>=task.target && !d.claimed[taskId]){
    showToast('🎯 任务完成: '+task.icon+' '+task.name);
    playSound('ult');
  }
}

function addTaskProgress(taskId, delta){
  resetDailyTasksIfNeeded();
  var d=getDailyTaskData();
  var cur=d.progress[taskId]||0;
  updateTaskProgress(taskId, cur+delta);
}

function claimTaskReward(taskId){
  resetDailyTasksIfNeeded();
  var d=getDailyTaskData();
  var task=DAILY_TASKS.find(function(t){return t.id===taskId;});
  if(!task||d.claimed[taskId]||!d.progress[taskId]||d.progress[taskId]<task.target) return;
  d.claimed[taskId]=true;
  saveDailyTaskData(d);
  gold+=task.reward.gold;
  document.getElementById('gold').textContent=gold;
  addP(W/2,H*0.35,'+'+task.reward.gold+'💰','#ffd700',18);
  playSound('ult');
  showToast('🎉 领取奖励: +'+task.reward.gold+'金币');
  showTaskModal(); // 刷新面板
}

function showTaskModal(){
  state='paused';
  resetDailyTasksIfNeeded();
  var d=getDailyTaskData();
  var modal=document.getElementById('task-modal');
  var list=document.getElementById('task-list');
  var html='';
  for(var i=0;i<DAILY_TASKS.length;i++){
    var t=DAILY_TASKS[i];
    var prog=d.progress[t.id]||0;
    var isComplete=prog>=t.target;
    var isClaimed=!!d.claimed[t.id];
    var pct=Math.min(100,Math.floor(prog/t.target*100));
    var bg=isClaimed?'#1a3a1a':(isComplete?'#2a4a3a':'#1a1a2e');
    var border=isClaimed?'#4caf50':(isComplete?'#ffd700':'#333');
    html+='<div style="display:flex;align-items:center;gap:10px;padding:10px;margin-bottom:8px;background:'+bg+';border:2px solid '+border+';border-radius:12px;">';
    html+='<div style="font-size:28px;width:36px;text-align:center;">'+t.icon+'</div>';
    html+='<div style="flex:1;text-align:left;">';
    html+='<div style="color:#fff;font-size:13px;font-weight:bold;">'+t.name+'</div>';
    html+='<div style="background:#222;border-radius:3px;height:6px;margin-top:4px;overflow:hidden;"><div style="height:100%;width:'+pct+'%;background:'+(isComplete?'#4caf50':'#4a90d9')+';border-radius:3px;transition:width .3s;"></div></div>';
    html+='<div style="color:#888;font-size:10px;margin-top:2px;">'+Math.min(prog,t.target)+'/'+t.target+' ('+pct+'%)</div>';
    html+='</div>';
    if(isClaimed){
      html+='<div style="color:#4caf50;font-size:13px;font-weight:bold;">✅</div>';
    } else if(isComplete){
      html+='<button onclick="claimTaskReward(\''+t.id+'\')" style="padding:6px 14px;background:linear-gradient(180deg,#ffd700,#ff9800);border:2px solid #ffe082;border-radius:12px;color:#000;font-size:11px;font-weight:bold;cursor:pointer;">领取</button>';
    } else {
      html+='<div style="color:#666;font-size:10px;">+'+t.reward.gold+'💰</div>';
    }
    html+='</div>';
  }
  list.innerHTML=html;
  modal.classList.add('show');
}

function closeTaskModal(){
  document.getElementById('task-modal').classList.remove('show');
  state='playing';
}

window.onload=init;
