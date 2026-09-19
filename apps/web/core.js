/** Pure, dependency-free image geometry. All defect proposals require human review. */
export const VERSION = '0.2.1';
export const REFERENCES = {
 psa:{name:'PSA',url:'https://www.psacard.com/gradingstandards',reviewed:'2026-09-19',rules:[{label:'Gem Mint 10',front:55,back:75}]},
 cgc:{name:'CGC',url:'https://www.cgccards.com/card-grading/grading-scale/',reviewed:'2026-09-19',rules:[{label:'Gem Mint 10',front:55,back:75},{label:'Pristine 10',front:50,back:50}]},
 bgs:{name:'Beckett BGS',url:'https://www.beckett.com/grading/scale',reviewed:'2026-09-19',rules:[],note:'Official scale was unavailable at review. No unverified thresholds substituted.'}
};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function axisMeasurement(a,b,error=2){
 if(![a,b,error].every(Number.isFinite)||a<=0||b<=0||error<0||error>100)throw Error('Use positive border widths and an assumed error of 0–100 pixels.');
 const p=100*a/(a+b),lo=100*Math.max(0,a-error)/(Math.max(0,a-error)+b+error),hi=100*(a+error)/(a+error+Math.max(0,b-error));
 return {pair:[p,100-p],major:Math.max(p,100-p),major_interval:[lo<=50&&hi>=50?50:Math.min(Math.max(lo,100-lo),Math.max(hi,100-hi)),Math.max(hi,100-lo)],assumed_border_width_error_px:error,uncertainty_type:'sensitivity_bound_not_calibrated_CI'};
}
export function assessInterval([lo,hi],limit){
 if(![lo,hi,limit].every(Number.isFinite)||lo>hi)throw Error('Invalid interval');
 return hi<=limit?'within_published_guideline':lo>limit?'outside_published_guideline':'boundary_uncertain';
}
export function validateQuad(q){
 if(!Array.isArray(q)||q.length!==4||q.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)))throw Error('Four finite corners required.');
 let signs=[];let area=0;
 for(let i=0;i<4;i++){
  let a=q[i],b=q[(i+1)%4],c=q[(i+2)%4];
  signs.push((b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]));
  area+=a[0]*b[1]-a[1]*b[0];
 }
 if(!(signs.every(x=>x>1e-7)||signs.every(x=>x< -1e-7))||Math.abs(area)<2)throw Error('Keep four distinct corners in order without crossing the outline.');
 return true;
}
export function orderQuad(q){
 const c=q.reduce((a,p)=>[a[0]+p[0]/4,a[1]+p[1]/4],[0,0]);
 const sorted=q.map(p=>[...p]).sort((a,b)=>Math.atan2(a[1]-c[1],a[0]-c[0])-Math.atan2(b[1]-c[1],b[0]-c[0]));
 let k=sorted.reduce((best,p,i)=>p[0]+p[1]<sorted[best][0]+sorted[best][1]?i:best,0);
 const result=sorted.slice(k).concat(sorted.slice(0,k));validateQuad(result);return result;
}
export function homography(q){
 validateQuad(q);const A=[];
 [[0,0],[1,0],[1,1],[0,1]].forEach(([x,y],i)=>{let [u,v]=q[i];A.push([x,y,1,0,0,0,-u*x,-u*y,u]);A.push([0,0,0,x,y,1,-v*x,-v*y,v]);});
 for(let i=0;i<8;i++){
  let pivot=i;for(let j=i+1;j<8;j++)if(Math.abs(A[j][i])>Math.abs(A[pivot][i]))pivot=j;
  if(Math.abs(A[pivot][i])<1e-10)throw Error('Outline cannot be rectified.');
  [A[i],A[pivot]]=[A[pivot],A[i]];let d=A[i][i];for(let k=i;k<9;k++)A[i][k]/=d;
  for(let j=0;j<8;j++)if(j!==i){let f=A[j][i];for(let k=i;k<9;k++)A[j][k]-=f*A[i][k];}
 }
 return [...A.map(row=>row[8]),1];
}
export function project(h,x,y){let d=h[6]*x+h[7]*y+1;if(Math.abs(d)<1e-9)throw Error('Projection is singular.');return [(h[0]*x+h[1]*y+h[2])/d,(h[3]*x+h[4]*y+h[5])/d];}
function checkImage(im){if(!im||!Number.isInteger(im.width)||!Number.isInteger(im.height)||Math.min(im.width,im.height)<2||!im.data||im.data.length!==im.width*im.height*4)throw Error('Invalid image pixels.');}
export function rectify(im,q,maxHeight=1600){
 checkImage(im);validateQuad(q);
 if(q.some(([x,y])=>x<0||y<0||x>im.width-1||y>im.height-1))throw Error('Keep the outline inside the photograph.');
 const len=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
 const nh=Math.min(len(q[0],q[3]),len(q[1],q[2])),nw=Math.min(len(q[0],q[1]),len(q[3],q[2]));
 const height=Math.floor(Math.min(maxHeight,nh,nw*88/63)),width=Math.floor(height*63/88);
 if(Math.min(width,height)<16)throw Error('Card covers too few pixels. Take a closer photograph.');
 const out=new Uint8ClampedArray(width*height*4),h=homography(q),s=im.data,sw=im.width;
 for(let y=0;y<height;y++){let v=y/(height-1);for(let x=0;x<width;x++){
  let u=x/(width-1),z=h[6]*u+h[7]*v+1;
  let sx=clamp((h[0]*u+h[1]*v+h[2])/z,0,im.width-1),sy=clamp((h[3]*u+h[4]*v+h[5])/z,0,im.height-1);
  let x0=Math.floor(sx),y0=Math.floor(sy),x1=Math.min(x0+1,sw-1),y1=Math.min(y0+1,im.height-1),fx=sx-x0,fy=sy-y0;
  let a=(y0*sw+x0)*4,b=(y0*sw+x1)*4,c=(y1*sw+x0)*4,d=(y1*sw+x1)*4,j=(y*width+x)*4;
  for(let k=0;k<3;k++)out[j+k]=(s[a+k]*(1-fx)+s[b+k]*fx)*(1-fy)+(s[c+k]*(1-fx)+s[d+k]*fx)*fy;
  out[j+3]=255;
 }}return {width,height,data:out,native_short_edge:Math.min(nh,nw),geometry:'nominal_aspect_rectification_not_size_measurement'};
}
export function proposeQuad(im){
 checkImage(im);const scale=Math.min(1,320/Math.max(im.width,im.height)),w=Math.round(im.width*scale),h=Math.round(im.height*scale);
 const rgb=new Uint8Array(w*h*3);const samples=[[],[],[]];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  let src=(Math.min(im.height-1,Math.floor(y/scale))*im.width+Math.min(im.width-1,Math.floor(x/scale)))*4,j=(y*w+x)*3;
  for(let k=0;k<3;k++){rgb[j+k]=im.data[src+k];if((x<6||x>=w-6)&&(y<6||y>=h-6))samples[k].push(rgb[j+k]);}
 }
 let bg=samples.map(a=>a.sort((a,b)=>a-b)[Math.floor(a.length/2)]);let mask=new Uint8Array(w*h);
 for(let i=0;i<w*h;i++)if(Math.hypot(rgb[3*i]-bg[0],rgb[3*i+1]-bg[1],rgb[3*i+2]-bg[2])>46)mask[i]=1;
 const queue=new Int32Array(w*h);let best=[];
 for(let i=0;i<w*h;i++)if(mask[i]){
  let head=0,tail=1;queue[0]=i;mask[i]=0;
  while(head<tail){let p=queue[head++],x=p%w;
   for(let n of [x>0?p-1:-1,x<w-1?p+1:-1,p>=w?p-w:-1,p<w*(h-1)?p+w:-1])if(n>=0&&mask[n]){mask[n]=0;queue[tail++]=n;}
  }
  if(tail>best.length)best=Array.from(queue.subarray(0,tail));
 }
 if(best.length<w*h*.07||best.length>w*h*.96)return null;
 let q=[null,null,null,null],scores=[Infinity,-Infinity,-Infinity,Infinity];
 for(let p of best){let x=p%w,y=Math.floor(p/w),s=x+y,d=x-y;
  if(s<scores[0]){scores[0]=s;q[0]=[x/scale,y/scale];}
  if(d>scores[1]){scores[1]=d;q[1]=[x/scale,y/scale];}
  if(s>scores[2]){scores[2]=s;q[2]=[x/scale,y/scale];}
  if(d<scores[3]){scores[3]=d;q[3]=[x/scale,y/scale];}
 }
 try{validateQuad(q);return q;}catch{return null;}
}
export function proposeBorder(im){
 checkImage(im);let w=im.width,h=im.height,data=im.data;
 function edge(side){
  const along=side<2?h:w,depth=side<2?w:h,max=Math.floor(depth*.16),profile=[];
  for(let d=1;d<=max;d++){
   let vals=[[],[],[]];for(let t=Math.floor(along*.22);t<along*.78;t+=Math.max(1,Math.floor(along/160))){
    let x=side===0?d:side===1?w-1-d:t,y=side===2?d:side===3?h-1-d:t,j=(y*w+x)*4;
    for(let k=0;k<3;k++)vals[k].push(data[j+k]);
   }profile.push(vals.map(a=>a.sort((a,b)=>a-b)[Math.floor(a.length/2)]));
  }
  const baseline=profile[Math.min(2,profile.length-1)];let chosen=null;
  for(let i=3;i<profile.length-2;i++){
   let d=Math.hypot(...profile[i].map((v,k)=>v-baseline[k]));
   let next=Math.hypot(...profile[i+2].map((v,k)=>v-baseline[k]));
   if(d>32&&next>32){chosen=i+1;break;}
  }return chosen;
 }
 let values=[0,1,2,3].map(edge);
 return {left:values[0]??w*.045,right:values[1]??w*.045,top:values[2]??h*.035,bottom:values[3]??h*.035,suggested:values.every(v=>v!==null),method:'color_transition_proposal_requires_confirmation'};
}
export function quality(im){
 checkImage(im);const w=im.width,h=im.height,s=im.data;const st=Math.max(1,Math.floor(Math.max(w,h)/800));
 let n=0,total=0,clipped=0,dark=0,ls=0,l2=0;
 const gray=(x,y)=>{let p=(y*w+x)*4;return .2126*s[p]+.7152*s[p+1]+.0722*s[p+2];};
 for(let y=st;y<h-st;y+=st)for(let x=st;x<w-st;x+=st){let j=(y*w+x)*4,g=gray(x,y),lap=4*g-gray(x-st,y)-gray(x+st,y)-gray(x,y-st)-gray(x,y+st);
  n++;total+=g;ls+=lap;l2+=lap*lap;if(Math.min(s[j],s[j+1],s[j+2])>=250)clipped++;if(g<15)dark++;
 }
 const lap=n?Math.max(0,l2/n-(ls/n)**2):0,issues=[];const short=Math.min(w,h);
 if(short<600)issues.push({code:'resolution',level:short<350?'block':'warning',text:`Only ${short} pixels across the short edge. Use a closer, higher-resolution photo.`});
 if(lap<30)issues.push({code:'sharpness',level:lap<3?'block':'warning',text:'Low image detail. This may be blur or a plain area; check the original at full size.'});
 if(n&&clipped/n>.08)issues.push({code:'clipping',level:'warning',text:'Bright pixels may hide detail. White printing can also trigger this warning; inspect for glare.'});
 if(n&&total/n<20)issues.push({code:'exposure',level:'block',text:'Image is too dark for reliable inspection. Retake with diffuse light.'});
 return {usable:!issues.some(i=>i.level==='block'),issues,short_edge_px:short,laplacian_variance:lap,clipped_fraction:n?clipped/n:0,mean_luminance:n?total/n:0,note:'Heuristic quality checks, not calibrated accuracy or defect coverage.'};
}
export function edgeCandidates(im){
 checkImage(im);const w=im.width,h=im.height,s=im.data,band=Math.max(4,Math.round(w*.022));let hits=[];
 const step=Math.max(1,Math.floor(w/650));
 for(let y=3;y<h-3;y+=step)for(let x=3;x<w-3;x+=step){
  if(x>band&&x<w-1-band&&y>band&&y<h-1-band)continue;
  let j=(y*w+x)*4;let mx=Math.max(s[j],s[j+1],s[j+2]),mn=Math.min(s[j],s[j+1],s[j+2]);
  if(mn<218||mx-mn>30)continue;
  let avg=0,count=0;
  for(let [dx,dy] of [[-band,0],[band,0],[0,-band],[0,band]]){let nx=clamp(x+dx,1,w-2),ny=clamp(y+dy,1,h-2),p=(ny*w+nx)*4;avg+=(s[p]+s[p+1]+s[p+2])/3;count++;}
  if(mn-avg/count<38)continue;
  if(!hits.some(p=>Math.hypot(p.x*w-x,p.y*h-y)<band*2))hits.push({id:`suggestion-${hits.length+1}`,x:x/w,y:y/h,label:'Bright edge spot',evidence:'inferred',note:'Contrast suggestion only. Could be reflection, printing or wear; inspect the original.'});
  if(hits.length>=12)return hits;
 }return hits;
}
export function standardsSummary(front,back){
 return Object.entries(REFERENCES).map(([id,p])=>({id,name:p.name,source:p.url,reviewed_at:p.reviewed,scope:'centering_only',grade_withheld:true,
  checks:p.rules.map(rule=>{
   if(!front||!back)return {label:rule.label,status:'not_measured',front_limit:rule.front,back_limit:rule.back};
   const f=[Math.max(front.lr.major_interval[0],front.tb.major_interval[0]),Math.max(front.lr.major_interval[1],front.tb.major_interval[1])];
   const b=[Math.max(back.lr.major_interval[0],back.tb.major_interval[0]),Math.max(back.lr.major_interval[1],back.tb.major_interval[1])];
   let states=[assessInterval(f,rule.front),assessInterval(b,rule.back)];
   return {label:rule.label,status:states.includes('outside_published_guideline')?'outside_published_guideline':states.includes('boundary_uncertain')?'boundary_uncertain':'within_published_guideline',front_limit:rule.front,back_limit:rule.back};
  }),note:p.note??'Approximate published guidelines only. Meeting centering does not establish the grade.'}));
}
