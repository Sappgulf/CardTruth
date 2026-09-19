import {VERSION,axisMeasurement,validateQuad,proposeQuad,rectify,proposeBorder,quality,edgeCandidates,standardsSummary} from './core.js';
import {loadPhoto,decodeURL,pixelsURL,downloadJSON,readReport,sha256} from './io.js';
import {demoPhoto} from './demo.js';

const $=id=>document.getElementById(id);
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nextPaint=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const uuid=()=>globalThis.crypto?.randomUUID?.()??`scan-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
const labelSide=s=>s==='front'?'Front':'Back';
const fmt=p=>p.map(x=>x.toFixed(1)).join(' / ');
const fieldNames=['left','right','top','bottom'];
const kinds=['Area to review','Whitening','Scratch','Print line','Possible dent','Edge chip','Corner wear','Other'];
let state={id:uuid(),created:new Date().toISOString(),active:'front',sides:{front:null,back:null},name:'',dirty:false,zoom:1,outcome:null};
let dragging=null,busy=false,toastTimer,markMode=false,pendingMark=null,currentPixels=null;

function notify(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,6500);}
async function working(label,fn){if(busy)return;busy=true;$('busyText').textContent=label;$('busy').hidden=false;try{await nextPaint();await fn();}catch(e){notify(e.message??'Something went wrong. Your existing inspection has been kept.');}finally{busy=false;$('busy').hidden=true;}}
function side(){return state.sides[state.active];}
function dirty(){state.dirty=true;}
function anySynthetic(){return Object.values(state.sides).some(s=>s?.synthetic);}
function setActive(key){if(busy)return;state.active=key;state.zoom=1;markMode=false;pendingMark=null;render();}
function chooseFile(camera=false){$(camera?'cameraInput':'photoInput').value='';$(camera?'cameraInput':'photoInput').click();}

function makeSide(photo,synthetic=false){
 const proposal=proposeQuad(photo.pixels),w=photo.pixels.width,h=photo.pixels.height;
 return {photo,synthetic,quad:proposal??[[w*.16,h*.08],[w*.84,h*.08],[w*.84,h*.92],[w*.16,h*.92]],proposal_found:!!proposal,
  phase:'outline',rectified:null,borders:null,measurement:null,quality:null,error_px:2,borderless:false,annotations:[],candidates:[],references:[],outline_confirmed_at:null,borders_confirmed_at:null};
}
async function acceptPhoto(file){
 const key=state.active;
 await working('Reading and checking your photo…',async()=>{
  const photo=await loadPhoto(file);const entry=makeSide(photo);state.sides[key]=entry;state.active=key;state.zoom=1;markMode=false;pendingMark=null;dirty();render();
  notify(entry.proposal_found?'Outline suggested. Check all four handles before continuing.':'No reliable outline found. Position all four handles manually.');
 });
}
async function confirmOutline(){
 const s=side();if(!s)return;
 await working('Correcting perspective…',async()=>{
  validateQuad(s.quad);const image=rectify(s.photo.pixels,s.quad);
  s.rectified=image;s.borders=proposeBorder(image);s.quality=quality(image);s.candidates=edgeCandidates(image);s.measurement=null;s.borderless=false;s.phase='borders';s.outline_confirmed_at=new Date().toISOString();s.borders_confirmed_at=null;s.annotations=[];
  state.zoom=1;dirty();render();notify('Check the inner border guides. Artwork boundaries are not always the grading border.');
 });
}
function validateBorders(s){
 const b=s.borders,w=s.rectified.width,h=s.rectified.height;
 if(fieldNames.some(k=>!Number.isFinite(b[k])||b[k]<=0)||b.left+b.right>=w*.85||b.top+b.bottom>=h*.85)throw Error('Use positive border widths, leaving the printed area inside the guides.');
}
function measureSide(){
 const s=side();if(!s?.rectified)return;
 try{
  validateBorders(s);
  if(!s.quality.usable)throw Error('This image failed a basic quality check. Replace it, or skip centering and keep inspection notes only.');
  s.measurement={lr:axisMeasurement(s.borders.left,s.borders.right,s.error_px),tb:axisMeasurement(s.borders.top,s.borders.bottom,s.error_px),method:'operator_confirmed_image_borders',geometry:'nominal_aspect_rectification_not_physical_size',borders_px:{...s.borders}};
  s.phase='review';s.borders_confirmed_at=new Date().toISOString();s.borderless=false;markMode=false;pendingMark=null;dirty();render();
  notify(`${labelSide(state.active)} centering measured. This is not an overall grade.`);
 }catch(e){notify(e.message);}
}
function skipCentering(){const s=side();s.measurement=null;s.borderless=true;s.phase='review';s.borders_confirmed_at=null;markMode=false;dirty();render();notify('Centering left unknown. You can still inspect and annotate the photo.');}
function setBorder(key,value){const s=side();if(!s?.borders)return;let max=(key==='left'||key==='right'?s.rectified.width:s.rectified.height)*.4;s.borders[key]=Math.max(.5,Math.min(max,Number(value)||.5));s.measurement=null;s.borders_confirmed_at=null;dirty();drawOverlay();updateLiveMetrics();}
function updateLiveMetrics(){const s=side();if(!s?.borders)return;try{$('liveLR').textContent=fmt(axisMeasurement(s.borders.left,s.borders.right,s.error_px).pair);$('liveTB').textContent=fmt(axisMeasurement(s.borders.top,s.borders.bottom,s.error_px).pair);}catch{}fieldNames.forEach(k=>{const el=$(`border-${k}`);if(el&&document.activeElement!==el)el.value=s.borders[k].toFixed(1);});}
function editOutline(){const s=side();s.phase='outline';s.measurement=null;s.borders_confirmed_at=null;s.outline_confirmed_at=null;markMode=false;pendingMark=null;state.zoom=1;dirty();render();}
function editBorders(){const s=side();s.phase='borders';s.measurement=null;s.borderless=false;s.borders_confirmed_at=null;markMode=false;pendingMark=null;dirty();render();}

function render(){
 const s=side();$('demoBanner').hidden=!anySynthetic();$('reportBtn').disabled=!Object.values(state.sides).some(Boolean);$('replaceBtn').textContent=s?'Replace photo':'Add photo';$('rotateBtn').disabled=!s;
 for(let key of ['front','back']){const v=state.sides[key];$(`${key}Tab`).setAttribute('aria-selected',String(key===state.active));$(`${key}State`).className='side-dot'+(v?(v.phase==='review'?' done':' loaded'):'');}
 document.querySelectorAll('[data-step]').forEach(btn=>btn.classList.toggle('active',btn.dataset.step===(!s?'photos':s.phase==='review'?'review':'align')));
 $('emptyStage').hidden=!!s;$('board').hidden=!s;$('zoomControls').hidden=!s;
 $('emptyStage').querySelector('h2').textContent=`Add the ${state.active} of your card`;$('chooseBtn').textContent=`Choose ${state.active} photo`;
 if(s){
  currentPixels=s.phase==='outline'?s.photo.pixels:s.rectified;
  const c=$('photoCanvas');c.width=currentPixels.width;c.height=currentPixels.height;c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(currentPixels.data),currentPixels.width,currentPixels.height),0,0);
  $('overlay').setAttribute('viewBox',`0 0 ${currentPixels.width} ${currentPixels.height}`);
  $('imageCaption').textContent=s.phase==='outline'?`${s.photo.original_dimensions.join(' × ')} source pixels · drag the outer handles`:`${currentPixels.width} × ${currentPixels.height} analysis pixels · ${s.phase==='borders'?'confirm the printed border':markMode?'tap an area to annotate':'visual evidence, not a certified grade'}`;
 }else{$('imageCaption').textContent='Photos are processed in this browser, not sent to a server.';currentPixels=null;}
 renderInspector();layout();renderCrops();renderReferences();
}
function layout(){if(!currentPixels)return;const stage=$('stage');let availW=Math.max(200,stage.clientWidth-40),availH=Math.max(240,stage.clientHeight-40),ratio=currentPixels.width/currentPixels.height;
 const width=Math.min(availW,availH*ratio)*state.zoom;$('board').style.width=`${width}px`;$('board').style.height=`${width/ratio}px`;$('zoomLabel').textContent=`${Math.round(state.zoom*100)}%`;drawOverlay();}
function drawOverlay(){
 const s=side();if(!s||!currentPixels)return;const w=currentPixels.width,h=currentPixels.height,k=w/Math.max(1,$('board').clientWidth),stroke=1.4*k;
 function handle(x,y,i,title,color='#b3ecb7'){
  return `<g data-handle="${i}" role="button" tabindex="0" aria-label="${title}. Use arrow keys to adjust; shift for larger steps."><circle cx="${x}" cy="${y}" r="${23*k}" fill="transparent"/><circle cx="${x}" cy="${y}" r="${6*k}" fill="${color}" stroke="#102e2a" stroke-width="${1.8*k}"/><text x="${x+10*k}" y="${y-10*k}" fill="white" font-family="sans-serif" font-size="${11*k}" stroke="#162f33" stroke-width="${2.5*k}" paint-order="stroke">${i+1}</text></g>`;
 }
 let html='';
 if(s.phase==='outline'){
  html=`<polygon points="${s.quad.map(p=>p.join(',')).join(' ')}" fill="#73a98b12" stroke="#b3ecb7" stroke-width="${stroke}"/>`;
  s.quad.forEach((p,i)=>html+=handle(...p,i,['Top-left corner','Top-right corner','Bottom-right corner','Bottom-left corner'][i]));
 }else if(s.phase==='borders'){
  let {left:l,right:r,top:t,bottom:b}=s.borders;
  html=`<path d="M${l} 0V${h}M${w-r} 0V${h}M0 ${t}H${w}M0 ${h-b}H${w}" fill="none" stroke="#c4eda8" stroke-width="${stroke}" stroke-dasharray="${6*k} ${4*k}"/><rect x="${l}" y="${t}" width="${Math.max(1,w-l-r)}" height="${Math.max(1,h-t-b)}" fill="none" stroke="#c4eda8" stroke-width="${stroke}"/>`;
  [[l,h/2],[w-r,h/2],[w/2,t],[w/2,h-b]].forEach((p,i)=>html+=handle(...p,i,`${fieldNames[i]} border`));
 }else{
  for(const p of s.candidates)html+=`<circle cx="${p.x*w}" cy="${p.y*h}" r="${9*k}" fill="none" stroke="#f6cf70" stroke-width="${1.5*k}" stroke-dasharray="${3*k} ${2*k}"/>`;
  s.annotations.forEach((p,i)=>html+=`<g><circle cx="${p.x*w}" cy="${p.y*h}" r="${10*k}" fill="#d5efbd" stroke="#174438" stroke-width="${1.3*k}"/><text x="${p.x*w}" y="${p.y*h+3.5*k}" text-anchor="middle" font-size="${10*k}" fill="#163f36" font-family="sans-serif">${i+1}</text></g>`);
  if(pendingMark)html+=`<circle cx="${pendingMark.x*w}" cy="${pendingMark.y*h}" r="${15*k}" stroke="white" fill="none" stroke-width="${2*k}"/>`;
 }
 $('overlay').innerHTML=html;$('overlay').style.cursor=markMode?'crosshair':s.phase==='review'?'default':'grab';
}
function qualityHTML(s){if(!s.quality)return '';return s.quality.issues.map(i=>`<div class="quality-item ${i.level==='block'?'block':''}">${escapeHTML(i.text)}</div>`).join('')||'<p class="status-line">Basic image checks did not flag a problem.</p>';}
function renderInspector(){
 const s=side(),el=$('inspector');
 if(!s){el.innerHTML=`<h2>Start with two photos.</h2><p class="description">A simple inspection begins with a clear front and back. Your camera is enough to get started.</p><div class="field"><label for="cardName">Card name or number (optional)</label><input id="cardName" placeholder="e.g. Charizard · 4/102" maxlength="150" value="${escapeHTML(state.name)}"></div><button class="primary full" id="inspectorChoose">Choose ${state.active} photo</button><button class="secondary full camera-button" id="useCamera">Take a photo</button><div class="divider"></div><h3>What you get</h3><p class="small muted">Confirmed border ratios, enlarged corners, editable inspection notes and an exportable evidence report.</p><div class="hintbox">Overall grades stay unknown until a prediction model has been trained and validated.</div><p class="tiny muted">Not sure where to begin? The synthetic demo walks through the same tools, using a test target.</p>`;
  $('cardName').oninput=e=>{state.name=e.target.value;dirty();};$('inspectorChoose').onclick=()=>chooseFile();$('useCamera').onclick=()=>chooseFile(true);return;
 }
 if(s.phase==='outline'){
  el.innerHTML=`<span class="pill">${labelSide(state.active)} · outer outline</span><h2 style="margin-top:14px">Find the real edges.</h2><p class="description">Drag each numbered handle to a card corner. Use the intersection of the straight edges, not the rounded tip.</p><div class="hintbox ${s.proposal_found?'':'warning'}">${s.proposal_found?'This is a suggested outline. Check it carefully before measuring.':'No dependable outline was found. Set all four corners yourself.'}</div><button id="confirmOutline" class="primary full">Confirm card outline</button><p class="coordinate-help">Handles also work with arrow keys. Hold Shift for larger adjustments.</p><details><summary>Edit corner coordinates</summary><div class="outline-values">${s.quad.map((p,i)=>`<label>Corner ${i+1} · X<input type="number" data-quad="${i},0" step="1" min="0" max="${s.photo.pixels.width-1}" value="${p[0].toFixed(1)}"></label><label>Corner ${i+1} · Y<input type="number" data-quad="${i},1" step="1" min="0" max="${s.photo.pixels.height-1}" value="${p[1].toFixed(1)}"></label>`).join('')}</div></details><div class="divider"></div><h3>Keep it square.</h3><p class="small muted">The outline corrects perspective. It does not correct lens distortion or prove the card’s dimensions. Avoid severe tilt.</p><p class="tiny muted">Source: ${s.photo.original_dimensions.join(' × ')} px<br>Analysis: ${s.photo.analysis_dimensions.join(' × ')} px<br>No upscaling is used to claim more detail.</p>`;
  $('confirmOutline').onclick=confirmOutline;
  document.querySelectorAll('[data-quad]').forEach(input=>input.oninput=e=>{const [i,axis]=e.target.dataset.quad.split(',').map(Number);const max=axis?s.photo.pixels.height-1:s.photo.pixels.width-1;s.quad[i][axis]=Math.max(0,Math.min(max,Number(e.target.value)||0));dirty();drawOverlay();});
 }else if(s.phase==='borders'){
  el.innerHTML=`<span class="pill">${labelSide(state.active)} · printed border</span><h2 style="margin-top:14px">Check the inner guides.</h2><p class="description">Place the green guides where the outer printed border ends. Adjust them on the image or enter widths below.</p><div class="number-grid">${fieldNames.map(k=>`<div class="field"><label for="border-${k}">${k[0].toUpperCase()+k.slice(1)} · pixels</label><input id="border-${k}" type="number" min="0.5" step="0.5" value="${s.borders[k].toFixed(1)}"></div>`).join('')}</div><div class="metric"><span>Left / right</span><strong id="liveLR"></strong></div><div class="metric"><span>Top / bottom</span><strong id="liveTB"></strong></div><div class="field"><label for="errorPixels">Assumed border-width error · ± pixels</label><input id="errorPixels" type="number" min="0.5" max="20" step="0.5" value="${s.error_px}"></div><p class="measure-fine">The range is a sensitivity bound, not a calibrated confidence interval. Two pixels is only a starting assumption, not a measured accuracy.</p>${qualityHTML(s)}<button id="measureBtn" class="primary full" ${s.quality.usable?'':'disabled'}>Confirm border measurement</button><button id="skipBtn" class="quiet full">Full-art / unclear border? Skip centering</button><button id="editOutline" class="quiet full">Back to the outer outline</button>`;
  fieldNames.forEach(k=>$(`border-${k}`).oninput=e=>setBorder(k,e.target.value));$('errorPixels').onchange=e=>{s.error_px=Math.max(.5,Math.min(20,Number(e.target.value)||2));e.target.value=s.error_px;dirty();updateLiveMetrics();};$('measureBtn').onclick=measureSide;$('skipBtn').onclick=skipCentering;$('editOutline').onclick=editOutline;updateLiveMetrics();
 }else{
  el.innerHTML=`<span class="pill">${labelSide(state.active)} · evidence review</span><h2 style="margin-top:14px">Look closer.</h2>${s.measurement?`<div class="metric"><span>Left / right</span><strong>${fmt(s.measurement.lr.pair)}</strong></div><div class="metric"><span>Top / bottom</span><strong>${fmt(s.measurement.tb.pair)}</strong></div><p class="measure-fine">Based on your confirmed border guides. Sensitivity and grading-reference checks are in the report.</p>`:'<div class="hintbox warning">Centering is unknown for this side. The photo remains available for visual review.</div>'}<p class="description">Inspect the enlarged corners below. Mark anything worth a closer look. A photo cannot rule out hidden damage.</p><button id="markBtn" class="${markMode?'secondary':'primary'} full">${markMode?'Cancel marking':'Mark an area on the card'}</button>${pendingMark?`<div class="field"><label for="markKind">Your observation</label><select id="markKind">${kinds.map(k=>`<option>${k}</option>`).join('')}</select></div><div class="field"><label for="markNote">Note (optional)</label><textarea id="markNote" maxlength="500" placeholder="What do you see under a different light?"></textarea></div><button id="saveMark" class="primary full">Save observation</button>`:''}<p class="inspection-legend">Solid markers: your notes.<br>Dashed amber circles: automatic bright-spot suggestions, not confirmed damage.</p><p class="tiny muted">${s.candidates.length?s.candidates.length+' bright spot(s) suggested. These can be glare, printing or wear.':'No bright spots were suggested. Scratches, dents and other defects can still be present.'}</p><ul class="annotation-list">${s.annotations.map((a,i)=>`<li><span class="annotation-number">${i+1}</span><div>${escapeHTML(a.kind)}<small>${escapeHTML(a.note||'User-reported observation')}</small></div><button class="remove" data-remove="${i}" aria-label="Remove observation ${i+1}">×</button></li>`).join('')}</ul><button id="addReference" class="secondary full">Add another lighting angle</button><p class="tiny muted" style="margin-top:9px">Extra photos are reference evidence only. No 3D reconstruction is claimed.</p><div class="divider"></div><button id="nextSide" class="primary full">${state.active==='front'?'Continue to back':'View inspection report'}</button><button id="editBorders" class="quiet full">Edit border guides</button>`;
  $('markBtn').onclick=()=>{markMode=!markMode;pendingMark=null;renderInspector();drawOverlay();$('imageCaption').textContent=markMode?'Tap the card where you want to add a note.':'Visual evidence, not a certified grade.';if(markMode)$('board').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});};
  if($('saveMark'))$('saveMark').onclick=()=>{if(!pendingMark)return;if(s.annotations.length>=200)return notify('The report supports up to 200 observations per side.');s.annotations.push({id:uuid(),...pendingMark,kind:$('markKind').value,note:$('markNote').value.trim(),evidence:'user_reported',created_at:new Date().toISOString()});pendingMark=null;markMode=false;dirty();render();};
  document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{s.annotations.splice(Number(b.dataset.remove),1);dirty();render();});
  $('addReference').onclick=()=>{$('referenceInput').value='';$('referenceInput').click();};$('nextSide').onclick=()=>state.active==='front'?setActive('back'):showReport();$('editBorders').onclick=editBorders;
 }
}
function renderCrops(){
 const s=side(),gallery=$('cornerGallery');gallery.hidden=!s?.rectified||s.phase!=='review';gallery.replaceChildren();if(gallery.hidden)return;
 const image=$('photoCanvas'),size=Math.round(Math.min(image.width,image.height)*.24);
 [[0,0,'Top left'],[image.width-size,0,'Top right'],[0,image.height-size,'Bottom left'],[image.width-size,image.height-size,'Bottom right']].forEach(([x,y,label])=>{
  const fig=document.createElement('figure'),c=document.createElement('canvas'),caption=document.createElement('figcaption');c.width=240;c.height=240;c.getContext('2d').drawImage(image,x,y,size,size,0,0,240,240);caption.textContent=label+' · enlarged view';fig.append(c,caption);gallery.append(fig);
 });
}
function renderReferences(){
 const s=side(),g=$('referenceGallery');g.replaceChildren();g.hidden=!s?.references.length;if(g.hidden)return;
 const text=document.createElement('p');text.textContent='Additional lighting-angle evidence. Click to inspect; not used for depth measurements.';g.append(text);
 s.references.forEach((r,i)=>{const b=document.createElement('button'),img=document.createElement('img');img.src=r.data_url;img.alt=`${labelSide(state.active)} extra angle ${i+1}`;b.append(img);b.onclick=()=>{
  const d=document.createElement('dialog');const heading=document.createElement('div');heading.className='dialog-heading';const h=document.createElement('h2');h.textContent=`Reference angle ${i+1}`;const close=document.createElement('button');close.className='icon-btn';close.textContent='×';close.setAttribute('aria-label','Close reference photo');close.onclick=()=>d.close();heading.append(h,close);const image=document.createElement('img');image.src=r.data_url;image.className='reference-dialog-img';image.alt=img.alt;d.append(heading,image);document.body.append(d);d.onclose=()=>d.remove();d.showModal();
 };g.append(b);});
}

function pointerCoords(event){let box=$('overlay').getBoundingClientRect();return [Math.max(0,Math.min(currentPixels.width-1,(event.clientX-box.left)/box.width*currentPixels.width)),Math.max(0,Math.min(currentPixels.height-1,(event.clientY-box.top)/box.height*currentPixels.height))];}
$('overlay').onpointerdown=e=>{
 const s=side();if(!s)return;let handle=e.target.closest('[data-handle]');
 if(handle&&s.phase!=='review'){e.preventDefault();dragging={index:Number(handle.dataset.handle)};$('overlay').setPointerCapture(e.pointerId);}
 else if(s.phase==='review'&&markMode){let [x,y]=pointerCoords(e);pendingMark={x:x/currentPixels.width,y:y/currentPixels.height};renderInspector();drawOverlay();$('markKind')?.focus();}
};
$('overlay').onpointermove=e=>{
 if(!dragging)return;e.preventDefault();const s=side(),[x,y]=pointerCoords(e),i=dragging.index;
 if(s.phase==='outline'){s.quad[i]=[x,y];dirty();drawOverlay();}
 else{const values=[x,currentPixels.width-x,y,currentPixels.height-y];setBorder(fieldNames[i],values[i]);}
};
$('overlay').onpointerup=e=>{dragging=null;if($('overlay').hasPointerCapture(e.pointerId))$('overlay').releasePointerCapture(e.pointerId);};
$('overlay').onpointercancel=()=>dragging=null;
$('overlay').onkeydown=e=>{
 if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;let g=e.target.closest('[data-handle]');if(!g)return;e.preventDefault();let s=side(),i=Number(g.dataset.handle),step=e.shiftKey?10:1,dx=e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0,dy=e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0;
 if(s.phase==='outline'){s.quad[i][0]=Math.max(0,Math.min(s.photo.pixels.width-1,s.quad[i][0]+dx));s.quad[i][1]=Math.max(0,Math.min(s.photo.pixels.height-1,s.quad[i][1]+dy));dirty();drawOverlay();}
 else if(s.phase==='borders'){let change=[dx,-dx,dy,-dy][i];setBorder(fieldNames[i],s.borders[fieldNames[i]]+change);}
 $('overlay').querySelector(`[data-handle="${i}"]`)?.focus();
};

function reportBody(){
 const sides={};for(let key of ['front','back']){let s=state.sides[key];if(!s){sides[key]=null;continue;}
  sides[key]={synthetic:s.synthetic,source_file_name:s.photo.file_name,source_file_sha256:s.photo.source_sha256,source_dimensions:s.photo.original_dimensions,analysis_dimensions:s.photo.analysis_dimensions,analysis_scale:s.photo.analysis_scale,rotation_degrees:s.photo.rotation_degrees??0,
   analysis_image:s.photo.data_url,outline:s.quad,outline_confirmed_at:s.outline_confirmed_at,borders_confirmed_at:s.borders_confirmed_at,phase:s.phase,borderless:s.borderless,borders:s.borders,assumed_border_width_error_px:s.error_px,measurement:s.measurement,quality:s.quality,annotations:s.annotations,candidates:s.candidates,references:s.references};
 }
 return {format:'cardtruth-inspection',version:VERSION,scan_id:state.id,created_at:state.created,exported_at:new Date().toISOString(),card_name:state.name,synthetic:Object.values(sides).some(s=>s?.synthetic),sides,
  grade_prediction:{status:'withheld',reason:'No validated prediction model or calibrated physical-defect pipeline is installed.',probabilities:[]},
  centering_references:standardsSummary(sides.front?.measurement,sides.back?.measurement),authenticity:{status:'not_assessed'},surface_depth:{status:'not_measured'},returned_grade:state.outcome,
  provenance:{processing:'on_device',measurement:'operator_confirmed_photo_geometry',image_copies:'analysis_resolution_not_original_files',timestamp:'device_asserted_not_verified',hash:'integrity_only_not_authentication'},
  limitations:['No guaranteed or predicted third-party grade.','Image ratios depend on operator border selection, camera optics and card design.','Pixel-error ranges are assumed sensitivity bounds, not calibrated confidence intervals.','Bright-spot suggestions are not confirmed flaws. Absence of suggestions does not establish absence of damage.','No measured dent depth, LiDAR metrology, counterfeit determination or verified physical-card identity.','Retain the original images; these embedded images are processed evidence copies.']};
}
const stateText={within_published_guideline:'Within the centering guideline',outside_published_guideline:'Outside the centering guideline',boundary_uncertain:'Boundary uncertain',not_measured:'Both sides must be measured'};
function showReport(){
 if(!Object.values(state.sides).some(Boolean))return;const r=reportBody();
 let rows='';for(let key of ['front','back'])for(let [axis,title] of [['lr','Left / right'],['tb','Top / bottom']]){let m=r.sides[key]?.measurement?.[axis];rows+=`<tr><td>${labelSide(key)} · ${title}</td><td>${m?fmt(m.pair):'Not measured'}</td><td class="optional-col">${m?`±${m.assumed_border_width_error_px} px`:'—'}</td><td>${m?m.major_interval.map(v=>v.toFixed(1)).join('–')+'%':'Unknown'}</td></tr>`;}
 let html=`${r.synthetic?'<div class="hintbox warning">SYNTHETIC DEMO: This report contains test-target images, not validated card results.</div>':''}<div class="report-verdict"><h3>Overall grade: withheld</h3><p>There is no validated grading model in this build. The useful output here is your photo evidence and confirmed centering, not a made-up score.</p></div><div class="field"><label for="reportName">Card name or number (optional, user-entered)</label><input id="reportName" maxlength="150" value="${escapeHTML(state.name)}" placeholder="Name this inspection"></div><h3>Confirmed centering</h3><table class="report-table"><thead><tr><th>Side / axis</th><th>Ratio</th><th class="optional-col">Assumed error</th><th>Major-side range</th></tr></thead><tbody>${rows}</tbody></table><p class="small muted">The range shows sensitivity to your assumed border-width placement error. It is not a certified or statistically calibrated confidence interval.</p><h3>Published centering references, not grades</h3>${r.centering_references.map(p=>`<div class="report-grader"><div><h3>${p.name}</h3><small>Reviewed ${p.reviewed_at}</small></div><div>${p.checks.length?p.checks.map(c=>`<p><strong>${c.label}:</strong> ${stateText[c.status]}</p><p class="tiny muted">Front ~${c.front_limit}/${100-c.front_limit}; back ~${c.back_limit}/${100-c.back_limit}.</p>`).join(''):`<p>${escapeHTML(p.note)}</p>`}<a href="${p.source}" target="_blank" rel="noopener noreferrer">Official reference</a></div></div>`).join('')}<div class="hintbox">Meeting a centering guideline does not establish a grade. Corners, edges, surface, authenticity and grader judgment still matter.</div><h3>Your visual evidence</h3><div class="report-photo-strip">${['front','back'].filter(key=>state.sides[key]).map(key=>`<figure><img src="${state.sides[key].rectified?pixelsURL(state.sides[key].rectified):state.sides[key].photo.data_url}" alt="${labelSide(key)} evidence"><figcaption>${labelSide(key)} · ${state.sides[key].annotations.length} user note(s)</figcaption></figure>`).join('')}</div><ul class="report-notes">${['front','back'].flatMap(key=>(r.sides[key]?.annotations??[]).map(a=>`<li>${labelSide(key)}: ${escapeHTML(a.kind)}${a.note?' · '+escapeHTML(a.note):''} <em>(user-reported)</em></li>`)).join('')||'<li>No observations were added. This does not mean the card is free of damage.</li>'}<li>Authenticity: not assessed. Surface depth: not measured.</li><li>Extra lighting-angle photos: ${Object.values(state.sides).reduce((n,s)=>n+(s?.references.length??0),0)}. Stored for visual review, not reconstructed.</li></ul><details class="outcome-editor"><summary>Record an actual returned grade</summary><p class="small muted">Keep a future grading result with the original inspection. This is user-reported, not issuer-verified, and does not automatically train a model.</p><div class="outcome-grid"><div class="field"><label for="outcomeGrader">Grading company</label><select id="outcomeGrader"><option>PSA</option><option>CGC</option><option>BGS</option></select></div><div class="field"><label for="outcomeGrade">Returned grade label</label><select id="outcomeGrade"></select></div></div><button class="secondary" id="saveOutcome" style="margin-top:12px">Save returned result</button><p class="small muted" id="outcomeStatus" style="margin-top:12px"></p></details><details><summary>Limits and provenance</summary><ul class="report-notes">${r.limitations.map(x=>`<li>${escapeHTML(x)}</li>`).join('')}</ul><p class="small muted">Original-file hashes identify input bytes, not a unique physical card. The report checksum is not an independent signature or trusted timestamp.</p></details><p class="report-meta">Inspection ${escapeHTML(r.scan_id)} · Created ${escapeHTML(r.created_at)} · CardTruth ${VERSION}</p>`;
 $('reportContent').innerHTML=html;$('reportName').oninput=e=>{state.name=e.target.value;dirty();};
 $('outcomeGrader').value=state.outcome?.grader??'PSA';
 function grades(){const g=$('outcomeGrader').value;let labels=g==='CGC'?['Pristine 10','Gem Mint 10','9.5','9','8.5','8','7.5','7','6.5','6','5.5','5','4.5','4','3.5','3','2.5','2','1.5','1']:g==='BGS'?['Black Label 10','Pristine 10','9.5','9','8.5','8','7.5','7','6.5','6','5.5','5','4.5','4','3.5','3','2.5','2','1.5','1']:['10','9','8.5','8','7.5','7','6.5','6','5.5','5','4.5','4','3.5','3','2.5','2','1.5','1'];labels.push('No numeric grade');$('outcomeGrade').replaceChildren(...labels.map(l=>new Option(l,l)));if(state.outcome?.grader===g)$('outcomeGrade').value=state.outcome.grade;}
 grades();$('outcomeGrader').onchange=grades;$('outcomeStatus').textContent=state.outcome?`Saved: ${state.outcome.grader} ${state.outcome.grade} (user-reported).`:'';
 $('saveOutcome').onclick=()=>{state.outcome={grader:$('outcomeGrader').value,grade:$('outcomeGrade').value,entered_at:new Date().toISOString(),verification:'user_reported_not_verified'};dirty();$('outcomeStatus').textContent=`Saved: ${state.outcome.grader} ${state.outcome.grade}. Export the report to keep it.`;};
 if(!$('reportDialog').open)$('reportDialog').showModal();
}
async function importInspection(file){
 await working('Opening your saved inspection…',async()=>{
  const report=await readReport(file),next={id:report.scan_id,created:report.created_at,active:'front',name:String(report.card_name??'').slice(0,150),sides:{front:null,back:null},zoom:1,dirty:false,outcome:report.returned_grade??null};
  for(let key of ['front','back']){const v=report.sides[key];if(!v)continue;let decoded=await decodeURL(v.analysis_image),entry=makeSide({...decoded,file_name:v.source_file_name??'Imported evidence',source_sha256:v.source_file_sha256??null,original_dimensions:v.source_dimensions??decoded.original_dimensions,analysis_scale:v.analysis_scale??1,rotation_degrees:v.rotation_degrees??0},!!v.synthetic);
   validateQuad(v.outline);entry.quad=v.outline;
   entry.error_px=Number.isFinite(v.assumed_border_width_error_px)?Math.max(.5,Math.min(20,v.assumed_border_width_error_px)):2;
   if(v.phase==='borders'||v.phase==='review'){
    entry.rectified=rectify(entry.photo.pixels,entry.quad);entry.quality=quality(entry.rectified);entry.borders=v.borders??proposeBorder(entry.rectified);validateBorders(entry);
    entry.candidates=edgeCandidates(entry.rectified);entry.phase=v.phase;entry.borderless=!!v.borderless;entry.outline_confirmed_at=v.outline_confirmed_at??null;entry.borders_confirmed_at=v.borders_confirmed_at??null;
    if(entry.phase==='review'&&!entry.borderless&&entry.quality.usable)entry.measurement={lr:axisMeasurement(entry.borders.left,entry.borders.right,entry.error_px),tb:axisMeasurement(entry.borders.top,entry.borders.bottom,entry.error_px),method:'recomputed_from_imported_operator_guides',borders_px:entry.borders};
   }
   entry.annotations=v.annotations.map(a=>({...a,evidence:'user_reported'}));
   entry.references=(Array.isArray(v.references)?v.references:[]).slice(0,8).filter(x=>/^data:image\/(png|jpeg|webp);base64,/.test(x.data_url??''));next.sides[key]=entry;
  }
  if(!next.sides.front&&!next.sides.back)throw Error('The report contains no usable evidence photographs.');
  if(!next.sides.front)next.active='back';state=next;markMode=false;pendingMark=null;render();notify('Report reopened. Ratios were recalculated from its saved guides.');
 });
}

$('chooseBtn').onclick=()=>chooseFile();$('replaceBtn').onclick=()=>chooseFile();$('photoInput').onchange=e=>e.target.files[0]&&acceptPhoto(e.target.files[0]);$('cameraInput').onchange=e=>e.target.files[0]&&acceptPhoto(e.target.files[0]);
$('frontTab').onclick=()=>setActive('front');$('backTab').onclick=()=>setActive('back');$('reportBtn').onclick=showReport;
$('closeReport').onclick=()=>$('reportDialog').close();$('helpBtn').onclick=()=>$('helpDialog').showModal();$('closeHelp').onclick=()=>$('helpDialog').close();
$('downloadBtn').onclick=async()=>{try{await downloadJSON(reportBody());state.dirty=false;notify('Report download started. Keep the original photographs separately.');}catch(e){notify(e.message);}};
$('printBtn').onclick=()=>window.print();$('importBtn').onclick=()=>{$('reportInput').value='';$('reportInput').click();};$('reportInput').onchange=e=>e.target.files[0]&&importInspection(e.target.files[0]);
$('resetBtn').onclick=()=>{if(state.dirty&&!confirm('Discard this unsaved inspection? Save your report first to keep it.'))return;state={id:uuid(),created:new Date().toISOString(),active:'front',sides:{front:null,back:null},name:'',dirty:false,zoom:1,outcome:null};pendingMark=null;markMode=false;render();};
$('demoBtn').onclick=()=>{if(state.dirty&&!confirm('Replace the unsaved inspection with synthetic demo images?'))return;working('Preparing synthetic test targets…',async()=>{
 state={id:uuid(),created:new Date().toISOString(),active:'front',sides:{front:null,back:null},name:'Synthetic optical target',dirty:true,zoom:1,outcome:null};
 for(let key of ['front','back']){let {canvas,quad}=demoPhoto(key),url=canvas.toDataURL('image/png'),photo=await decodeURL(url);photo.file_name=`synthetic-${key}.png`;photo.source_sha256=await sha256(await (await new Promise(resolve=>canvas.toBlob(resolve,'image/png'))).arrayBuffer());let s=makeSide(photo,true);s.quad=quad;state.sides[key]=s;}
 markMode=false;pendingMark=null;render();notify('Demo loaded. These are synthetic optical targets, not card-grading results.');
 });};
$('rotateBtn').onclick=()=>{const s=side();if(!s)return;if(s.annotations.length&&!confirm('Rotating will reset this side’s geometry and observations. Continue?'))return;working('Rotating photo…',async()=>{
 let src=document.createElement('canvas');src.width=s.photo.pixels.width;src.height=s.photo.pixels.height;src.getContext('2d').putImageData(s.photo.pixels,0,0);let c=document.createElement('canvas');c.width=src.height;c.height=src.width;let g=c.getContext('2d');g.translate(c.width,0);g.rotate(Math.PI/2);g.drawImage(src,0,0);
 let updated={...s.photo,pixels:g.getImageData(0,0,c.width,c.height),data_url:c.toDataURL('image/png'),analysis_dimensions:[c.width,c.height],rotation_degrees:((s.photo.rotation_degrees??0)+90)%360};state.sides[state.active]=makeSide(updated,s.synthetic);dirty();render();
 });};
$('referenceInput').onchange=e=>{const s=side(),files=Array.from(e.target.files);if(!s||!files.length)return;working('Adding lighting-angle evidence…',async()=>{
 if(s.references.length+files.length>8)throw Error('Keep up to eight reference photos per side.');
 const additions=[];for(let file of files){const p=await loadPhoto(file),small=await decodeURL(p.data_url,1280);additions.push({file_name:p.file_name,source_sha256:p.source_sha256,source_dimensions:p.original_dimensions,data_url:small.data_url,evidence:'reference_photo_only'});}
 s.references.push(...additions);dirty();renderReferences();notify('Reference photos added. They are not used for depth or automatic grade prediction.');
 });};
$('zoomIn').onclick=()=>{state.zoom=Math.min(3,state.zoom+.5);layout();};$('zoomOut').onclick=()=>{state.zoom=Math.max(1,state.zoom-.5);layout();};
new ResizeObserver(layout).observe($('stage'));
document.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{const s=side();if(b.dataset.step==='photos'){if(!s)chooseFile();else notify('Use the front/back tabs or Replace photo to change your images.');}else if(b.dataset.step==='align'){if(!s)notify('Add a photo first.');else if(s.phase==='review')editBorders();else $('inspector').scrollIntoView({behavior:'smooth',block:'nearest'});}else if(s?.phase==='review')$('inspector').scrollIntoView({behavior:'smooth',block:'nearest'});else notify('Confirm the outline, then measure or skip centering before reviewing.');});
window.addEventListener('beforeunload',e=>{if(state.dirty){e.preventDefault();e.returnValue='';}});
render();

// In-process iOS bridge. Images are decoded and checked using the same browser path.
window.CardTruth=Object.freeze({version:VERSION,importNativeBundle:async bundle=>{
 if(busy)throw Error('Inspector is busy.');
 if(!bundle||!Array.isArray(bundle.frames)||bundle.frames.length!==2)throw Error('Front and back frames are required.');
 const prepared={front:null,back:null};
 for(const frame of bundle.frames){
  if(!['front','back'].includes(frame.side)||prepared[frame.side]||typeof frame.jpeg_base64!=='string'||frame.jpeg_base64.length>36_000_000)throw Error('Invalid native capture bundle.');
  const decoded=atob(frame.jpeg_base64),bytes=new Uint8Array(decoded.length);for(let i=0;i<decoded.length;i++)bytes[i]=decoded.charCodeAt(i);
  const photo=await loadPhoto(new File([bytes],`${frame.side}.jpg`,{type:'image/jpeg'}));prepared[frame.side]=makeSide(photo,false);
 }
 if(!prepared.front||!prepared.back)throw Error('Both card sides are required.');
 state={id:uuid(),created:new Date().toISOString(),active:'front',sides:prepared,name:'',dirty:true,zoom:1,outcome:null};markMode=false;pendingMark=null;render();return {ok:true};
}});
