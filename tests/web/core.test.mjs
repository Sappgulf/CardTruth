import test from 'node:test';
import assert from 'node:assert/strict';
const m = await import('../../apps/web/core.js').catch(()=>({}));
test('measurement engine exists',()=>assert.equal(typeof m.axisMeasurement,'function'));
test('known 55/45 widths',()=>assert.deepEqual(m.axisMeasurement(55,45,0).pair,[55,45]));
test('scale invariant ratio',()=>assert.equal(m.axisMeasurement(110,90).major,m.axisMeasurement(55,45).major));
test('zero border rejected',()=>assert.throws(()=>m.axisMeasurement(0,1)));
test('NaN border rejected',()=>assert.throws(()=>m.axisMeasurement(NaN,1)));
test('negative uncertainty rejected',()=>assert.throws(()=>m.axisMeasurement(40,40,-1)));
test('centered uncertainty includes 50',()=>assert.equal(m.axisMeasurement(40,40,2).major_interval[0],50));
test('uncertainty prevents a false pass',()=>assert.equal(m.assessInterval([54,56],55),'boundary_uncertain'));
test('clear outside',()=>assert.equal(m.assessInterval([57,60],55),'outside_published_guideline'));
test('known inside',()=>assert.equal(m.assessInterval([50,54],55),'within_published_guideline'));
test('invalid quad rejected',()=>assert.throws(()=>m.validateQuad([[0,0],[0,0],[1,1],[0,1]])));
test('crossed outline rejected',()=>assert.throws(()=>m.validateQuad([[0,0],[5,5],[0,5],[5,0]])));
test('homography maps all four corners',()=>{
 const q=[[10,20],[210,30],[200,320],[20,310]];const h=m.homography(q);
 [[0,0],[1,0],[1,1],[0,1]].forEach((uv,i)=>{let p=m.project(h,...uv);assert.ok(Math.hypot(p[0]-q[i][0],p[1]-q[i][1])<1e-7);});
});
function fixture(w=400,h=540){let d=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){
 let color=x>=65&&x<=335&&y>=60&&y<=480?[220,185,60]:[20,23,30];
 if(x>81&&x<320&&y>80&&y<460)color=[40,70,120];let i=(y*w+x)*4;d.set([...color,255],i);
 }return {width:w,height:h,data:d};}
test('real pixels yield a card proposal',()=>{let q=m.proposeQuad(fixture());assert.equal(q.length,4);assert.ok(Math.abs(q[0][0]-65)<8);});
test('blank pixels are not a card',()=>{const f=fixture();f.data.fill(0);assert.equal(m.proposeQuad(f),null);});
test('rectification produces valid data',()=>{const f=fixture();let out=m.rectify(f,[[65,60],[335,60],[335,480],[65,480]],600);assert.equal(out.data.length,out.width*out.height*4);assert.ok(out.width<=270);});
test('border proposal on uniform bordered card',()=>{
 let f=fixture();let out=m.rectify(f,[[65,60],[335,60],[335,480],[65,480]],500);let b=m.proposeBorder(out);assert.ok(b.left>5&&b.left<35);assert.ok(b.right>5&&b.right<35);
});
test('quality metrics flag under-resolution',()=>assert.ok(m.quality(fixture()).issues.some(x=>x.code==='resolution')));
test('blank image does not get quality approval',()=>{let f=fixture();f.data.fill(0);assert.equal(m.quality(f).usable,false);});
test('same measurements produce deterministic results',()=>assert.deepEqual(m.axisMeasurement(23,27,2),m.axisMeasurement(23,27,2)));
