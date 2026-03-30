// ====== 魔兽RPG V5.0 - 完全重写 ======
var canvas, ctx, W, H;
var state = 'playing';
var gold = 50, wave = 1, waveT = 8, kills = 0, shake = 0;
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

// 职业
var HEROES = {
  warrior: {name:'战士',icon:'⚔️',color:'#ff1744',skin:'🗡️',range:0.48,type:'str',atkSpd:0.9,ultCd:25,passive:'15%眩晕'},
  archer: {name:'弓手',icon:'🏹',color:'#2979ff',skin:'🎯',range:0.84,type:'agi',atkSpd:0.45,ultCd:22,passive:'20%双倍'},
  mage: {name:'法师',icon:'🔮',color:'#ffd600',skin:'✨',range:0.672,type:'int',atkSpd:0.7,ultCd:12,passive:'普攻减速'},
  blademaster: {name:'剑圣',icon:'⚔️',color:'#ff5252',skin:'🗡️',range:0.528,type:'str',atkSpd:0.85,ultCd:22,passive:'15%眩晕'},
  mountainking: {name:'山丘',icon:'🛡️',color:'#ffd700',skin:'🔨',range:0.432,type:'str',atkSpd:1.0,ultCd:28,passive:'15%眩晕'},
  bloodmage: {name:'血法',icon:'🔥',color:'#d32f2f',skin:'🔥',range:0.6,type:'int',atkSpd:0.65,ultCd:10,passive:'普攻减速'},
  windrunner: {name:'风行',icon:'💨',color:'#00e676',skin:'💨',range:0.96,type:'agi',atkSpd:0.4,ultCd:20,passive:'20%双倍'},
  shadowhunter: {name:'暗猎',icon:'🌑',color:'#7b1fa2',skin:'🗡️',range:0.792,type:'agi',atkSpd:0.35,ultCd:18,passive:'25%双倍'},
  frost: {name:'冰法',icon:'❄️',color:'#4fc3f7',skin:'❄️',range:0.72,type:'int',atkSpd:0.75,ultCd:11,passive:'普攻减速'},
  storm: {name:'雷法',icon:'⚡',color:'#7c4dff',skin:'⚡',range:0.672,type:'int',atkSpd:0.6,ultCd:8,passive:'普攻减速'},
  titan: {name:'泰坦',icon:'🏔️',color:'#ff8f00',skin:'🏔️',range:0.48,type:'str',atkSpd:0.9,ultCd:30,passive:'15%眩晕'},
  gale: {name:'疾风',icon:'🌪️',color:'#18ffff',skin:'🌪️',range:1.056,type:'agi',atkSpd:0.35,ultCd:25,passive:'20%双倍'},
  inferno: {name:'炎魔',icon:'🌋',color:'#ff6d00',skin:'🌋',range:0.672,type:'int',atkSpd:0.6,ultCd:8,passive:'普攻减速'},
  phoenix: {name:'凤凰',icon:'🦚',color:'#ff4081',skin:'🦚',range:0.792,type:'int',atkSpd:0.55,ultCd:7,passive:'普攻减速'}
};

// 怪物类型
var MTYPES = {
  normal: {col:'#66bb6a',hpM:1,spdM:1},
  fast: {col:'#00bcd4',hpM:0.6,spdM:1.8},
  tank: {col:'#8d6e63',hpM:2.5,spdM:0.6},
  elite: {col:'#e040fb',hpM:2,spdM:1},
  boss: {col:'#ffd600',hpM:8,spdM:0.7}
};

// 副本系统
var DUNGEONS = [
  {name:'金币副本',icon:'💰',type:'gold'},
  {name:'经验副本',icon:'⭐',type:'exp'},
  {name:'Boss挑战',icon:'👹',type:'boss'}
];
var dungeonLevels = {gold:1,exp:1,boss:1};
var dungeonCompleted = {};
var dungeonActive = null, dungeonEnemy = null, dungeonTimer = 0;
var selectedDungeon = null;

// 经验表
var EXP_TABLE = [50,100,150,200,300,400,600,800,1200,2000];

