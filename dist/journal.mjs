const sketchLabels={letter:'An uncharted passage',trail:'Bootprints through the dust',mural:'The celestial procession',reflection:'The view from beneath',mentor:'A passage cut off by water',knock:'Three taps, a pause, three taps',plaque:'Drain, latch, then power',prism:'A prism and its matching socket',light:'One instrument across two floors',projection:'The discovered shutter sequence',diagram:'Three unfinished channels',reunion:'A signal through the mountain'};
function sketchSymbol(kind,x,y){
  const shape=kind==='crescent'?'<path d="M5-12a13 13 0 1 0 0 24A13 13 0 0 1 5-12Z"/>':kind==='star'?'<path d="m0-14 4 10 10 4-10 4-4 10-4-10-10-4 10-4Z"/>':'<circle r="7"/><path d="M0-17v5m0 24v5M-17 0h5m24 0h5M-12-12l4 4m16 16 4 4m0-24-4 4m-16 16-4 4"/>';
  return `<g transform="translate(${x} ${y})">${shape}</g>`;
}
export function clueSketch(id){
  let drawing;
  if(id==='mural')drawing=['crescent','star','sun'].map((kind,i)=>sketchSymbol(kind,55+i*85,52)).join('')+'<path d="M80 52h26m-5-4 5 4-5 4M165 52h26m-5-4 5 4-5 4"/>';
  else if(id==='reflection')drawing=['crescent','star','sun'].map((kind,i)=>sketchSymbol(kind,55+i*85,40)).join('')+'<path d="M34 76h213M225 91H55m7-5-7 5 7 5"/><text x="140" y="113" text-anchor="middle">READ FROM BENEATH</text>';
  else if(id==='projection')drawing=[2,4,1,3].map((n,i)=>`<rect x="${31+i*59}" y="24" width="40" height="54"/><text x="${51+i*59}" y="58" class="sketch-number" text-anchor="middle">${n}</text>`).join('')+'<path d="M45 94h190m-6-4 6 4-6 4"/>';
  else if(id==='prism')drawing='<path d="m65 23-30 59h60Zm0 0v59M121 54h35m-6-5 6 5-6 5M185 26h58v63h-58zM214 37l-20 39h40Z"/>';
  else if(id==='light')drawing='<path d="M20 55h240M20 61h240M80 18v15m-12 0h24M80 33l113 58m-9-5 9 5-9 3"/><circle cx="200" cy="94" r="12"/><text x="114" y="28">DOME</text><text x="25" y="98">ARCHIVE</text>';
  else if(id==='plaque')drawing='<path d="M27 27v49h61V27m-53 15h45M58 53v36m-6-6 6 6 6-6M115 57h37m-6-5 6 5-6 5M172 36h25v43h-25zM184 37l18-15"/><circle cx="234" cy="60" r="22"/><path d="M234 38v44m-22-22h44m-38-16 32 32m0-32-32 32"/>';
  else if(id==='diagram')drawing=sketchSymbol('sun',53,30)+'<circle cx="140" cy="30" r="13"/><path d="M140 17v26m-13-13h26M214 18h28v25h-28zM222 18v25m10-25v25M53 49v17h87m88-17v17h-88m0-17v44"/><path d="m126 105 14-12 14 12" stroke-dasharray="3 4"/>';
  else if(id==='knock')drawing='<path d="M32 43h216v31H32zM55 43v31m165-31v31"/>'+[78,93,108,169,184,199].map(x=>`<path d="M${x} 27v9m-3-6h6"/>`).join('');
  else if(id==='trail')drawing=[0,1,2,3,4].map((n)=>`<g transform="translate(${66+n*36} ${n%2?45:67}) rotate(-25)"><rect x="-4" y="-12" width="8" height="15" rx="3"/><path d="M-3 8h6"/></g>`).join('');
  else if(id==='reunion')drawing='<path d="M22 94 83 29l43 44 43-56 89 77M140 97V35m-7 10 7-10 7 10"/>'+sketchSymbol('star',140,24);
  else drawing='<path d="M79 22h108v77H79zM94 40h73m-73 14h51m-51 14h70m-70 14h37M66 32v58m132-58v58"/><path d="m151 84 15-21 8 7-15 21-12 3Z"/>';
  const label=sketchLabels[id]??'Field observation';
  return `<figure class="clue-sketch"><svg viewBox="0 0 280 122" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${drawing}</g></svg><figcaption>${label}</figcaption></figure>`;
}
