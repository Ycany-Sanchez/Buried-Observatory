import { W, H, ROOMS, ROOM_FEATURES, isFloor } from './rooms.mjs';
import { lastUnlocked, SYMBOLS } from './state.mjs';
import { LIGHT_PATH, lightEndpoint, lightHandle } from './light.mjs';
const palette = { gold: '#bda374', light: '#e2c58a', stone: '#324346', dark: '#0c1a20', teal: '#568881' };
const hash = (x, y) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);}
function line(c,x,y,x2,y2,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(Math.round(x)+.5,Math.round(y)+.5);c.lineTo(Math.round(x2)+.5,Math.round(y2)+.5);c.stroke();}
function circle(c,x,y,r,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke();}
function glow(c,x,y,r,color){const g=c.createRadialGradient(x,y,1,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}
export function symbol(c,id,x,y,size=7,color=palette.gold){
  c.save();c.translate(x,y);c.strokeStyle=color;c.fillStyle=color;c.lineWidth=1;
  if(id==='crescent'){c.beginPath();c.arc(0,0,size*.65,.5,5.8);c.quadraticCurveTo(-size*.3,0,size*.56,size*.3);c.fill();}
  else if(id==='star'){c.beginPath();c.moveTo(0,-size);c.lineTo(size*.25,-size*.25);c.lineTo(size,0);c.lineTo(size*.25,size*.25);c.lineTo(0,size);c.lineTo(-size*.25,size*.25);c.lineTo(-size,0);c.lineTo(-size*.25,-size*.25);c.closePath();c.fill();}
  else{circle(c,0,0,size*.44,color);for(let a=0;a<8;a++){const t=a*Math.PI/4;line(c,Math.cos(t)*size*.65,Math.sin(t)*size*.65,Math.cos(t)*size,Math.sin(t)*size,color);}}
  c.restore();
}
function candle(c,x,y,t=0){rect(c,x-2,y+1,5,3,'#655b3e');rect(c,x,y-5,2,7,'#bdad79');rect(c,x,y-8,2,3,'#efd899');rect(c,x,y-9,1,2,'#fff1bd');glow(c,x+1,y-6,20+Math.sin(t*2+x)*2,'#e2ad3b25');}
function bookshelf(c,x,y,w){rect(c,x,y,w,12,'#152325');rect(c,x,y,w,2,'#68634b');rect(c,x,y+11,w,3,'#494936');for(let i=3;i<w-3;i+=4){const v=hash(x+i,y);rect(c,x+i,y+3,3,6+Math.floor(v*3),v>.6?'#897b58':v>.3?'#3c6260':'#6d5547');}rect(c,x,y,2,14,'#6c6047');rect(c,x+w-2,y,2,14,'#6c6047');}
export function makeScene(room, image){
  const cvs=document.createElement('canvas');cvs.width=W;cvs.height=H;const c=cvs.getContext('2d');c.imageSmoothingEnabled=false;
  rect(c,0,0,W,H,'#09151b');
  if(image?.complete&&image.naturalWidth){c.globalAlpha=.5;c.drawImage(image,0,0,W,H);c.globalAlpha=1;rect(c,0,0,W,H,'#06121845');}
  for(let y=0;y<H;y+=10)for(let x=0;x<W;x+=11){if(x>30&&x<450&&y>30&&y<293)continue;const v=hash(x,y+room*11);if(v>.3){rect(c,x+(v*4|0),y,8+(v*4|0),7,v>.75?'#182a32':'#102029');rect(c,x+(v*4|0),y,8,1,'#263740');}}
  rect(c,38,39,404,249,'#132128');
  const floors=[['#253337','#29383b','#203035'],['#293434','#2d3937','#263332'],['#20373b','#253d40','#1d3338'],['#2b333f','#303947','#252e3a'],['#333a36','#3a4039','#2d3633']][room];
  for(let y=44;y<285;y+=16)for(let x=42;x<439;x+=16){const v=hash(x,y+room*17);rect(c,x,y,15,15,floors[Math.floor(v*3)]);rect(c,x,y,15,1,'#53606224');if(v>.62){line(c,x+3,y+9,x+6,y+7,'#101e2444');line(c,x+6,y+7,x+9,y+9,'#101e2444');}if(v>.86)rect(c,x+10,y+4,2,1,'#73817a3c');}
  if(room===3){
    for(let y=47;y<280;y+=3)for(let x=44;x<437;x+=3)if(!isFloor(room,x,y))rect(c,x,y,3,3,'#07151e');
    c.strokeStyle='#817e70';c.lineWidth=2;c.beginPath();c.ellipse(240,164,194,116,0,0,Math.PI*2);c.stroke();
  }
  for(let x=30;x<451;x+=16){rect(c,x,30,15,15,'#35474b');rect(c,x+1,31,13,2,'#536061');rect(c,x,44,15,5,'#13262c');rect(c,x,284,15,9,'#1b3036');rect(c,x+1,284,13,2,'#3d5050');}
  for(let y=45;y<284;y+=16){rect(c,30,y,12,15,'#2f4249');rect(c,31,y+1,2,12,'#45585b');rect(c,438,y,12,15,'#263b42');rect(c,438,y,2,15,'#12252e');}
  for(const [x,y]of [[54,58],[425,60],[55,269],[424,266]]){rect(c,x-7,y-8,14,17,'#1b2e33');rect(c,x-6,y-9,12,4,'#4c5a56');rect(c,x-4,y+8,9,3,'#43514e');}
  if(room===0){
    for(const r of [57,74,78])circle(c,240,171,r,'#a28b4b35');line(c,162,171,318,171,'#a28b4b28');line(c,240,94,240,247,'#a28b4b28');
    for(let a=0;a<8;a++){const t=a*Math.PI/4;rect(c,240+Math.cos(t)*74,171+Math.sin(t)*74,2,2,'#bdac7750');}
    symbol(c,'star',240,171,14,'#9a946145');bookshelf(c,63,44,72);bookshelf(c,331,44,77);
    for(let i=0;i<12;i++){const x=182+i*10;rect(c,x,37,7,4,'#788a8a');}
    glow(c,240,52,90,'#94b0ab15');
  }else if(room===1){
    for(const x of [64,132,305,373])bookshelf(c,x,48,44);bookshelf(c,48,156,37);bookshelf(c,395,157,34);
    for(let i=0;i<5;i++){rect(c,212+i*12,154+(i%2)*9,9,7,['#6d6250','#80745b','#455e5a'][i%3]);rect(c,213+i*12,155+(i%2)*9,7,1,'#9e95724a');}
    circle(c,240,169,48,'#8f875732');
  }else if(room===2){
    for(const x of [71,405]){rect(c,x,55,10,204,'#142f35');rect(c,x+2,56,5,201,'#30565b');line(c,x+4,56,x+4,256,'#508181');}
    for(const y of [68,250]){rect(c,76,y,333,5,'#6b6246');rect(c,77,y,331,1,'#a39260');}
    circle(c,294,127,22,'#577b73',4);circle(c,294,127,10,'#857956',3);
    rect(c,210,205,98,21,'#132b33');for(let i=0;i<8;i++)line(c,215+i*11,210,221+i*11,210,'#467879');
  }else if(room===3){
    for(const r of [42,47,71])circle(c,240,140,r,'#9693ab3b');for(let a=0;a<6;a++){const t=a*Math.PI/3;line(c,240+Math.cos(t)*47,140+Math.sin(t)*47,240+Math.cos(t)*70,140+Math.sin(t)*70,'#79789340');}
    rect(c,230,185,20,43,'#7c72582b');line(c,240,185,240,240,'#9d8d643d');
  }else{
    for(const r of [37,54,75,89])circle(c,240,168,r,'#ba9a5b42');for(let a=0;a<12;a++){const t=a*Math.PI/6;line(c,240+Math.cos(t)*54,168+Math.sin(t)*54,240+Math.cos(t)*88,168+Math.sin(t)*88,'#ab8e5639');}
    line(c,240,47,240,95,'#b09a6070',2);bookshelf(c,64,45,55);rect(c,370,214,26,16,'#574f3b');rect(c,373,211,20,4,'#7b7051');
  }
  for(const [x,y]of [[59,91],[420,90],[58,239],[422,240]])candle(c,x,y);
  for(const [x,y]of [[20,122],[457,191],[20,244],[462,57]]){rect(c,x,y,3,8,'#3d6a7a');rect(c,x+3,y-3,3,11,'#6c9caa');rect(c,x+6,y+2,2,6,'#467a8c');glow(c,x+4,y+3,17,'#468bb020');}
  for(const f of ROOM_FEATURES[room]){
    const {x,y,w,h,kind}=f;rect(c,x+3,y+5,w,h,'#020a1077');
    if(kind==='rubble'){
      for(let yy=0;yy<h;yy+=9)for(let xx=0;xx<w;xx+=12){const v=hash(x+xx,y+yy);rect(c,x+xx+(v*4|0),y+yy,9,7,v>.5?'#465155':'#293c43');line(c,x+xx,y+yy,x+xx+8,y+yy,'#69736c');}
      rect(c,x+w/3,y+h/3,11,9,'#8a7651');
    }else if(kind==='shelves'){
      rect(c,x,y,w,h,'#3a322b');for(let yy=0;yy<h;yy+=13)bookshelf(c,x,y+yy,w);
      rect(c,x,y,2,h,'#a18b60');
    }else if(kind==='basin'){
      rect(c,x-3,y-3,w+6,h+6,'#6c7467');rect(c,x,y,w,h,'#0a242c');
      for(let yy=8;yy<h;yy+=12)line(c,x+3,y+yy,x+w-4,y+yy,'#2c4d52');
      for(let xx=0;xx<w;xx+=12){rect(c,x+xx,y-4,6,3,'#b4a879');rect(c,x+xx,y+h+1,6,3,'#b4a879');}
    }else if(kind==='pipe'){
      rect(c,x,y,w,h,'#1d3e43');rect(c,x+3,y,w-6,h,'#528080');for(let yy=0;yy<h;yy+=12)rect(c,x,y+yy,w,3,'#a0966d');
    }else{
      rect(c,x-3,y+h-3,w+6,7,'#15242b');rect(c,x,y,w,h,'#3a4c50');rect(c,x+2,y+2,3,h-4,'#6e7970');rect(c,x-3,y-2,w+6,5,'#85836d');
    }
  }
  // Footprints and abandoned papers make the route feel previously inhabited.
  if(room<2)for(let i=0;i<9;i++){const x=235+Math.sin(i)*9,y=170+i*7;rect(c,x+(i%2?4:0),y,2,3,'#a6987150');}
  return cvs;
}
function drawObject(c,o,s,t,near,visual){
  const {x,y,kind}=o;const g=palette.gold, d='#142328';
  c.save();c.translate(Math.round(x),Math.round(y));
  rect(c,-o.w/2-2,o.h/2-2,o.w+4,5,'#020a104c');
  if(kind==='mural'){
    rect(c,-o.w/2,-o.h/2,o.w,o.h,'#172a30');c.strokeStyle='#8c7d55';c.strokeRect(-o.w/2,-o.h/2,o.w,o.h);if(o.id==='mural'){symbol(c,'crescent',-15,0,5);symbol(c,'star',0,0,5);symbol(c,'sun',15,0,5);}else{circle(c,0,0,8,'#a69c6a');line(c,-12,7,12,-7,'#a69c6a');}
  }else if(kind==='telescope'){
    circle(c,0,7,16,'#726b4e',3);rect(c,-2,-2,4,14,'#95805b');line(c,0,4,-10,16,'#867650',2);line(c,0,4,10,16,'#867650',2);c.save();c.rotate(-.45);rect(c,-22,-8,42,9,'#9b8757');rect(c,-22,-8,42,2,'#d0b77b');rect(c,-24,-10,5,13,'#bfa36b');rect(c,15,-10,5,13,'#bfa36b');rect(c,-27,-7,3,7,'#223e4b');c.restore();
  }else if(kind==='projector'){
    rect(c,-12,-6,24,17,'#535343');rect(c,-14,9,28,4,'#7e7151');circle(c,0,-3,8,'#bca16c',2);if(s.flags.projector){symbol(c,'star',0,-3,5,'#edda9f');glow(c,0,-3,25,'#f3c56835');}else{rect(c,-4,-7,8,8,'#102025');line(c,-5,4,5,4,'#c1aa6e');}
  }else if(kind==='mirror'){
    rect(c,-10,-9,20,18,'#716749');rect(c,-8,-7,16,14,'#243c40');line(c,-6,5,6,-5,'#d9d9ad',3);circle(c,0,0,11,s.flags.beamAligned?'#bcd5a6':'#a68b5d');
  }else if(kind==='seal'){
    const open=o.id==='entrySeal'?s.flags.archive:s.flags.pump;rect(c,-10,-10,20,19,'#625e47');rect(c,-8,-8,16,15,'#263a39');circle(c,0,-1,6,open?'#9ab09a':'#bba06b');symbol(c,open?'star':'sun',0,-1,4,open?'#b7d0af':'#bba06b');
  }else if(kind==='desk'||kind==='keydesk'){
    rect(c,-o.w/2,-o.h/2,o.w,o.h,'#574e3e');rect(c,-o.w/2,-o.h/2,o.w,2,'#8c7957');rect(c,-o.w/2+2,o.h/2-1,3,5,'#312f2b');rect(c,o.w/2-5,o.h/2-1,3,5,'#312f2b');
    if(kind==='desk'){rect(c,-9,-7,15,12,'#bdb189');rect(c,-8,-6,13,1,'#e0cca2');for(let i=0;i<3;i++)line(c,-6,-2+i*3,2,-2+i*3,'#756e55');rect(c,8,-3,3,5,'#1e302e');}
    else if(!s.flags.key){circle(c,-5,-2,3,'#e0c17c');line(c,-2,0,7,4,'#e0c17c',2);line(c,4,2,3,5,'#e0c17c');}
  }else if(kind==='wall'){
    rect(c,-13,-15,26,30,'#858a79');rect(c,-11,-13,22,26,'#b1b3a020');if(s.flags.beamAligned){for(let i=0;i<4;i++)rect(c,-8+i*5,-3,2,6,'#f2d8a0');glow(c,0,0,24,'#ebce7d40');}else{circle(c,0,0,8,'#c5c7ac');circle(c,0,0,4,'#5d7777');}
  }else if(kind==='pump'){
    rect(c,-24,-14,48,28,'#49605b');rect(c,-22,-12,44,24,'#263f40');for(let i=0;i<3;i++){circle(c,(i-1)*14,-2,6,'#c1ac79');symbol(c,SYMBOLS[s.instruments.pump[i]],(i-1)*14,-2,3,'#d8cf9b');}rect(c,-22,-14,44,2,'#a59c71');rect(c,-19,13,5,5,'#71694b');rect(c,14,13,5,5,'#71694b');
    line(c,0,12,0,24,'#566f68',4);
  }else if(kind==='crank'){
    circle(c,0,0,11,'#b7a071',3);circle(c,0,0,3,'#e1d1a0',2);
    for(let i=0;i<4;i++){const angle=visual.crank+(1-visual.water)*Math.PI+i*Math.PI/2;line(c,0,0,Math.cos(angle)*9,Math.sin(angle)*9,'#c8b37c',2);}
  }else if(kind==='lever'){
    const power=visual.power;rect(c,-12,-10,24,23,'#525945');rect(c,-10,-8,20,18,'#203b36');line(c,-4,6,-4+power*10,-2-power*4,'#b9aa75',3);circle(c,-4+power*10,-3-power*4,3,'#d1b371',2);rect(c,-4,11,8,2,s.flags.generator?'#9cbd8a':'#886a46');
  }else if(kind==='plaque'){
    rect(c,-17,-9,34,18,'#6c715e');rect(c,-15,-7,30,14,'#343f36');for(let i=0;i<3;i++)line(c,-11,-4+i*4,10,-4+i*4,'#9f9e78');
  }else if(kind==='prism'){
    circle(c,0,6,16,'#7c7b70',3);rect(c,-12,5,24,8,'#4b5653');rect(c,-14,3,28,3,'#949582');if(!s.flags.prism){c.fillStyle='#95b8bd';c.beginPath();c.moveTo(0,-16);c.lineTo(-11,2);c.lineTo(11,2);c.closePath();c.fill();line(c,0,-14,0,2,'#e1e8d0');line(c,0,-14,10,2,'#b2d4ca');glow(c,0,-4,23,'#98b9e120');}else{rect(c,-6,0,12,3,'#14292d');}
  }else if(kind==='shutters'){
    rect(c,-25,-15,50,30,'#5e5f4b');for(let i=0;i<4;i++){const opened=visual.shutters[i];rect(c,-22+i*12,-12,10,23,s.flags.beamAligned?'#b9b884':'#142b32');rect(c,-22+i*12,-12,10,Math.max(1,23*(1-opened)),'#263d3c');line(c,-21+i*12,-10+opened*4,-14+i*12,-10+opened*4,'#b7a16b');rect(c,-21+i*12,13,8,4,'#746e52');c.fillStyle='#e6d8aa';c.font='7px monospace';c.textAlign='center';c.fillText(String(i+1),-17+i*12,19);}
  }else if(kind==='satchel'){
    rect(c,-9,-6,18,13,'#6f5540');rect(c,-9,-6,18,4,'#927051');rect(c,-2,-3,4,8,'#b29861');line(c,-7,-6,-4,-10,'#8b7755');
  }else if(kind==='exit'){
    rect(c,-16,-12,32,24,'#43524a');rect(c,-12,-10,24,22,s.flags.beaconLit?'#dcd1a0':'#12232b');
    if(s.flags.beaconLit){glow(c,0,-5,55,'#f4dd9b55');for(let i=0;i<3;i++)rect(c,-12,5+i*3,24,1,'#91866b');symbol(c,'star',0,-5,5,'#fff2c8');}
    else for(let i=-8;i<=8;i+=8)rect(c,i,-10,2,22,'#9b885c');
  }else if(kind==='beacon'){
    circle(c,0,8,22,'#958558',4);circle(c,0,4,16,'#c9ae77',2);rect(c,-8,-19,16,30,'#7f7656');rect(c,-14,-17,28,5,'#b8a26a');rect(c,-12,-12,24,18,'#a9b79a');rect(c,-9,-10,18,14,s.flags.beaconLit?'#fff1b6':'#d7cc94');line(c,0,-12,0,7,'#e3d6a5');circle(c,0,-3,15,'#ccae76',2);glow(c,0,-5,s.flags.beaconLit?35+65*(visual.rescueProgress??1):35,s.flags.beaconLit?'#f3c77360':'#e5c06d25');
  }else if(kind==='mentor'){
    if(s.flags.beaconLit){rect(c,-8,-10,16,20,'#3d4135');rect(c,-6,-8,12,14,'#85806a');for(let i=0;i<3;i++)line(c,-5,-5+i*4,5,-5+i*4,'#aba184');}
    else drawExplorer(c,0,2,t,false,'#7e7760');
  }
  if(near){c.strokeStyle='#e2c687';c.lineWidth=1;const xx=-o.w/2-4,yy=-o.h/2-5,ww=o.w+8,hh=o.h+10;for(const [a,b,dx,dy]of [[xx,yy,1,1],[xx+ww,yy,-1,1],[xx,yy+hh,1,-1],[xx+ww,yy+hh,-1,-1]]){line(c,a,b,a+dx*4,b,'#e2c687');line(c,a,b,a,b+dy*4,'#e2c687');}}
  c.restore();
}
export function drawExplorer(c,x,y,t,moving,color='#416661',sprite){
  x=Math.round(x);y=Math.round(y);const step=moving?Math.sin(t*13):0;
  if(sprite?.complete&&sprite.naturalWidth){c.drawImage(sprite,x-9,y-15+Math.round(step*.5),18,20);return;}
  rect(c,x-5,y+4,12,3,'#020a0d66');rect(c,x-4,y-1,3,6+Math.round(step),'#72604b');rect(c,x+1,y-1,3,6-Math.round(step),'#72604b');rect(c,x-5,y-9,10,11,color);rect(c,x-3,y-12,7,6,'#b5a17b');rect(c,x-4,y-14,9,5,'#3f625d');rect(c,x-5,y-12,2,6,'#3f625d');rect(c,x-5,y-2,9,2,'#967a51');rect(c,x-7,y-6,3,5,'#785940');rect(c,x+5,y-5,3,5,'#a49671');rect(c,x+7,y-1,3,4,'#f5d58b');rect(c,x+6,y-2,5,1,'#a68c58');rect(c,x+6,y+3,5,1,'#a68c58');
}
export function drawFrame(c,scene,s,t,near,target,moving,images,reduced,showExplorer=true,visual={water:s.flags.drained?0:1,power:s.flags.generator?1:0,shutters:[0,0,0,0],crank:0,wheel:0,pulse:null}){
  c.clearRect(0,0,W,H);c.drawImage(scene,0,0);
  const open=s.room<lastUnlocked(s);
  // Open stair shafts meet the adjacent room when the camera passes between them.
  for(const [from,to,on] of [[0,46,s.room>0||s.flags.beaconLit],[282,320,open]])if(on){rect(c,222,from,36,to-from,'#1c3035');rect(c,217,from,5,to-from,'#31474a');rect(c,258,from,5,to-from,'#253a40');for(let y=from;y<to;y+=8){rect(c,223,y,34,1,'#62726c');rect(c,223,y+2,34,1,'#11262c');}}
  // The stairs are travel points, not holes that can teleport the explorer.
  for(const [yy,up]of [[46,true],[273,false]]){rect(c,222,yy-8,36,17,'#12242a');for(let i=0;i<5;i++){const y=yy-7+i*4;rect(c,223,y,34,2,up?'#697775':'#5b6b66');rect(c,223,y+2,34,1,'#1b2f34');}if((up&&s.room===0&&!s.flags.beaconLit)||(!up&&!open)){rect(c,222,yy-8,36,18,'#142228b0');for(let i=0;i<5;i++)rect(c,225+i*7,yy-8,2,18,'#8b7b56');}else{line(c,235,yy+(up?3:-3),240,yy+(up?-2:2),'#bdad7b');line(c,240,yy+(up?-2:2),245,yy+(up?3:-3),'#bdad7b');}}
  if(s.flags.beaconLit){
    rect(c,42,47,396,232,'#bc92320d');
    const progress=visual.rescueProgress??1,top=4*H+169-(4*H+169-15)*progress-s.room*H,bottom=s.room===4?169:H;
    if(top<=bottom){const start=Math.max(0,top);rect(c,236,start,8,bottom-start,'#f1ce7720');rect(c,239,start,2,bottom-start,'#f4dfaa99');glow(c,240,Math.max(start,150),100,'#f0bd4f13');}
    if(s.room===0&&progress>=1)symbol(c,'star',240,17,6,'#fff0bb');
  }
  if(s.room===0&&s.flags.projector){glow(c,370,112,50,'#e5c66f22');line(c,370,112,330,258,'#eddb9850',2);}
  if(s.room===1&&s.flags.beamAligned){glow(c,370,100,47,'#f4d8953a');}
  if(s.room===2){
    const phase=reduced?0:t,level=visual.water,power=visual.power;
    const knockAge=t-(visual.knockAt??-100);if(knockAge>=0&&knockAge<1.4){for(let i=0;i<3;i++){const age=knockAge-i*.32;if(age>=0&&age<.45){c.save();c.globalAlpha=1-age/.45;circle(c,75,105,reduced?9:6+age*24,'#d9c394');c.restore();}}}
    for(let i=0;i<16;i++){const yy=67+((i*13+phase*(power*18+3))%180);rect(c,408,yy,2,4,'#91aaa057');}
    for(let i=0;i<8;i++){const angle=visual.wheel+i*Math.PI/4;line(c,294,127,294+Math.cos(angle)*20,127+Math.sin(angle)*20,power>.1?'#c2b47c':'#8c835d',2);}
    // The waterline falls to expose a deep basin; the rim remains impassable.
    const waterTop=155+(1-level)*57;
    if(level>.01){rect(c,213,waterTop,98,60*level,'#326574c9');for(let i=0;i<7;i++)line(c,217+i*13,waterTop+5+Math.sin(phase*2+i)*2,225+i*13,waterTop+5+Math.sin(phase*2+i)*2,'#a7c5bd');}
    if(power>.01){line(c,398,183,315,151,'#90b5aa55',2);for(let i=0;i<6;i++){const progress=(phase*.65+i/6)%1;rect(c,398-progress*83,183-progress*32,2,2,'#d5d2a5');}glow(c,363,181,27,'#bbbf7130');symbol(c,'star',294,127,5,'#d6bc80');}
  }
  if(s.room===3){for(let i=0;i<3;i++){const on=[s.flags.beamAligned,s.flags.generator,s.flags.shutters][i];rect(c,223+i*15,244,5,3,on?'#c4ce98':'#4d5a50');}}
  const objects=ROOMS[s.room].objects;
  const entities=objects.map(object=>({y:object.y,object}));
  if(showExplorer)entities.push({y:s.player.y,explorer:true});
  if(visual.companion?.room===s.room)entities.push({y:visual.companion.y,companion:visual.companion});
  entities.sort((a,b)=>a.y-b.y);
  for(const entity of entities){
    if(entity.object)drawObject(c,entity.object,s,t,near?.id===entity.object.id,visual);
    else if(entity.explorer){glow(c,s.player.x+6,s.player.y,39,'#e5be6221');drawExplorer(c,s.player.x,s.player.y,t,moving,'#416661',images.explorer);}
    else{const p=entity.companion;glow(c,p.x+6,p.y,24,'#e5be6218');drawExplorer(c,p.x,p.y,t,p.moving,'#8a7857');c.fillStyle='#d9d1b5';c.font='6px monospace';c.textAlign='center';c.fillText('Elian',p.x,p.y-21);}
  }
  if(visual.pulse?.room===s.room){const age=t-visual.pulse.started;if(age>=0&&age<.5){c.save();c.globalAlpha=1-age*2;circle(c,visual.pulse.x,visual.pulse.y,reduced?19:12+age*38,'#e5c989',1);glow(c,visual.pulse.x,visual.pulse.y,30,'#f2d08d44');c.restore();}}
  const vignette=c.createRadialGradient(240,165,95,240,165,285);vignette.addColorStop(0,'transparent');vignette.addColorStop(1,'#020c119a');c.fillStyle=vignette;c.fillRect(0,0,W,H);
  // A small targeting diamond keeps the mouse legible when a wall blocks the explorer.
  if(target&&Math.hypot(target.x-s.player.x,target.y-s.player.y)>12){c.strokeStyle='#c9b47e9a';c.beginPath();c.moveTo(target.x,target.y-3);c.lineTo(target.x+3,target.y);c.lineTo(target.x,target.y+3);c.lineTo(target.x-3,target.y);c.closePath();c.stroke();}
  if(!reduced){for(let i=0;i<14;i++){const x=60+hash(i,12)*360,y=60+((hash(i,7)*210+t*(1+hash(i,5)*2))%210);rect(c,x,y,1,1,'#d9d1ab'+(i%3===0?'66':'28'));}}
}
export function drawLightPath(c, view, scroll, state, aim, adjusting) {
  if (!state.flags.projector) return;
  const source = LIGHT_PATH.source, receiver = LIGHT_PATH.receiver;
  const end = state.flags.beamAligned ? receiver : lightEndpoint(aim);
  const screen = p => ({ x: view.x+p.x*view.scale, y: view.y+(p.y-scroll)*view.scale });
  const a=screen(source), b=screen(end), r=screen(receiver);
  const color=state.flags.beamAligned?'#e5efb5':'#ecd299';
  c.save();
  c.beginPath();c.rect(view.x,0,480*view.scale,view.height);c.clip();
  c.lineCap='round';c.strokeStyle='#e4c16b20';c.lineWidth=9*view.scale;
  c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();
  c.strokeStyle=color;c.lineWidth=Math.max(1,view.scale*.8);c.stroke();
  c.strokeStyle=state.flags.beamAligned?'#e5efb5':'#adb7aa';c.lineWidth=1.5;
  c.beginPath();c.arc(r.x,r.y,10*view.scale,0,Math.PI*2);c.stroke();
  if(adjusting){
    const handle=screen(lightHandle(aim));
    c.fillStyle='#172d31';c.strokeStyle=color;c.lineWidth=2;
    c.beginPath();c.arc(handle.x,handle.y,Math.max(8,4*view.scale),0,Math.PI*2);c.fill();c.stroke();
    c.fillStyle='#f4e3bd';c.font='10px monospace';c.textAlign='right';
    c.fillText('DOME · MIRROR',a.x-16,a.y-18);
    c.fillText('ARCHIVE · RECEIVER',r.x-16,r.y-20);
  }
  c.restore();
}