function getDungeonStats(d,level) {
  var l = level, baseExp = EXP_TABLE[Math.min(l-1,9)];
  if(d.type==='gold') return {hp:80*l*l+l*50,time:15+l*2,reward:30*l*l+l*20,exp:baseExp,cost:Math.max(5,Math.floor(5*l*l*0.3))};
  if(d.type==='exp') return {hp:60*l*l+l*40,time:18+l*2,reward:0,exp:Math.floor(baseExp*1.5),cost:Math.max(8,Math.floor(8*l*l*0.3))};
  return {hp:150*l*l+l*100,time:25+l*3,reward:50*l*l+l*30,exp:Math.floor(baseExp*1.2),cost:Math.max(10,Math.floor(10*l*l*0.3))};
}

// 英雄
var hero = {
  cls:'warrior',towerIdx:4,lv:1,exp:0,expNeed:100,
  hp:150,maxHp:150,mp:80,maxMp:80,atk:30,def:8,atkTimer:0,
  crit:0.1,critDmg:2.0,promo:0,buff:1.0,
  skills:[
    {name:'小必杀',cd:0,maxCd:5,dmg:3.75,ic:'💫',aoe:0.506,type:'small'},
    {name:'大必杀',cd:0,maxCd:20,dmg:4.2,ic:'⚡',aoe:0.945,type:'big'}
  ]
};

function hPos() { return {x:TOWERS[hero.towerIdx].x*W, y:TOWERS[hero.towerIdx].y*H}; }
function hData() { return HEROES[hero.cls]||HEROES.warrior; }

var enemies=[], particles=[], effects=[], lastingEffects=[];

// ====== 音效 ======
var audioCtx=null;
function initAudio(){if(!audioCtx)try{audioCtx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}}
function playSound(t){if(!audioCtx)return;try{var o=audioCtx.createOscillator(),g=audioCtx.createGain();o.connect(g);g.connect(audioCtx.destination);o.frequency.value=t==='ult'?200:400;g.gain.value=0.15;g.gain.exponentialRampToValueAtTime(0.01,audioCtx.currentTime+0.15);o.start();o.stop(audioCtx.currentTime+0.15);}catch(e){}}

// ====== 敌人类 ======
function Enemy(pk,tk){
  var path=pk==='inner'?PATHS.inner:PATHS.outer,type=MTYPES[tk];
  this.path=path;this.wp=0;this.pk=pk;this.tk=tk;
  this.x=path[0].x+(Math.random()-0.5)*0.05;this.y=path[0].y+(Math.random()-0.5)*0.05;
  this.boss=tk==='boss';var wm=1+wave*0.1;
  this.hp=(50+wave*12)*type.hpM*wm;this.maxHp=this.hp;
  this.def=3+wave*(this.boss?2:0.8);this.spd=(pk==='inner'?0.004:0.0025)*type.spdM;
  this.exp=Math.floor((20+wave*8)*(this.boss?5:1));
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
  ctx.fillStyle='rgba(0,0,0,0.3)';ctx.beginPath();ctx.ellipse(x,y+sz*0.8,sz*0.8,sz*0.2,0,0,Math.PI*2);ctx.fill();
  var g=ctx.createRadialGradient(x,y,0,x,y,sz);g.addColorStop(0,this.col);g.addColorStop(1,shade(this.col,-40));
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,sz,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=shade(this.col,-50);ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x-sz*0.3,y-sz*0.1,sz*0.18,0,Math.PI*2);ctx.arc(x+sz*0.3,y-sz*0.1,sz*0.18,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=this.boss?'#f00':'#111';ctx.beginPath();ctx.arc(x-sz*0.3,y-sz*0.1,sz*0.08,0,Math.PI*2);ctx.arc(x+sz*0.3,y-sz*0.1,sz*0.08,0,Math.PI*2);ctx.fill();
  if(this.boss){ctx.fillStyle='#ffd600';ctx.beginPath();ctx.moveTo(x-sz*0.4,y-sz*0.7);ctx.lineTo(x-sz*0.2,y-sz*1.2);ctx.lineTo(x,y-sz*0.6);ctx.fill();ctx.beginPath();ctx.moveTo(x+sz*0.4,y-sz*0.7);ctx.lineTo(x+sz*0.2,y-sz*1.2);ctx.lineTo(x,y-sz*0.6);ctx.fill();}
  var bw=sz*2,by=y-sz-8;ctx.fillStyle='#222';ctx.fillRect(x-bw/2,by,bw,4);ctx.fillStyle=this.hp/this.maxHp>0.5?'#4caf50':'#f44336';ctx.fillRect(x-bw/2,by,bw*(this.hp/this.maxHp),4);
};

