import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const assets={};
for(const name of ['dome','archive','pump','lens','beacon','explorer'])assets[name]='data:image/webp;base64,'+(await readFile(path.join(root,'dist','assets',name+'.webp'))).toString('base64');
let css=await readFile(path.join(root,'dist','style.css'),'utf8');css=css.replace("url('./assets/dome.webp')",`url('${assets.dome}')`);
let code='const ASSET_DATA='+JSON.stringify(assets)+';\n';
for(const file of ['light.mjs','instruments.mjs','state.mjs','rooms.mjs','navigation.mjs','companion.mjs','journal.mjs','camera.mjs','art.mjs','game.mjs']){
  let source=await readFile(path.join(root,'dist',file),'utf8');
  source=source.replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'');
  source=source.replace('image.src=`./assets/${name}.webp`','image.src=ASSET_DATA[name]');
  code+=source+'\n';
}
let html=await readFile(path.join(root,'dist','index.html'),'utf8');
html=html.replace('  <link rel="preload" as="image" href="./assets/dome.webp">\n','');
html=html.replace('<link rel="stylesheet" href="./style.css">',()=>`<style>${css}</style>`);
html=html.replace('<script type="module" src="./game.mjs"></script>',()=>`<script type="module">${code}</script>`);
await writeFile(path.join(root,'play.html'),html);
console.log('Portable game: '+path.join(root,'play.html'));
