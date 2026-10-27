import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import { isWalkable } from '../dist/rooms.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'qa');await mkdir(output,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const chromeArgs=['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=9231','--user-data-dir='+path.join(root,'.browser-profile-qa'),'about:blank'];
if(process.env.OBSERVATORY_QA_RESTRICTED==='1')chromeArgs.unshift('--no-sandbox');
const chrome=spawn(process.env.OBSERVATORY_QA_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',chromeArgs,{stdio:['ignore','ignore','pipe'],windowsHide:true});
const lightOnly=process.argv.includes('--light-only');
const journalOnly=process.argv.includes('--journal-only');
const rescueOnly=process.argv.includes('--rescue-only');
const instrumentsOnly=process.argv.includes('--instruments-only'),reducedMotion=process.argv.includes('--reduced-motion');
chrome.stderr.on('data',data=>console.error(String(data).slice(0,1000)));chrome.on('exit',(code)=>console.log('Browser exit '+code));
let ws,id=0;const pending=new Map(),errors=[];const keepAlive=setInterval(()=>{},1000);
try{
  let pages;
  for(let i=0;i<60;i++){try{pages=await(await fetch('http://127.0.0.1:9231/json/list')).json();break;}catch{await sleep(200);}}
  if(!pages)throw Error('Chrome debug endpoint unavailable');
  ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
  await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
  ws.onclose=e=>{for(const p of pending.values())p.reject(Error('Browser connection closed: '+e.code+' '+e.reason));pending.clear();};
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(p){pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text+' '+JSON.stringify(m.params.exceptionDetails.exception?.description));};
  const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;const timeout=setTimeout(()=>{pending.delete(n);reject(Error('Browser command timed out: '+method));},15000);pending.set(n,{resolve:v=>{clearTimeout(timeout);resolve(v);},reject:e=>{clearTimeout(timeout);reject(e);}});ws.send(JSON.stringify({id:n,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||'Browser evaluation failed');return r.result.value;};
  const click=async selector=>{await evaluate('document.fonts.ready.then(()=>true)');const p=await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)throw Error('Missing ${selector}');el.scrollIntoView({block:'nearest'});const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);await send('Input.dispatchMouseEvent',{type:'mouseMoved',...p});await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p});await sleep(120);};
  const screenshot=async name=>{const geometry=await evaluate('(()=>{if(!window.observatory?.running)return {ok:true};const c=document.querySelector("#game"),r=c.getBoundingClientRect(),v=window.observatory.camera,t=c.getContext("2d").getTransform(),dpr=Math.min(devicePixelRatio||1,2);return{ok:r.width===v.width&&r.height===v.height&&Math.abs(c.width/r.width-c.height/r.height)<.01&&t.a===dpr&&t.d===dpr,view:[v.width,v.height],rect:[r.width,r.height],backing:[c.width,c.height],transform:[t.a,t.d],dpr}})()');assert.equal(geometry.ok,true,'Canvas follows the actual viewport: '+JSON.stringify(geometry));const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(path.join(output,name+'.png'),Buffer.from(r.data,'base64'));console.log('SCREENSHOT '+name);};
  await send('Runtime.enable');await send('Page.enable');await send('Emulation.setDeviceMetricsOverride',process.argv.includes('--hidpi-only')?{width:480,height:320,deviceScaleFactor:2,mobile:false}:{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  if(reducedMotion)await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await send('Page.navigate',{url:process.argv.includes('--portable')?pathToFileURL(path.join(root,'play.html')).href:'http://127.0.0.1:4173'});await sleep(1400);
  if(!process.argv.includes('--resume-check')){await evaluate("localStorage.clear();location.reload()");await sleep(1000);}
  if(lightOnly){await evaluate(`localStorage.setItem('buried-observatory:v1',JSON.stringify({version:1,room:0,player:{x:330,y:230},flags:{archive:true,key:true,pump:true,drained:true,prism:true,projector:true,beamAligned:false},journal:['letter','mural','reflection','mentor','plaque','prism','light'],hints:{},muted:true}));location.reload()`);await sleep(1000);}
  if(instrumentsOnly||journalOnly){await evaluate(`localStorage.setItem('buried-observatory:v1',JSON.stringify({version:1,room:2,player:{x:160,y:111},flags:{archive:true,key:true,pump:true},journal:['letter','mural','reflection','plaque'],hints:{},muted:true}));location.reload()`);await sleep(700);}
  if(rescueOnly){await evaluate(`localStorage.setItem('buried-observatory:v1',JSON.stringify({version:1,room:4,player:{x:275,y:169},flags:{archive:true,key:true,pump:true,drained:true,prism:true,projector:true,beamAligned:true,generator:true,shutters:true},journal:['letter','mural','reflection','plaque','prism','light','projection'],hints:{},muted:true}));location.reload()`);await sleep(700);}
  await screenshot('01-title');
  if(process.argv.includes('--resume-check')||lightOnly||instrumentsOnly||journalOnly||rescueOnly)await click('#continueButton');else{await click('#beginButton');await click('[data-close]');}
  await sleep(300);await screenshot('02-broken-dome');
  assert.equal(await evaluate('window.observatory.running'),true);
  assert.equal(await evaluate('(()=>{const r=document.querySelector("#game").getBoundingClientRect();return r.x===0&&r.y===0&&r.width===innerWidth&&r.height===innerHeight})()'),true,'Dungeon fills the browser viewport');
  console.log('PASS title, begin, instructions, initial rendering');
  if(process.argv.includes('--hidpi-only')){
    await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await sleep(200);await screenshot('17-hidpi-to-desktop');
  }
  if(!process.argv.includes('--resume-check')&&!lightOnly&&!instrumentsOnly&&!journalOnly&&!rescueOnly){const before=await evaluate('JSON.stringify(window.observatory.state.player)');await click('#hintButton');for(let i=0;i<3;i++)await click('#nextHint');assert.ok((await evaluate('document.querySelector("#hintText").textContent')).includes('CRESCENT'));await click('[data-close]');assert.equal(await evaluate('JSON.stringify(window.observatory.state.player)'),before);await click('#journalButton');assert.equal(await evaluate('document.querySelectorAll(".journal-entry").length'),1);await click('[data-close]');console.log('PASS progressive hints, journal, overlay blocks movement');}
  if(process.argv.includes('--resume-check')){await click('#journalButton');await screenshot('journal-check');console.log(await evaluate('JSON.stringify({running:window.observatory.running,dialog:document.querySelector("#dialog").open,entries:document.querySelectorAll(".journal-entry").length,notes:window.observatory.state.journal})'));await click('[data-close]');await click('#soundButton');assert.equal(await evaluate('window.observatory.state.muted'),false);await click('#soundButton');}
  if(journalOnly){
    const pump=await evaluate('(()=>{const v=window.observatory.camera;return{x:v.x+160*v.scale,y:v.y+(640+142-v.scrollY)*v.scale}})()');
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',...pump});await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...pump});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...pump});
    await click('[data-dial="0"]');const draft=await evaluate('window.observatory.state.instruments.pump');
    await click('#puzzleJournal');await click('[data-note="mural"]');
    assert.equal(await evaluate('!!document.querySelector("#journalPage svg")'),true);
    await click('#pinJournalNote');await click('[data-close]');
    assert.equal(await evaluate('window.observatory.state.pinnedNote'),'mural');assert.equal(await evaluate('window.observatory.instrument'),'pump');
    assert.deepEqual(await evaluate('window.observatory.state.instruments.pump'),draft);await screenshot('18-pinned-clue-desktop');
    await click('#journalButton');await click('[data-note="plaque"]');await click('#pinJournalNote');await click('[data-close]');
    assert.equal(await evaluate('window.observatory.state.pinnedNote'),'plaque');
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:568,deviceScaleFactor:1,mobile:true});await sleep(200);
    assert.equal(await evaluate('getComputedStyle(document.querySelector(".pinned-content")).display'),'none');
    await click('#readPinned');assert.equal(await evaluate('document.querySelector("#dialog").open'),true);await click('#noteDone');
    assert.deepEqual(await evaluate('window.observatory.state.instruments.pump'),draft);await screenshot('19-pinned-clue-phone');
    await send('Page.reload');await sleep(700);await click('#continueButton');
    assert.equal(await evaluate('window.observatory.state.pinnedNote'),'plaque');assert.deepEqual(await evaluate('window.observatory.state.instruments.pump'),draft);
    await click('#unpinNote');assert.equal(await evaluate('window.observatory.state.pinnedNote'),null);
    await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await sleep(150);
    console.log('PASS illustrated journal, replacing/unpinning clues, phone reference, drafts and saved pin');
  }
  if(rescueOnly){
    const until=async(expression,message)=>{const start=Date.now();while(!await evaluate(expression)){if(Date.now()-start>9000)throw Error(message);await sleep(80);}};
    const tap=async(x,y)=>{const p=await evaluate(`(()=>{const v=window.observatory.camera,s=window.observatory.state;return{x:v.x+${x}*v.scale,y:v.y+(s.room*320+${y}-v.scrollY)*v.scale}})()`);await send('Input.dispatchMouseEvent',{type:'mouseMoved',...p});await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p});await sleep(100);};
    const ascend=async()=>{const v=await evaluate('window.observatory.camera');await send('Input.dispatchMouseEvent',{type:'mouseWheel',x:v.width/2,y:v.height/2,deltaY:-320*v.scale,deltaX:0});await sleep(200);};
    await tap(240,169);await until('document.querySelector("#dialog").open','Beacon did not respond');assert.equal(await evaluate('window.observatory.state.flags.beaconLit'),false);await click('[data-close]');
    await tap(350,155);await until('document.querySelector("#dialog").open','Explorer did not reach Elian');assert.ok((await evaluate('window.observatory.state.journal')).includes('reunion'));await click('[data-close]');
    await tap(240,169);await until('!!document.querySelector("#lightBeacon")','Beacon control did not open');await click('#lightBeacon');
    assert.equal(await evaluate('window.observatory.state.flags.beaconLit'),true);assert.equal(await evaluate('window.observatory.state.flags.finished'),false);assert.ok(await evaluate('window.observatory.companion'));
    if(reducedMotion)assert.equal(await evaluate('window.observatory.effects.signal'),1);else assert.ok((await evaluate('window.observatory.effects.signal'))<1);
    await screenshot('20-beacon-activation');await ascend();assert.equal(await evaluate('window.observatory.companion.room'),3);
    const destination=await evaluate('(()=>{const v=window.observatory.camera;return{x:v.x+300*v.scale,y:v.y+(960+255-v.scrollY)*v.scale}})()');await send('Input.dispatchMouseEvent',{type:'mouseMoved',...destination});
    await until('Math.hypot(window.observatory.state.player.x-300,window.observatory.state.player.y-255)<2','Ascent movement did not reach the destination');
    await until('(()=>{const c=window.observatory.companion,p=window.observatory.state.player;return Math.hypot(c.x-p.x,c.y-p.y)<30})()','Elian did not follow');
    const companion=await evaluate('window.observatory.companion');assert.ok(isWalkable(companion.room,companion.x,companion.y));await screenshot('21-ascending-with-elian');
    await send('Page.reload');await sleep(700);await click('#continueButton');assert.equal(await evaluate('window.observatory.state.flags.finished'),false);assert.equal(await evaluate('window.observatory.companion.room'),3);assert.equal(await evaluate('window.observatory.effects.signal'),1);
    await ascend();await tap(363,181);await until('Math.hypot(window.observatory.state.player.x-363,window.observatory.state.player.y-181)<=39','Explorer did not reach the routing lever');await sleep(150);assert.equal(await evaluate('window.observatory.state.flags.generator'),true);
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:568,deviceScaleFactor:1,mobile:true});await sleep(150);await ascend();await ascend();assert.equal(await evaluate('window.observatory.state.room'),0);
    await screenshot('22-dome-exit-phone');await tap(240,52);await until('window.observatory.state.flags.finished','The upper gate did not complete the rescue');
    assert.equal(await evaluate('window.observatory.companion'),null);assert.ok((await evaluate('document.querySelector("#dialogTitle").textContent')).includes('made it home'));await screenshot('23-rescue-complete');
    await click('#endingDone');await send('Page.reload');await sleep(700);await click('#continueButton');assert.equal(await evaluate('window.observatory.state.flags.finished'),true);
    await evaluate("(()=>{const s=window.observatory.state;delete s.flags.beaconLit;s.room=4;localStorage.setItem('buried-observatory:v1',JSON.stringify(s));location.reload()})()");await sleep(700);await click('#continueButton');
    assert.equal(await evaluate('window.observatory.state.flags.beaconLit'),true);assert.equal(await evaluate('window.observatory.state.flags.finished'),true);assert.equal(await evaluate('window.observatory.companion'),null);
    await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await sleep(150);
    console.log('PASS reunion gate, beacon signal, companion ascent, resume, latched power, phone exit, completion and legacy save');
  }
  if(process.argv.includes('--movement-only')){
    const toScreen=async(x,y)=>evaluate(`(()=>{const v=window.observatory.camera;return{x:v.x+${x}*v.scale,y:v.y+(${y}-v.scrollY)*v.scale}})()`);
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',...await toScreen(240,170)});
    let detoured=false;const start=Date.now();
    for(;;){const p=await evaluate('window.observatory.state.player');if(Math.abs(p.x-240)>20)detoured=true;if(Math.hypot(p.x-240,p.y-170)<2)break;if(Date.now()-start>7000)throw Error('Explorer did not find a route around the telescope');await sleep(70);}
    assert.equal(detoured,true,'Cursor movement detours around the telescope');
    const mural=await toScreen(104,82);
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',...mural});await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...mural});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...mural});
    const approach=Date.now();while(!await evaluate('document.querySelector("#dialog").open')){if(Date.now()-approach>7000)throw Error('Click to approach did not investigate the mural');await sleep(70);}
    assert.ok((await evaluate('window.observatory.state.journal')).includes('mural'));
    await click('[data-close]');const before=await evaluate('window.observatory.state.player.x');
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight'});await sleep(250);await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight'});
    assert.ok((await evaluate('window.observatory.state.player.x'))>before+10,'Held keyboard input moves continuously');
    await screenshot('11-movement-and-dome');console.log('PASS obstacle routing, click to approach and continuous keyboard movement');
  }
  if(instrumentsOnly){
    const worldPoint=async(x,y)=>evaluate(`(()=>{const v=window.observatory.camera,s=window.observatory.state;return{x:v.x+${x}*v.scale,y:v.y+(s.room*320+${y}-v.scrollY)*v.scale}})()`);
    const tap=async(x,y)=>{const p=await worldPoint(x,y);await send('Input.dispatchMouseEvent',{type:'mouseMoved',...p});await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p});await sleep(100);};
    const until=async(expression,message)=>{const start=Date.now();while(!await evaluate(expression)){if(Date.now()-start>7000)throw Error(message);await sleep(70);}};
    await tap(160,174);await until('window.observatory.instrument==="pump"','Clicking the visible crank did not open its instrument');assert.equal(await evaluate('document.querySelector("#dialog").open'),false);
    // Two clockwise physical turns set the first dial to SUN; tap the second to STAR.
    for(let n=0;n<2;n++){
      const a=await worldPoint(146,140),b=await worldPoint(153,147);
      await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...a});await send('Input.dispatchMouseEvent',{type:'mouseMoved',button:'left',buttons:1,...b});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...b});
    }
    await tap(160,140);assert.deepEqual(await evaluate('window.observatory.state.instruments.pump'),[2,1,0]);
    await click('#puzzleJournal');await click('[data-close]');assert.deepEqual(await evaluate('window.observatory.state.instruments.pump'),[2,1,0]);
    await send('Page.reload');await sleep(700);await click('#continueButton');await tap(160,142);
    assert.deepEqual(await evaluate('window.observatory.state.instruments.pump'),[2,1,0],'Unfinished instrument survives journal and reload');
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(150);
    assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);await screenshot('15-pump-mobile');
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:568,deviceScaleFactor:1,mobile:true});await sleep(150);
    assert.equal(await evaluate('document.querySelector("#mechanismControls").getBoundingClientRect().bottom<=innerHeight'),true);
    await screenshot('16-pump-short-phone');
    await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await sleep(150);
    await tap(160,174);assert.equal(await evaluate('window.observatory.state.flags.drained'),true,'Physical crank drains the chamber');assert.equal(await evaluate('document.querySelector("#dialog").open'),false,'Releasing the crank does not open another dialog');
    if(!reducedMotion)assert.ok((await evaluate('window.observatory.effects.water'))>0,'Water recedes visibly instead of disappearing');
    await sleep(reducedMotion?60:1500);assert.equal(await evaluate('window.observatory.effects.water'),0);
    await screenshot('12-pump-drained');
    await tap(363,181);await until('window.observatory.state.flags.generator','Explorer did not approach and pull the routing lever');
    await sleep(reducedMotion?60:800);assert.equal(await evaluate('window.observatory.effects.power'),1);assert.equal(await evaluate('document.querySelector("#dialog").open'),false);
    await screenshot('13-turbine-running');
    const v=await evaluate('window.observatory.camera');await send('Input.dispatchMouseEvent',{type:'mouseWheel',x:v.width/2,y:v.height/2,deltaY:320*v.scale,deltaX:0});await sleep(200);
    await tap(351,224);await until('window.observatory.instrument==="shutters"','Explorer did not approach the shutters');
    for(const number of [2,4])await tap(334+(number-1)*12,224);
    await click('#puzzleJournal');await click('[data-close]');assert.deepEqual(await evaluate('window.observatory.state.instruments.shutters'),[2,4]);
    await click('#resetSequence');
    for(const number of [2,4,1,3])await tap(334+(number-1)*12,224);
    await click('#solveShutters');assert.equal(await evaluate('window.observatory.state.flags.shutters'),true);
    await sleep(reducedMotion?60:300);assert.deepEqual(await evaluate('window.observatory.effects.shutters'),[1,1,1,1]);
    await tap(240,136);await until('window.observatory.state.flags.prism','Prism was not collected');assert.equal(await evaluate('document.querySelector("#dialog").open'),false);
    await screenshot('14-lens-platform');console.log('PASS physical dial dragging, crank, draft persistence, draining water, routing lever, physical shutters and prism pickup'+(reducedMotion?' with reduced motion':''));
  }
  // Save optimized, faithful display-sized copies of generated assets.
  if(process.argv.includes('--optimize')){
    for(const name of ['dome','archive','pump','lens','beacon','explorer']){
      const data=await evaluate(`(async()=>{const im=new Image();im.src='./assets/${name}.png';await im.decode();const c=document.createElement('canvas');c.width=${name==='explorer'?64:1200};c.height=${name==='explorer'?80:675};const x=c.getContext('2d');x.imageSmoothingEnabled=false;x.drawImage(im,0,0,c.width,c.height);return c.toDataURL('image/webp',.92).split(',')[1]})()`);
      await writeFile(path.join(root,'dist','assets',name+'.webp'),Buffer.from(data,'base64'));
    }console.log('PASS optimized artwork');
  }
  if(process.argv.includes('--full')||lightOnly){
    const pos=()=>evaluate('window.observatory.state');
    const worldPoint=async(x,y)=>evaluate(`(()=>{const r=document.querySelector('#game').getBoundingClientRect(),v=window.observatory.camera,s=window.observatory.state;return{x:r.x+v.x+${x}*v.scale,y:r.y+v.y+(s.room*320+${y}-v.scrollY)*v.scale}})()`);
    const walk=async(x,y)=>{const p=await worldPoint(x,y);await send('Input.dispatchMouseEvent',{type:'mouseMoved',...p});const start=Date.now();for(;;){const s=await pos();if(Math.hypot(s.player.x-x,s.player.y-y)<2)break;if(Date.now()-start>8000)throw Error(`Walking blocked at ${JSON.stringify(s.player)}, target ${x},${y}, room ${s.room}`);await sleep(90);}};
    const objectClick=async(x,y,opensDialog=true)=>{const p=await worldPoint(x,y);await send('Input.dispatchMouseEvent',{type:'mouseMoved',...p});await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p});await sleep(130);assert.equal(await evaluate('document.querySelector("#dialog").open'),opensDialog,'Object opens expected interaction');};
    const close=()=>click('[data-close]');
    const stairs=async direction=>{const before=(await pos()).room;const p=await worldPoint(240,160),scale=await evaluate('window.observatory.camera.scale');await send('Input.dispatchMouseEvent',{type:'mouseWheel',...p,deltaY:direction*320*scale,deltaX:0});await sleep(250);assert.equal((await pos()).room,before+direction,'Scroll reaches the adjacent room without requiring stairs');};
    const pathCenter=async()=>{const s=await pos();if(s.player.y<130){await walk(280,s.player.y);await walk(280,190);}else{await walk(280,s.player.y);await walk(280,190);}};
    if(!lightOnly){
    // No remote interactions or scroll bypasses.
    let p=await worldPoint(240,160);await send('Input.dispatchMouseEvent',{type:'mouseWheel',...p,deltaY:1000,deltaX:0});await sleep(100);assert.equal((await pos()).room,0);
    await walk(104,108);await objectClick(104,82);await close();
    await walk(140,150);await walk(196,231);await objectClick(196,258);
    await click('[data-dial="0"]');await click('[data-dial="1"]');await click('[data-dial="1"]');await click('#solvePuzzle');
    assert.equal((await pos()).flags.archive,true);
    p=await worldPoint(240,160);const firstScale=await evaluate('window.observatory.camera.scale');
    await send('Input.dispatchMouseEvent',{type:'mouseWheel',...p,deltaY:96*firstScale,deltaX:0});await sleep(200);assert.equal(await evaluate('Math.round(window.observatory.camera.scrollY)'),96,'Scrolling supports partial room distances');await screenshot('continuous-scroll');
    await send('Input.dispatchMouseEvent',{type:'mouseWheel',...p,deltaY:-96*firstScale,deltaX:0});await sleep(200);assert.equal(await evaluate('Math.round(window.observatory.camera.scrollY)'),0,'Scrolling up reverses continuously');
    await stairs(1);console.log('PASS room 1: mural, seal, continuous scroll anywhere');
    await walk(150,80);await walk(108,82);await objectClick(108,110);await close();
    await walk(165,82);await walk(305,190);await walk(332,214);await objectClick(360,214,false);
    await walk(310,240);await walk(240,231);await walk(197,231);await objectClick(197,259,false);
    await walk(240,231);await stairs(1);console.log('PASS room 2: memorandum, key, maintenance lock');
    await walk(208,82);await walk(160,111);await objectClick(160,142,false);
    await click('[data-dial="0"]');await click('[data-dial="0"]');await click('[data-dial="1"]');await click('#solvePuzzle');
    assert.equal((await pos()).flags.drained,true);await walk(210,111);await walk(240,238);await stairs(1);console.log('PASS room 3: reflected regulator sequence');
    await walk(240,104);await objectClick(240,136,false);await screenshot('03-lens-chamber');
    await walk(280,104);await walk(280,80);await walk(240,80);await stairs(-1);
    await walk(270,240);await walk(270,90);await walk(240,90);await stairs(-1);
    await walk(280,240);await walk(280,85);await walk(240,85);await stairs(-1);
    await walk(300,240);await walk(340,160);await walk(370,143);await objectClick(370,112);await close();assert.equal((await pos()).flags.projector,true);
    await walk(310,190);await walk(330,230);
    }
    await objectClick(330,258,false);
    assert.equal(await evaluate('window.observatory.light.adjusting'),true,'Mirror opens an in-world adjustment');
    assert.equal(await evaluate('document.querySelector("#lockLight").disabled'),true,'Cannot lock from a single-floor view');
    const scrollView=async distance=>{const v=await evaluate('window.observatory.camera');await send('Input.dispatchMouseEvent',{type:'mouseWheel',x:v.width/2,y:v.height/2,deltaY:distance*v.scale,deltaX:0});await sleep(180);};
    await scrollView(160);
    assert.equal(await evaluate('Math.round(window.observatory.camera.scrollY)'),160);
    const stationary=await evaluate('JSON.stringify(window.observatory.state.player)');
    await click('#lockLight');assert.equal((await pos()).flags.beamAligned,false,'Wrong aim does not solve the puzzle');
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight'});
    assert.equal(await evaluate('window.observatory.light.aim'),-.3,'Arrow keys turn the mirror');
    await click('#lightLeft');assert.equal(await evaluate('window.observatory.light.aim'),-.35);
    assert.equal(await evaluate('JSON.stringify(window.observatory.state.player)'),stationary,'Mirror controls do not move the explorer');
    await screenshot('07-cross-floor-mirror');
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(200);
    assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);
    assert.equal(await evaluate('document.querySelector("#lockLight").disabled'),false,'Narrow display can frame both ends');
    await screenshot('08-mirror-mobile');
    await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:190,y:350}]});
    await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:190,y:324}]});
    await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await sleep(150);
    assert.ok((await evaluate('window.observatory.camera.scrollY'))>180,'Touch swipe scrolls during mirror adjustment');
    await click('#lightViewUp');await sleep(80);
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:568,deviceScaleFactor:1,mobile:true});await sleep(200);
    await scrollView(256-(await evaluate('window.observatory.camera.scrollY')));
    await screenshot('10-mirror-short-phone');
    assert.equal(await evaluate('document.querySelector("#lockLight").disabled'),false,'Short phone screen can frame both ends above its controls: '+JSON.stringify(await evaluate('({camera:window.observatory.camera,panel:document.querySelector("#lightControls").getBoundingClientRect().toJSON()})')));
    await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await sleep(200);
    await scrollView(160-(await evaluate('window.observatory.camera.scrollY')));
    // Aim by dragging the actual mirror, then latch with the separate control.
    const mirrorPoints=await evaluate('(()=>{const v=window.observatory.camera;return [258,420].map((y,i)=>({x:v.x+(i?371:330)*v.scale,y:v.y+(y-v.scrollY)*v.scale}))})()');
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',...mirrorPoints[0]});
    await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...mirrorPoints[0]});
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',button:'left',buttons:1,...mirrorPoints[1]});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...mirrorPoints[1]});await sleep(100);
    assert.ok((await evaluate('document.querySelector("#lightStatus").textContent')).includes('receiver is lit'));
    await screenshot('09-mirror-aligned');
    await click('#lockLight');assert.equal((await pos()).flags.beamAligned,true);
    assert.equal(await evaluate('window.observatory.light.adjusting'),false);
    if(!lightOnly){
    await scrollView(-(await evaluate('window.observatory.camera.scrollY')));
    await walk(310,190);await walk(240,235);await stairs(1);console.log('PASS prism return, cross-floor framing, wrong aim, keyboard, touch, drag, and latched beam');
    await walk(300,90);await walk(340,100);await objectClick(371,100);await close();assert.ok((await pos()).journal.includes('projection'));
    await walk(300,160);await walk(240,235);await stairs(1);
    await walk(300,100);await walk(363,147);await objectClick(363,181,false);assert.equal((await pos()).flags.generator,true);
    await walk(320,230);await walk(240,238);await stairs(1);console.log('PASS changed Archive and generator rerouting');
    await walk(280,83);await walk(310,190);await walk(351,190);await objectClick(351,224,false);
    for(const n of [2,4,1,3])await click(`[data-shutter="${n}"]`);await click('#solveShutters');
    assert.equal((await pos()).flags.shutters,true);await walk(300,255);await walk(240,255);await stairs(1);
    await walk(300,105);await walk(350,125);await objectClick(350,155);await close();await walk(295,150);await walk(275,169);await objectClick(240,169);await click('#lightBeacon');
    assert.equal((await pos()).flags.beaconLit,true);assert.equal((await pos()).flags.finished,false);await screenshot('20-beacon-activation');
    for(let n=0;n<4;n++)await stairs(-1);
    await walk(240,80);await objectClick(240,52);assert.equal((await pos()).flags.finished,true);await screenshot('04-ending');console.log('PASS full connected solution, companion ascent and Dome escape');
    await click('#endingDone');await send('Page.reload');await sleep(900);await click('#continueButton');assert.equal((await pos()).flags.finished,true);assert.equal((await pos()).room,0);console.log('PASS persisted completed journey');
    assert.equal(await evaluate('window.observatory.running'),true,'Continue actually starts gameplay');await click('#journalButton');await screenshot('journal-check');assert.ok(await evaluate('document.querySelectorAll(".journal-entry").length')>=6);await close();
    await click('#soundButton');assert.equal((await pos()).muted,false);await click('#soundButton');console.log('PASS journal and audio controls');
    }else{
      await send('Page.reload');await sleep(600);await click('#continueButton');
      assert.equal((await pos()).flags.beamAligned,true,'Aligned beam survives reload');
      console.log('PASS focused mirror controls and persisted alignment');
    }
  }
  await click('#expeditionButton');assert.equal(await evaluate('document.querySelector("#dialog").open'),true);await click('[data-close]');
  await click('#fullscreenButton');assert.equal(await evaluate('!!document.fullscreenElement'),true);await click('#fullscreenButton');assert.equal(await evaluate('!!document.fullscreenElement'),false);console.log('PASS expedition and fullscreen controls');
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});await sleep(250);await screenshot('05-laptop');
  assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await sleep(250);await screenshot('06-narrow-layout');assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);
  assert.deepEqual(errors,[]);console.log('PASS responsive layout and no browser exceptions');
}finally{clearInterval(keepAlive);ws?.close();chrome.kill();}