// ====== 副本敌人 ======
function DungeonEnemy(d,level){
  var s=getDungeonStats(d,level);this.x=0.5;this.y=0.5;this.hp=s.hp;this.maxHp=s.hp;this.sz=0.06;this.dungeon=d;this.level=level;this.def=0;
}
DungeonEnemy.prototype.update=function(){return true;};
DungeonEnemy.prototype.draw=function(){
  var x=this.x*W,y=this.y*H,sz=this.sz*Math.min(W,H);
  ctx.save();ctx.shadowColor='#ffd700';ctx.shadowBlur=20;ctx.fillStyle='#ffd700';ctx.beginPath();ctx.arc(x,y,sz,0,Math.PI*2);ctx.fill();ctx.restore();
  ctx.font='bold '+(sz*0.8)+'px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.fillText(this.dungeon.icon,x,y);
  ctx.fillStyle='#222';ctx.fillRect(x-40,y-sz-15,80,8);ctx.fillStyle='#ffd700';ctx.fillRect(x-40,y-sz-15,80*(this.hp/this.maxHp),8);
  ctx.fillStyle=dungeonTimer<5?'#f44336':'#fff';ctx.font='bold 16px Arial';ctx.textAlign='center';ctx.fillText(Math.ceil(dungeonTimer)+'s',x,y+sz+20);
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
  if(dungeonEnemy){var d=Math.max(1,Math.floor(hero.atk*hero.buff));dungeonEnemy.hp-=d;addP(dungeonEnemy.x*W,dungeonEnemy.y*H-20,'-'+d,'#ffd700',14);playSound('hit');if(dungeonEnemy.hp<=0)completeDungeon();return;}
  var t=null,md=Infinity;for(var i=0;i<enemies.length;i++){var e=enemies[i],d=dist(hp.x,hp.y,e.x*W,e.y*H);if(d<range&&d<md){md=d;t=e;}}
  if(t){var d=Math.max(1,Math.floor(hero.atk*hero.buff-t.def));t.hp-=d;addP(t.x*W,t.y*H-15,'-'+d,hd.color,12);playSound('hit');}
}

// ====== 技能释放 ======
function useSkill(idx){
  var sk=hero.skills[idx],costs=[12,25];if(sk.cd>0||hero.mp<costs[idx])return;
  sk.cd=sk.maxCd;hero.mp-=costs[idx];var hp=hPos(),hd=hData(),aoe=sk.aoe*Math.min(W,H);
  
  // === 显示技能名称 (大字) ===
  var nameColor=sk.type==='big'?'#ffd700':'#fff';
  var nameSize=sk.type==='big'?36:28;
  addP(hp.x,hp.y-70,sk.name,nameColor,nameSize);
  addP(hp.x+2,hp.y-68,sk.name,'#000',nameSize);
  addP(hp.x,hp.y-40,sk.ic,nameColor,32);
  
  // === 显示范围 ===
  showRangeTimer=30;
  
  // === 持续效果 ===
  var dmg=Math.floor(hero.atk*sk.dmg*hero.buff*0.15);
  lastingEffects.push(new LastingEffect(sk.type,hp.x,hp.y,aoe,dmg,120));
  
  // === 特效粒子 ===
  for(var j=0;j<(sk.type==='big'?15:8);j++){
    var ang=j*(sk.type==='big'?24:45)*Math.PI/180;
    addP(hp.x+Math.cos(ang)*aoe*0.5,hp.y+Math.sin(ang)*aoe*0.5,sk.ic,sk.type==='big'?'#ffd700':hd.color,20);
  }
  if(sk.type==='big'){addP(hp.x,hp.y,'💥','#ff6f00',36);}
  
  // === 伤害 ===
  if(dungeonEnemy){var d=Math.max(1,Math.floor(hero.atk*sk.dmg*hero.buff));dungeonEnemy.hp-=d;addP(dungeonEnemy.x*W,dungeonEnemy.y*H-20,'-'+d,'#ffd700',16);if(dungeonEnemy.hp<=0)completeDungeon();}
  else{for(var i=0;i<enemies.length;i++){var e=enemies[i];if(dist(hp.x,hp.y,e.x*W,e.y*H)<aoe){var d=Math.max(1,Math.floor(hero.atk*sk.dmg*hero.buff-e.def));e.hp-=d;addP(e.x*W,e.y*H-15,'-'+d,sk.type==='big'?'#ffd700':'#4fc3f7',14);}}}
  shake=sk.type==='big'?12:6;playSound('ult');updateSkUI();
}

