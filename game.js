// ====== 魔兽RPG V5.0 - 完全重写 ======
var canvas, ctx, W, H;
var state = 'playing';
var gold = 50, wave = 1, waveT = 0.5, kills = 0, shake = 0;
var moveCd = 0, showRangeTimer = 0;

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
  var t=this.path[this.wp],dx=t.x-this.x,dy=t.y-this.y,d=Math.sqrt(dx*dx+dy*dy);
  if(d<this.spd+0.01)this.wp=(this.wp+1)%this.path.length;
  else{this.x+=(dx/d)*this.spd;this.y+=(dy/d)*this.spd;}
  return true;
};
NeutralCreature.prototype.draw=function(){
  if(!this.alive)return;
  var x=this.x*W,y=this.y*H,sz=this.sz*Math.min(W,H);
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
  // 提示文字
  ctx.font='bold 9px Arial';ctx.fillStyle='#fff';ctx.fillText('点击攻击',x,y+sz+12);
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
  if(wave<5)return;
  var count=1+Math.floor((wave-5)/3); // W5=1只, W8=2只, W11=3只...
  for(var i=0;i<count;i++){
    var type=Math.random()<0.5?'gold':'exp';
    neutrals.push(new NeutralCreature(type));
  }
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
  this.hp=(50+wave*12)*type.hpM*wm;this.maxHp=this.hp;
  this.def=3+wave*(this.boss?2:0.8);this.spd=(pk==='inner'?0.004:0.0025)*type.spdM*0.5;
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
  
  // 影子
  ctx.fillStyle='rgba(0,0,0,0.45)';ctx.beginPath();
  if(isCentaur){ctx.ellipse(x,y+sz*1.1,sz*1.2,sz*0.3,0,0,Math.PI*2);}
  else{ctx.ellipse(x,y+sz*0.9,sz*0.85,sz*0.22,0,0,Math.PI*2);}
  ctx.fill();
  
  if(isCentaur){
    // ====== 人马形态 ======
    // 马身
    var bodyG=ctx.createRadialGradient(x,y+sz*0.3,0,x,y+sz*0.3,sz*1.2);
    bodyG.addColorStop(0,shade(this.col,30));bodyG.addColorStop(1,shade(this.col,-40));
    ctx.fillStyle=bodyG;ctx.beginPath();ctx.ellipse(x,y+sz*0.4,sz*0.9,sz*0.5,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=shade(this.col,-50);ctx.lineWidth=2;ctx.stroke();
    // 马腿
    ctx.strokeStyle=shade(this.col,-30);ctx.lineWidth=sz*0.12;ctx.lineCap='round';
    for(var li=0;li<4;li++){
      var lx=x+(li<2?-sz*0.5:sz*0.5),ly=y+sz*0.6;
      ctx.beginPath();ctx.moveTo(lx,ly);ctx.lineTo(lx+(li<2?-sz*0.15:sz*0.15),ly+sz*0.5);ctx.stroke();
    }
    // 人身上半部
    var torsoG=ctx.createRadialGradient(x-sz*0.1,y-sz*0.3,0,x,y-sz*0.1,sz*0.7);
    torsoG.addColorStop(0,shade(this.col,40));torsoG.addColorStop(1,this.col);
    ctx.fillStyle=torsoG;ctx.beginPath();
    ctx.moveTo(x-sz*0.35,y+sz*0.1);ctx.lineTo(x-sz*0.25,y-sz*0.5);
    ctx.lineTo(x+sz*0.25,y-sz*0.5);ctx.lineTo(x+sz*0.35,y+sz*0.1);ctx.closePath();ctx.fill();
    ctx.strokeStyle=shade(this.col,-50);ctx.lineWidth=1.5;ctx.stroke();
    // 头
    var headG=ctx.createRadialGradient(x,y-sz*0.7,0,x,y-sz*0.6,sz*0.35);
    headG.addColorStop(0,shade(this.col,50));headG.addColorStop(1,this.col);
    ctx.fillStyle=headG;ctx.beginPath();ctx.arc(x,y-sz*0.65,sz*0.3,0,Math.PI*2);ctx.fill();
    ctx.stroke();
    // 獠牙
    ctx.fillStyle='#ffe0b2';ctx.beginPath();
    ctx.moveTo(x-sz*0.12,y-sz*0.55);ctx.lineTo(x-sz*0.08,y-sz*0.42);ctx.lineTo(x-sz*0.04,y-sz*0.55);ctx.fill();
    ctx.beginPath();ctx.moveTo(x+sz*0.04,y-sz*0.55);ctx.lineTo(x+sz*0.08,y-sz*0.42);ctx.lineTo(x+sz*0.12,y-sz*0.55);ctx.fill();
    // 眼睛
    ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(x-sz*0.12,y-sz*0.7,sz*0.09,sz*0.1,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(x+sz*0.12,y-sz*0.7,sz*0.09,sz*0.1,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=this.boss?'#f00':'#ffd700';ctx.beginPath();ctx.arc(x-sz*0.12,y-sz*0.68,sz*0.05,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(x+sz*0.12,y-sz*0.68,sz*0.05,0,Math.PI*2);ctx.fill();
    // Boss角
    if(this.boss){
      ctx.fillStyle='#ffd600';ctx.beginPath();
      ctx.moveTo(x-sz*0.2,y-sz*0.85);ctx.lineTo(x-sz*0.35,y-sz*1.3);ctx.lineTo(x-sz*0.1,y-sz*0.9);ctx.fill();
      ctx.beginPath();ctx.moveTo(x+sz*0.2,y-sz*0.85);ctx.lineTo(x+sz*0.35,y-sz*1.3);ctx.lineTo(x+sz*0.1,y-sz*0.9);ctx.fill();
      // Boss光环
      ctx.save();ctx.globalAlpha=0.12+Math.sin(Date.now()/200)*0.08;ctx.fillStyle='#ffd600';ctx.beginPath();ctx.arc(x,y,sz*1.8,0,Math.PI*2);ctx.fill();ctx.restore();
    }
    if(this.tk==='elite'){ctx.save();ctx.globalAlpha=0.18+Math.sin(Date.now()/300)*0.08;ctx.strokeStyle='#e040fb';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y-sz*0.2,sz*1.3,0,Math.PI*2);ctx.stroke();ctx.restore();}
  } else {
    // ====== 半兽人形态 ======
    // 身体
    var bodyG=ctx.createRadialGradient(x-sz*0.15,y-sz*0.15,sz*0.1,x,y,sz*1.1);
    bodyG.addColorStop(0,shade(this.col,40));bodyG.addColorStop(0.5,this.col);bodyG.addColorStop(1,shade(this.col,-50));
    ctx.fillStyle=bodyG;ctx.beginPath();ctx.arc(x,y,sz,0,Math.PI*2);ctx.fill();
    // 高光
    ctx.save();ctx.globalAlpha=0.25;var hl=ctx.createRadialGradient(x-sz*0.3,y-sz*0.3,0,x-sz*0.3,y-sz*0.3,sz*0.5);
    hl.addColorStop(0,'#fff');hl.addColorStop(1,'transparent');ctx.fillStyle=hl;ctx.beginPath();ctx.arc(x,y,sz,0,Math.PI*2);ctx.fill();ctx.restore();
    // 轮廓
    ctx.strokeStyle=shade(this.col,-60);ctx.lineWidth=2.5;ctx.stroke();
    // 獠牙
    ctx.fillStyle='#ffe0b2';ctx.beginPath();
    ctx.moveTo(x-sz*0.15,y+sz*0.2);ctx.lineTo(x-sz*0.1,y+sz*0.4);ctx.lineTo(x-sz*0.02,y+sz*0.2);ctx.fill();
    ctx.beginPath();ctx.moveTo(x+sz*0.02,y+sz*0.2);ctx.lineTo(x+sz*0.1,y+sz*0.4);ctx.lineTo(x+sz*0.15,y+sz*0.2);ctx.fill();
    // 眉骨突起
    ctx.fillStyle=shade(this.col,-20);
    ctx.beginPath();ctx.ellipse(x-sz*0.3,y-sz*0.25,sz*0.22,sz*0.1,-0.2,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(x+sz*0.3,y-sz*0.25,sz*0.22,sz*0.1,0.2,0,Math.PI*2);ctx.fill();
    // 眼睛
    ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(x-sz*0.3,y-sz*0.15,sz*0.18,sz*0.2,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.ellipse(x+sz*0.3,y-sz*0.15,sz*0.18,sz*0.2,0,0,Math.PI*2);ctx.fill();
    // 瞳孔
    var eyeCol=this.tk==='fast'?'#00e5ff':(this.tk==='tank'?'#ff6f00':'#ff1744');
    ctx.fillStyle=eyeCol;ctx.beginPath();ctx.arc(x-sz*0.28,y-sz*0.12,sz*0.09,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(x+sz*0.32,y-sz*0.12,sz*0.09,0,Math.PI*2);ctx.fill();
    // 眼睛高光
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x-sz*0.33,y-sz*0.18,sz*0.04,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(x+sz*0.27,y-sz*0.18,sz*0.04,0,Math.PI*2);ctx.fill();
    // 纹身/伤疤
    ctx.strokeStyle=shade(this.col,-70);ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(x-sz*0.4,y-sz*0.4);ctx.lineTo(x-sz*0.2,y);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x+sz*0.35,y-sz*0.35);ctx.lineTo(x+sz*0.15,y+sz*0.1);ctx.stroke();
  }
  
  // 血条
  var bw=isCentaur?sz*2.4:sz*2.2,by=y-(isCentaur?sz*1.4:sz)-10,bh=5;
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
  hero.atkTimer+=0.016;var hd=hData();if(hero.atkTimer<hd.atkSpd)return;hero.atkTimer=0;
  var hp=hPos(),range=hd.range*Math.min(W,H);
  if(dungeonEnemy){
    var d=Math.max(1,Math.floor(hero.atk*3.0*getAtkMult()*hero.buff*(hero._atkBonus||1)));
    // 法穿: 无视30%护甲
    var hd2=hData();if(hd2.extraPassive&&hd2.extraPassive.indexOf('法穿')>=0){d=Math.max(1,Math.floor(d*1.15));}
    dungeonEnemy.hp-=d;addP(dungeonEnemy.x*W,dungeonEnemy.y*H-20,'-'+d,'#ffd700',14);playSound('hit');
    // 吸血
    if(hd2.extraPassive&&hd2.extraPassive.indexOf('吸血')>=0){hero.hp=Math.min(hero.maxHp,hero.hp+Math.floor(d*0.15));}
    if(dungeonEnemy.hp<=0)completeDungeon();return;
  }
  var t=null,md=Infinity;for(var i=0;i<enemies.length;i++){var e=enemies[i],d=dist(hp.x,hp.y,e.x*W,e.y*H);if(d<range&&d<md){md=d;t=e;}}
  if(t){
    var d=Math.max(1,Math.floor(hero.atk*3.0*getAtkMult()*hero.buff*(hero._atkBonus||1)-t.def));
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

// ====== 技能释放（10种独特特效） ======
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
  var dmg=Math.floor(hero.atk*sk.dmg*hero.buff*0.15);
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
  if(dungeonEnemy){var d=Math.max(1,Math.floor(hero.atk*sk.dmg*hero.buff));dungeonEnemy.hp-=d;addP(dungeonEnemy.x*W,dungeonEnemy.y*H-20,'-'+d,'#ffd700',16);if(dungeonEnemy.hp<=0)completeDungeon();}
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
  if(s.reward>0){gold+=s.reward;addP(W/2,H/2,'+'+s.reward+'金!','#ffd700',22);}
  gainExp(s.exp);dungeonCompleted[d.type+'_'+lvl]=true;
  if(dungeonLevels[d.type]===lvl&&lvl<10)dungeonLevels[d.type]++;
  dungeonEnemy=null;dungeonActive=null;playSound('ult');showToast('副本完成!');
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
  // 自动转职 - 炫酷卡片
  var auto=document.createElement('div');auto.className='card auto';
  auto.innerHTML='<div class="icon" style="font-size:48px;">🎲</div><div class="name" style="color:#ff9800;font-size:15px;">随机转职</div><div class="bonus" style="font-size:13px;color:#4caf50;">全属性+10%</div><div class="desc">命运决定你的道路</div>';
  auto.onclick=function(){doPromo(true);};cards.appendChild(auto);
  // 手动选择
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
function doPromo(auto,key){var b=auto?1.1:1.05;if(auto){var o=getPromoOpts();key=o[Math.floor(Math.random()*o.length)].key;}hero.cls=key;hero.buff*=b;
  hero.promo++;
  // 攻击基于转职倍率重新计算
  var baseAtk=30+(hero.lv-1)*4;hero.atk=Math.floor(baseAtk*getPromoAtkMult(hero.promo));
  hero.def=Math.floor(hero.def*b)+hero.promo*5;
  hero.maxHp=Math.floor(hero.maxHp*b)+hero.promo*50;hero.hp=hero.maxHp;
  hero.maxMp=getMpByPromo(hero.promo);hero.mp=hero.maxMp;
  initHeroSkills(); // 转职后重新初始化技能
  document.getElementById('promo-modal').classList.remove('show');state='playing';var hp=hPos();addP(hp.x,hp.y-40,'转职:'+HEROES[key].name,'#ffd700',24);playSound('ult');
}

// ====== 波次 ======
function spawnWave(){
  var count=Math.max(10,(6+Math.floor(wave*1.5))*2),boss=wave%5===0;
  var ann=document.getElementById('wave-ann');ann.className=boss?'wave-ann boss':'wave-ann';ann.innerHTML=boss?'⚠️ BOSS ⚠️':'WAVE '+wave;ann.style.display='block';setTimeout(function(){ann.style.display='none';},2000);
  var n=0;var iv=setInterval(function(){if(n>=count||state==='gameover'){clearInterval(iv);return;}
    if(boss&&n===0)enemies.push(new Enemy('outer','boss'));else{var pk=Math.random()<0.5?'inner':'outer',r=Math.random(),tk='normal';if(wave>2&&r<0.15)tk='fast';else if(wave>4&&r<0.25)tk='tank';else if(wave>6&&r<0.32)tk='elite';enemies.push(new Enemy(pk,tk));}n++;},500);
  spawnNeutrals(); // 生成中立怪
}

function checkEnd(){
  if(kills>=3000)gameOver('🏆 胜利！击杀3000敌人！');
  if(enemies.length>=300)gameOver('敌人超过300!');
  if(hero.hp<=0)gameOver('英雄阵亡!');
}
function gameOver(r){state='gameover';document.getElementById('go-wave').textContent=wave;document.getElementById('go-kills').textContent=kills;document.getElementById('go-reason').textContent=r;document.getElementById('gameover').classList.add('show');}

// ====== UI ======
function updateUI(){
  document.getElementById('lv').textContent=hero.lv;document.getElementById('side-lv').textContent=hero.lv;
  document.getElementById('gold').textContent=gold;document.getElementById('wave').textContent=wave;
  document.getElementById('kills').textContent=kills;document.getElementById('enemies').textContent=enemies.length;
  document.getElementById('enemies').style.color=enemies.length>250?'#f44336':enemies.length>200?'#ff9800':'#ffd700';
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
    if(sk.cd>0){btn.classList.add('off');btn.classList.remove('on');var d=document.createElement('div');d.className='cd';d.textContent=Math.ceil(sk.cd);btn.appendChild(d);}
    else if(hero.mp<sk.cost){btn.classList.add('off');btn.classList.remove('on');}
    else{btn.classList.remove('off');btn.classList.add('on');}
  }
}

// ====== 绘制 ======
function drawMap(){
  // 背景 - 深色渐变 + 网格纹理
  var bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#0f1f0f');bg.addColorStop(0.5,'#1a2a1a');bg.addColorStop(1,'#0d1b0d');
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  // 网格
  ctx.strokeStyle='rgba(50,80,50,0.15)';ctx.lineWidth=1;
  for(var gx=0;gx<W;gx+=40){ctx.beginPath();ctx.moveTo(gx,0);ctx.lineTo(gx,H);ctx.stroke();}
  for(var gy=0;gy<H;gy+=40){ctx.beginPath();ctx.moveTo(0,gy);ctx.lineTo(W,gy);ctx.stroke();}
  // 路径 - 带发光效果
  ctx.save();ctx.shadowColor='rgba(139,119,80,0.5)';ctx.shadowBlur=15;
  drawPath(PATHS.outer,'rgba(120,90,50,0.6)',32);ctx.restore();
  drawPath(PATHS.outer,'rgba(80,60,30,0.8)',20);
  ctx.save();ctx.shadowColor='rgba(80,80,160,0.4)';ctx.shadowBlur=12;
  drawPath(PATHS.inner,'rgba(60,60,120,0.5)',26);ctx.restore();
  drawPath(PATHS.inner,'rgba(40,40,100,0.7)',16);
  // 塔位
  for(var i=0;i<TOWERS.length;i++){
    var t=TOWERS[i],tx=t.x*W,ty=t.y*H,active=hero.towerIdx===i;
    // 塔底座
    ctx.save();
    if(active){ctx.shadowColor='#ffd700';ctx.shadowBlur=20;}
    ctx.fillStyle=active?'rgba(74,144,217,0.3)':'rgba(50,50,50,0.3)';
    ctx.beginPath();ctx.arc(tx,ty,28,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=active?'#ffd700':'rgba(150,150,150,0.5)';
    ctx.lineWidth=active?3:2;ctx.stroke();
    ctx.restore();
    // 塔图标
    ctx.font=active?'18px Arial':'14px Arial';
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle=active?'#ffd700':'rgba(255,255,255,0.5)';
    ctx.fillText(active?'🏰':'🏚️',tx,ty);
    // 名称
    ctx.font='10px Arial';ctx.fillStyle=active?'#ffd700':'rgba(255,255,255,0.4)';
    ctx.fillText(t.name,tx,ty+40);
  }
}
function drawPath(path,col,w){ctx.strokeStyle=col;ctx.lineWidth=w;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(path[0].x*W,path[0].y*H);for(var i=1;i<path.length;i++)ctx.lineTo(path[i].x*W,path[i].y*H);ctx.closePath();ctx.stroke();}
function drawHero(){
  var hp=hPos(),hd=hData(),x=hp.x,y=hp.y+Math.sin(Date.now()/300)*3,sz=34;
  var promo=hero.promo||0;
  if(showRangeTimer>0){ctx.save();ctx.strokeStyle='rgba(255,255,255,0.3)';ctx.lineWidth=2;ctx.setLineDash([8,4]);ctx.beginPath();ctx.arc(x,y,hd.range*Math.min(W,H),0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.restore();}
  
  // 外圈光晕
  ctx.save();ctx.globalAlpha=0.25+Math.sin(Date.now()/400)*0.05;
  var gl=ctx.createRadialGradient(x,y,0,x,y,65);gl.addColorStop(0,getPromoGlow(promo));gl.addColorStop(1,'transparent');
  ctx.fillStyle=gl;ctx.beginPath();ctx.arc(x,y,65,0,Math.PI*2);ctx.fill();ctx.restore();
  
  // 阴影
  ctx.fillStyle='rgba(0,0,0,0.4)';ctx.beginPath();ctx.ellipse(x,y+sz*0.85,sz*0.7,sz*0.15,0,0,Math.PI*2);ctx.fill();
  
  // 头像框 - 基于转职变色
  var frameG=ctx.createRadialGradient(x-sz*0.1,y-sz*0.1,sz*0.1,x,y,sz*1.0);
  frameG.addColorStop(0,shade(hd.color,50));frameG.addColorStop(0.6,hd.color);frameG.addColorStop(1,shade(hd.color,-50));
  ctx.fillStyle=frameG;ctx.beginPath();ctx.arc(x,y,sz,0,Math.PI*2);ctx.fill();
  
  // 转职颜色叠加
  ctx.save();ctx.globalAlpha=0.35;ctx.fillStyle=getPromoColor(promo);
  ctx.beginPath();ctx.arc(x,y,sz,0,Math.PI*2);ctx.fill();ctx.restore();
  
  // 边框 - 转职颜色
  ctx.save();ctx.shadowColor=getPromoGlow(promo);ctx.shadowBlur=promo>0?20:12;
  ctx.strokeStyle=getPromoBorder(promo);ctx.lineWidth=promo>0?4:3;ctx.stroke();ctx.restore();
  
  // 转职等级星标
  if(promo>0){
    var starStr=['','⭐','⭐⭐','⭐⭐⭐'][promo];
    ctx.font='10px Arial';ctx.textAlign='center';ctx.fillStyle='#ffd700';
    ctx.fillText(starStr,x,y-sz-3);
  }
  
  // 头像emoji
  ctx.font=(sz*1.1)+'px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(hd.avatar,x,y+2);
  
  // 武器小图标
  ctx.font='14px Arial';ctx.fillText(hd.skin,x+sz*0.8,y+sz*0.5);
  
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
  drawMap();for(var i=0;i<lastingEffects.length;i++)lastingEffects[i].draw();
  for(var i=0;i<neutrals.length;i++)neutrals[i].draw(); // 中立怪
  for(var i=0;i<enemies.length;i++)enemies[i].draw();if(dungeonEnemy)dungeonEnemy.draw();
  drawHero();for(var i=0;i<effects.length;i++)effects[i].draw();for(var i=0;i<particles.length;i++)particles[i].draw();ctx.restore();
}

// ====== 主循环 ======
function update(){
  if(state!=='playing')return;if(moveCd>0)moveCd-=0.016;if(showRangeTimer>0)showRangeTimer--;if(adCooldown>0)adCooldown-=0.016;
  if(hero.hp>0)autoAtk();if(hero.mp<hero.maxMp)hero.mp+=getMpRegen()/60;for(var i=0;i<hero.skills.length;i++)if(hero.skills[i].cd>0)hero.skills[i].cd-=0.016;
  for(var i=enemies.length-1;i>=0;i--){enemies[i].update();if(enemies[i].hp<=0){kills++;gold+=enemies[i].boss?60:8;gainExp(enemies[i].exp);playSound('ult');
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
  if(dungeonActive){dungeonTimer-=0.016;if(dungeonTimer<=0)failDungeon();}
  waveT-=0.016;if(waveT<=0){wave++;waveT=10;spawnWave();}
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
  requestAnimationFrame(loop);setupEvents();
  document.addEventListener('click',initAudio,{once:true});document.addEventListener('touchstart',initAudio,{once:true});
  var hd=HEROES[hero.cls];
  showToast('英雄: '+hd.icon+' '+hd.cnName+'（'+hd.name+'）');
  // 教程
  setTimeout(function(){ checkTutorial(); }, 1500);
}

function setupEvents(){
  var sks=document.querySelectorAll('.sk');for(var i=0;i<sks.length;i++){(function(btn){var fn=function(e){e.preventDefault();e.stopPropagation();if(state==='playing')useSkill(parseInt(btn.dataset.skill));};btn.addEventListener('touchstart',fn);btn.addEventListener('click',fn);})(sks[i]);}
  canvas.addEventListener('click',function(e){
    if(state!=='playing')return;var rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)*(W/rect.width),y=(e.clientY-rect.top)*(H/rect.height);
    // 攻击中立怪
    for(var i=0;i<neutrals.length;i++){
      if(neutrals[i].alive&&neutrals[i].hitTest(x,y)){
        var n=neutrals[i],d=Math.max(1,Math.floor(hero.atk*3.0*getAtkMult()*hero.buff));
        n.hp-=d;addP(n.x*W,n.y*H-20,'-'+d,'#fff',14);playSound('hit');
        if(n.hp<=0)n.die();
        return;
      }
    }
    var hp=hPos();if(dist(x,y,hp.x,hp.y)<35){showRangeTimer=120;return;}if(moveCd>0)return;
    for(var i=0;i<TOWERS.length;i++){var t=TOWERS[i],tx=t.x*W,ty=t.y*H;if(dist(x,y,tx,ty)<35){if(hero.towerIdx!==i){hero.towerIdx=i;moveCd=3;addP(tx,ty-30,'移动!','#fff',14);playSound('ult');}return;}}
  });
  document.getElementById('btn-dungeon').onclick=function(e){if(e){e.preventDefault();e.stopPropagation();}if(state==='playing'&&!dungeonActive)showDungeonMenu();else if(dungeonActive)showToast('已在副本中!');return false;};
}

window.onload=init;
