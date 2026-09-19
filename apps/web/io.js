/** Local input/export only. No network, accounts, analytics or remote inference. */
export const MAX_BYTES=25*1024*1024;
export const MAX_PIXELS=50_000_000;
export const REPORT_FORMAT_VERSION='1';
export const REPORT_HASH_SCOPE='cardtruth-canonical-json-v1';
export function stableStringify(value){
 const seen=new WeakSet();
 const normalize=v=>{
  if(v===null||typeof v!=='object')return v;
  if(seen.has(v))throw Error('Cannot serialize circular report data.');
  seen.add(v);
  try{
   if(Array.isArray(v))return v.map(normalize);
   return Object.fromEntries(Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>[k,normalize(v[k])]));
  }finally{seen.delete(v);}
 };
 return JSON.stringify(normalize(value));
}
export async function sha256(data){
 if(!globalThis.crypto?.subtle)return sha256Portable(data);
 let bytes=typeof data==='string'?new TextEncoder().encode(data):data;
 let hash=await crypto.subtle.digest('SHA-256',bytes);
 return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
export async function decodeURL(url,maxDimension=2200){
 const img=new Image();
 await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('This browser could not decode the photo. Use a JPEG, PNG or WebP export.'));img.src=url;});
 if(img.naturalWidth*img.naturalHeight>MAX_PIXELS)throw Error('Photo is larger than 50 megapixels. Export a smaller copy.');
 if(Math.min(img.naturalWidth,img.naturalHeight)<32)throw Error('Photo is too small. Use the original card photograph.');
 const ratio=Math.min(1,maxDimension/Math.max(img.naturalWidth,img.naturalHeight));
 const canvas=document.createElement('canvas');canvas.width=Math.round(img.naturalWidth*ratio);canvas.height=Math.round(img.naturalHeight*ratio);
 const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#161b23';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
 return {pixels:ctx.getImageData(0,0,canvas.width,canvas.height),original_dimensions:[img.naturalWidth,img.naturalHeight],analysis_dimensions:[canvas.width,canvas.height],analysis_scale:ratio,data_url:canvas.toDataURL('image/png')};
}
export async function loadPhoto(file){
 if(!file||file.size>MAX_BYTES)throw Error('Choose a photo smaller than 25 MB.');
 if(file.size===0)throw Error('This file is empty.');
 if(file.type&&!/^image\/(jpeg|jpg|png|webp|heic|heif)$/.test(file.type))throw Error('Use a JPEG, PNG, WebP or supported HEIC photo, not a document or animation.');
 const raw=await file.arrayBuffer(),hash=await sha256(raw),url=URL.createObjectURL(file);
 try{return {...await decodeURL(url),file_name:file.name.slice(0,180),file_bytes:file.size,source_sha256:hash,captured_at:new Date().toISOString()};}
 finally{URL.revokeObjectURL(url);}
}
export function pixelsURL(im){
 const c=document.createElement('canvas');c.width=im.width;c.height=im.height;c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(im.data),im.width,im.height),0,0);return c.toDataURL('image/png');
}
export async function downloadJSON(report){
 const body={...report,format_version:report.format_version??REPORT_FORMAT_VERSION};
 const canonical=stableStringify(body);
 const receipt={...body,receipt_sha256:await sha256(canonical),hash_scope:REPORT_HASH_SCOPE};
 if(globalThis.webkit?.messageHandlers?.cardtruthExport){globalThis.webkit.messageHandlers.cardtruthExport.postMessage(JSON.stringify(receipt));return receipt;}
 const blob=new Blob([JSON.stringify(receipt,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download=`cardtruth-${report.scan_id}.ctscan.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
 return receipt;
}
export async function readReport(file){
 if(!file||file.size>80*1024*1024)throw Error('Report must be smaller than 80 MB.');
 let report;try{report=JSON.parse(await file.text());}catch{throw Error('This is not a valid JSON report.');}
 const legacy=report.format==='cardtruth-inspection'&&report.version==='0.2.0'&&!report.format_version;
 const current=report.format==='cardtruth-inspection'&&report.format_version===REPORT_FORMAT_VERSION;
 if((!legacy&&!current)||typeof report.scan_id!=='string'||!report.sides)throw Error('Use a supported CardTruth inspection report.');
 if(report.receipt_sha256){let {receipt_sha256,hash_scope,...body}=report;let serialized=hash_scope===REPORT_HASH_SCOPE?stableStringify(body):JSON.stringify(body);let computed=await sha256(serialized);if(computed&&computed!==receipt_sha256)throw Error('Report checksum does not match. This file was modified after export.');}
 for(let key of ['front','back']){let s=report.sides[key];if(!s)continue;
  if(!/^data:image\/(png|jpeg|webp);base64,/.test(s.analysis_image??''))throw Error('Report is missing a safe embedded evidence image.');
  if(!Array.isArray(s.annotations)||s.annotations.length>200)throw Error('Invalid annotations.');
  for(let a of s.annotations)if(![a.x,a.y].every(v=>Number.isFinite(v)&&v>=0&&v<=1)||typeof a.kind!=='string'||a.kind.length>80||typeof a.note!=='string'||a.note.length>500)throw Error('Invalid annotation coordinates or text.');
 }
 return report;
}

// SHA-256 fallback for local documents without SubtleCrypto. Integrity only.
export function sha256Portable(input){
 const bytes=typeof input==='string'?new TextEncoder().encode(input):input instanceof Uint8Array?input:new Uint8Array(input);
 const size=Math.ceil((bytes.length+9)/64)*64,data=new Uint8Array(size);data.set(bytes);data[bytes.length]=128;const view=new DataView(data.buffer);
 view.setUint32(size-8,Math.floor(bytes.length/536870912));view.setUint32(size-4,(bytes.length*8)>>>0);
 const K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
 let H=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];const W=new Int32Array(64),rotr=(v,n)=>(v>>>n)|(v<<(32-n));
 for(let offset=0;offset<size;offset+=64){
  for(let i=0;i<16;i++)W[i]=view.getInt32(offset+4*i);
  for(let i=16;i<64;i++){let a=W[i-15],b=W[i-2],s0=rotr(a,7)^rotr(a,18)^(a>>>3),s1=rotr(b,17)^rotr(b,19)^(b>>>10);W[i]=(W[i-16]+s0+W[i-7]+s1)|0;}
  let [a,b,c,d,e,f,g,h]=H;
  for(let i=0;i<64;i++){let s1=rotr(e,6)^rotr(e,11)^rotr(e,25),ch=(e&f)^(~e&g),t1=(h+s1+ch+K[i]+W[i])|0,s0=rotr(a,2)^rotr(a,13)^rotr(a,22),maj=(a&b)^(a&c)^(b&c),t2=(s0+maj)|0;h=g;g=f;f=e;e=(d+t1)|0;d=c;c=b;b=a;a=(t1+t2)|0;}
  H=H.map((v,i)=>(v+[a,b,c,d,e,f,g,h][i])|0);
 }return H.map(v=>(v>>>0).toString(16).padStart(8,'0')).join('');
}