// ====== 副本系统 ======
function showDungeonMenu(){
  console.log('打开副本菜单');state='paused';selectedDungeon=null;
  var modal=document.getElementById('dungeon-modal'),list=document.getElementById('dungeon-list'),panel=document.getElementById('lvl-panel');
  list.innerHTML='';
  for(var i=0;i<DUNGEONS.length;i++){
    var d=DUNGEONS[i],lvl=dungeonLevels[d.type],s=getDungeonStats(d,lvl);
    var card=document.createElement('div');card.className='card';card.style.cursor='pointer';
    card.innerHTML='<div class="icon">'+d.icon+'</div><div class="name">'+d.name+'</div><div class="level">Lv.1-'+lvl+'</div><div class="desc">'+s.cost+'金 | '+s.exp+'EXP</div>';
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
    btn.className='lvl-btn'+(locked?' locked':'')+(completed?' completed':'');
    btn.textContent='Lv.'+i+(completed?' ✓':'');
    if(i<=maxLvl&&!completed){
      (function(dType,lvl){btn.onclick=function(){var d=null;for(var j=0;j<DUNGEONS.length;j++)if(DUNGEONS[j].type===dType){d=DUNGEONS[j];break;}
      if(d){var s=getDungeonStats(d,lvl);if(gold<s.cost){showToast('金币不足!需'+s.cost+'金');return;}enterDungeon(d,lvl);}};})(selectedDungeon.type,i);
    }grid.appendChild(btn);
  }panel.style.display='block';
}

function enterDungeon(d,level){
  var s=getDungeonStats(d,level);if(gold<s.cost){showToast('金币不足!');return;}
  gold-=s.cost;dungeonActive=d;dungeonEnemy=new DungeonEnemy(d,level);dungeonTimer=s.time;
  document.getElementById('dungeon-modal').classList.remove('show');state='playing';
  showToast('进入'+d.name+' Lv.'+level+'!');
}

function completeDungeon(){
  var d=dungeonActive,lvl=dungeonEnemy.level,s=getDungeonStats(d,lvl);
  if(s.reward>0){gold+=s.reward;addP(W/2,H/2,'+'+s.reward+'金!','#ffd700',22);}
  gainExp(s.exp);dungeonCompleted[d.type+'_'+lvl]=true;
  if(dungeonLevels[d.type]===lvl&&lvl<10)dungeonLevels[d.type]++;
  dungeonEnemy=null;dungeonActive=null;playSound('ult');showToast('副本完成!');
}
function failDungeon(){dungeonEnemy=null;dungeonActive=null;showToast('副本失败!');}

// ====== 升级转职 ======
function gainExp(a){hero.exp+=a;while(hero.exp>=hero.expNeed){hero.exp-=hero.expNeed;levelUp();}}
function levelUp(){hero.lv++;hero.expNeed=Math.floor(100*Math.pow(hero.lv,1.15));hero.maxHp+=25;hero.hp=hero.maxHp;hero.maxMp+=12;hero.mp=hero.maxMp;hero.atk+=4;hero.def+=2;
  var hp=hPos();addP(hp.x,hp.y-35,'LEVEL UP!','#ffd700',20);playSound('ult');
  if(hero.lv===5&&hero.promo===0)showPromo();if(hero.lv===10&&hero.promo===1)showPromo();
}

function showPromo(){
  state='paused';var modal=document.getElementById('promo-modal'),cards=document.getElementById('promo-cards');cards.innerHTML='';
  var auto=document.createElement('div');auto.className='card auto';auto.innerHTML='<div class="icon">🎲</div><div class="name">自动+20%</div>';auto.onclick=function(){doPromo(true);};cards.appendChild(auto);
  var opts=getPromoOpts();for(var i=0;i<opts.length;i++){var o=opts[i],c=document.createElement('div');c.className='card';c.style.borderColor=o.color;c.innerHTML='<div class="icon">'+o.icon+'</div><div class="name">'+o.name+'</div><div class="bonus">+10%</div>';;(function(k){c.onclick=function(){doPromo(false,k);};})(o.key);cards.appendChild(c);}
  modal.classList.add('show');
}
function getPromoOpts(){var hd=hData(),o=[];if(hero.promo===0){if(hd.type==='str'){o.push({key:'blademaster',...HEROES.blademaster});o.push({key:'mountainking',...HEROES.mountainking});}else if(hd.type==='agi'){o.push({key:'windrunner',...HEROES.windrunner});o.push({key:'shadowhunter',...HEROES.shadowhunter});}else{o.push({key:'bloodmage',...HEROES.bloodmage});o.push({key:'frost',...HEROES.frost});}}else{if(hd.type==='str')o.push({key:'titan',...HEROES.titan});else if(hd.type==='agi')o.push({key:'gale',...HEROES.gale});else o.push({key:'storm',...HEROES.storm});}return o;}
function doPromo(auto,key){var b=auto?1.2:1.1;if(auto){var o=getPromoOpts();key=o[Math.floor(Math.random()*o.length)].key;}hero.cls=key;hero.buff*=b;hero.atk=Math.floor(hero.atk*b);hero.def=Math.floor(hero.def*b);hero.maxHp=Math.floor(hero.maxHp*b);hero.hp=hero.maxHp;hero.maxMp=Math.floor(hero.maxMp*b);hero.mp=hero.maxMp;hero.promo++;
  document.getElementById('promo-modal').classList.remove('show');state='playing';var hp=hPos();addP(hp.x,hp.y-40,'转职:'+HEROES[key].name,'#ffd700',24);playSound('ult');
}

// ====== 波次 ======
function spawnWave(){
  var count=6+Math.floor(wave*1.5),boss=wave%5===0;
  var ann=document.getElementById('wave-ann');ann.className=boss?'wave-ann boss':'wave-ann';ann.innerHTML=boss?'⚠️ BOSS ⚠️':'WAVE '+wave;ann.style.display='block';setTimeout(function(){ann.style.display='none';},2000);
  var n=0;var iv=setInterval(function(){if(n>=count||state==='gameover'){clearInterval(iv);return;}
    if(boss&&n===0)enemies.push(new Enemy('outer','boss'));else{var pk=Math.random()<0.5?'inner':'outer',r=Math.random(),tk='normal';if(wave>2&&r<0.15)tk='fast';else if(wave>4&&r<0.25)tk='tank';else if(wave>6&&r<0.32)tk='elite';enemies.push(new Enemy(pk,tk));}n++;},500);
}

function checkEnd(){if(enemies.length>=100)gameOver('敌人超过100!');if(hero.hp<=0)gameOver('英雄阵亡!');}
function gameOver(r){state='gameover';document.getElementById('go-wave').textContent=wave;document.getElementById('go-kills').textContent=kills;document.getElementById('go-reason').textContent=r;document.getElementById('gameover').classList.add('show');}

// ====== UI ======
function updateUI(){
  document.getElementById('lv').textContent=hero.lv;document.getElementById('side-lv').textContent=hero.lv;
  document.getElementById('gold').textContent=gold;document.getElementById('wave').textContent=wave;
  document.getElementById('kills').textContent=kills;document.getElementById('enemies').textContent=enemies.length;
  document.getElementById('enemies').style.color=enemies.length>80?'#f44336':enemies.length>60?'#ff9800':'#ffd700';
  var hd=hData();document.getElementById('class-skin').textContent=hd.skin;document.getElementById('class-name').textContent=hd.name;
  document.getElementById('hp-bar').style.width=(hero.hp/hero.maxHp*100)+'%';
  document.getElementById('mp-bar').style.width=(hero.mp/hero.maxMp*100)+'%';
  document.getElementById('exp-bar').style.width=(hero.exp/hero.expNeed*100)+'%';
  var mc=document.getElementById('move-cd');if(moveCd>0){mc.textContent='移动: '+Math.ceil(moveCd)+'s';mc.style.display='block';}else{mc.style.display='none';}
  updateSkUI();
}
function updateSkUI(){
  var costs=[12,25];for(var i=0;i<2;i++){
    var btn=document.querySelector('[data-skill="'+i+'"]'),sk=hero.skills[i];
    btn.querySelector('.ic').textContent=sk.ic;btn.querySelector('.nm').textContent=sk.name;
    var old=btn.querySelector('.cd');if(old)old.remove();
    if(sk.cd>0){btn.classList.add('off');btn.classList.remove('on');var d=document.createElement('div');d.className='cd';d.textContent=Math.ceil(sk.cd);btn.appendChild(d);}
    else if(hero.mp<costs[i]){btn.classList.add('off');btn.classList.remove('on');}
    else{btn.classList.remove('off');btn.classList.add('on');}
  }
}

// ====== 绘制 ======
function drawMap(){
  var bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#1a2a1a');bg.addColorStop(1,'#0d1b0d');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  drawPath(PATHS.outer,'rgba(100,70,40,0.5)',30);drawPath(PATHS.inner,'rgba(80,80,120,0.4)',24);
  for(var i=0;i<TOWERS.length;i++){var t=TOWERS[i],tx=t.x*W,ty=t.y*H,active=hero.towerIdx===i;
    ctx.strokeStyle=active?'#ffd700':'rgba(150,150,150,0.5)';ctx.lineWidth=active?3:2;ctx.beginPath();ctx.arc(tx,ty,25,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle=active?'rgba(74,144,217,0.2)':'rgba(50,50,50,0.2)';ctx.fill();
    ctx.fillStyle=active?'#ffd700':'rgba(255,255,255,0.4)';ctx.font='10px Arial';ctx.textAlign='center';ctx.fillText((active?'📍':'')+t.name,tx,ty+38);
  }
}
function drawPath(path,col,w){ctx.strokeStyle=col;ctx.lineWidth=w;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(path[0].x*W,path[0].y*H);for(var i=1;i<path.length;i++)ctx.lineTo(path[i].x*W,path[i].y*H);ctx.closePath();ctx.stroke();}
function drawHero(){
  var hp=hPos(),hd=hData(),x=hp.x,y=hp.y+Math.sin(Date.now()/300)*3,sz=28;
  if(showRangeTimer>0){ctx.save();ctx.strokeStyle='rgba(255,255,255,0.3)';ctx.lineWidth=2;ctx.setLineDash([8,4]);ctx.beginPath();ctx.arc(x,y,hd.range*Math.min(W,H),0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.restore();}
  ctx.save();ctx.globalAlpha=0.15;var gl=ctx.createRadialGradient(x,y,0,x,y,40);gl.addColorStop(0,hd.color);gl.addColorStop(1,'transparent');ctx.fillStyle=gl;ctx.beginPath();ctx.arc(x,y,40,0,Math.PI*2);ctx.fill();ctx.restore();
  var g=ctx.createRadialGradient(x-5,y-5,3,x,y,24);g.addColorStop(0,'#fff');g.addColorStop(0.3,hd.color);g.addColorStop(1,shade(hd.color,-40));ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,sz,0,Math.PI*2);ctx.fill();
  ctx.shadowColor=hd.color;ctx.shadowBlur=15;ctx.strokeStyle='#fff';ctx.lineWidth=2.5;ctx.stroke();ctx.shadowBlur=0;
  ctx.fillStyle='#ffe0b2';ctx.beginPath();ctx.arc(x,y-2,sz*0.55,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(x-8,y-5,7,8,0,0,Math.PI*2);ctx.ellipse(x+8,y-5,7,8,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#333';ctx.beginPath();ctx.arc(x-7,y-4,4,0,Math.PI*2);ctx.arc(x+9,y-4,4,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x-9,y-6,2,0,Math.PI*2);ctx.arc(x+7,y-6,2,0,Math.PI*2);ctx.fill();
  var typeLabel=hd.type==='str'?'力量':(hd.type==='agi'?'敏捷':'智力');
  ctx.font='bold 10px Arial';ctx.textAlign='center';ctx.fillStyle=hd.type==='str'?'#ff1744':(hd.type==='agi'?'#2979ff':'#ffd600');ctx.fillText('['+typeLabel+']',x,y-sz-18);
  ctx.font='bold 11px Arial';ctx.fillStyle=hd.color;ctx.fillText(hd.name+' Lv.'+hero.lv,x,y+sz+18);
  // 被动技能显示
  ctx.font='9px Arial';ctx.fillStyle='#aaa';ctx.fillText(hd.passive,x,y+sz+30);
  var bw=48;ctx.fillStyle='#222';ctx.fillRect(x-bw/2,y-32,bw,5);ctx.fillStyle=hero.hp>hero.maxHp*0.5?'#4caf50':'#f44336';ctx.fillRect(x-bw/2,y-32,bw*(hero.hp/hero.maxHp),5);
  ctx.fillStyle='#1a1a3a';ctx.fillRect(x-bw/2,y-26,bw,3);ctx.fillStyle='#2196f3';ctx.fillRect(x-bw/2,y-26,bw*(hero.mp/hero.maxMp),3);
}

function draw(){
  ctx.clearRect(0,0,W,H);ctx.save();if(shake>0)ctx.translate((Math.random()-0.5)*shake,(Math.random()-0.5)*shake);
  drawMap();for(var i=0;i<lastingEffects.length;i++)lastingEffects[i].draw();
  for(var i=0;i<enemies.length;i++)enemies[i].draw();if(dungeonEnemy)dungeonEnemy.draw();
  drawHero();for(var i=0;i<effects.length;i++)effects[i].draw();for(var i=0;i<particles.length;i++)particles[i].draw();ctx.restore();
}

// ====== 主循环 ======
function update(){
  if(state!=='playing')return;if(moveCd>0)moveCd-=0.016;if(showRangeTimer>0)showRangeTimer--;
  if(hero.hp>0)autoAtk();if(hero.mp<hero.maxMp)hero.mp+=0.06;for(var i=0;i<hero.skills.length;i++)if(hero.skills[i].cd>0)hero.skills[i].cd-=0.016;
  for(var i=enemies.length-1;i>=0;i--){enemies[i].update();if(enemies[i].hp<=0){kills++;gold+=enemies[i].boss?60:8;gainExp(enemies[i].exp);playSound('ult');
    var kx=enemies[i].x*W,ky=enemies[i].y*H;for(var j=0;j<8;j++){var a=j*45*Math.PI/180;addP(kx+Math.cos(a)*20,ky+Math.sin(a)*20,'✦',enemies[i].boss?'#ffd700':'#ff6f00',10);}
    addP(kx,ky,'+'+enemies[i].exp+'EXP','#4fc3f7',12);enemies.splice(i,1);}}
  for(var i=particles.length-1;i>=0;i--)if(!particles[i].update())particles.splice(i,1);
  for(var i=lastingEffects.length-1;i>=0;i--)if(!lastingEffects[i].update())lastingEffects.splice(i,1);
  if(dungeonActive){dungeonTimer-=0.016;if(dungeonTimer<=0)failDungeon();}
  waveT-=0.016;if(waveT<=0){wave++;waveT=22+wave;spawnWave();}
  if(shake>0)shake*=0.85;if(shake<0.5)shake=0;checkEnd();updateUI();
}
function loop(){update();draw();requestAnimationFrame(loop);}

// ====== 初始化 ======
function init(){
  canvas=document.getElementById('game');ctx=canvas.getContext('2d');
  var app=document.getElementById('app');W=canvas.width=app.clientWidth;H=canvas.height=app.clientHeight;
  initAudio();requestAnimationFrame(loop);setupEvents();
  document.addEventListener('click',initAudio,{once:true});document.addEventListener('touchstart',initAudio,{once:true});
}

function setupEvents(){
  var sks=document.querySelectorAll('.sk');for(var i=0;i<sks.length;i++){(function(btn){var fn=function(e){e.preventDefault();e.stopPropagation();if(state==='playing')useSkill(parseInt(btn.dataset.skill));};btn.addEventListener('touchstart',fn);btn.addEventListener('click',fn);})(sks[i]);}
  canvas.addEventListener('click',function(e){
    if(state!=='playing')return;var rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)*(W/rect.width),y=(e.clientY-rect.top)*(H/rect.height);
    var hp=hPos();if(dist(x,y,hp.x,hp.y)<35){showRangeTimer=120;return;}if(moveCd>0)return;
    for(var i=0;i<TOWERS.length;i++){var t=TOWERS[i],tx=t.x*W,ty=t.y*H;if(dist(x,y,tx,ty)<35){if(hero.towerIdx!==i){hero.towerIdx=i;moveCd=3;addP(tx,ty-30,'移动!','#fff',14);playSound('ult');}return;}}
  });
  document.getElementById('btn-dungeon').onclick=function(e){if(e){e.preventDefault();e.stopPropagation();}if(state==='playing'&&!dungeonActive)showDungeonMenu();else if(dungeonActive)showToast('已在副本中!');return false;};
  document.getElementById('btn-lvl').onclick=showLevelSelect;
  document.getElementById('btn-close-dungeon').onclick=function(){document.getElementById('dungeon-modal').classList.remove('show');state='playing';};
}

window.onload=init;
