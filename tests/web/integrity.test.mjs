import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {sha256Portable, stableStringify, REPORT_FORMAT_VERSION} from '../../apps/web/io.js';
for(const input of ['', 'abc', 'CardTruth 🃏', 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(64),'y'.repeat(5000)]){
 test(`portable SHA256 length ${input.length}`,()=>assert.equal(sha256Portable(input),createHash('sha256').update(input).digest('hex')));
}
test('binary image checksum matches Node crypto',()=>{const bytes=Uint8Array.from({length:100_000},(_,i)=>i%256);assert.equal(sha256Portable(bytes),createHash('sha256').update(bytes).digest('hex'));});

test('stable report serialization ignores object key insertion order',()=>{
  const a={z:1,a:{y:2,x:3},arr:[{b:2,a:1},4]};
  const b={arr:[{a:1,b:2},4],a:{x:3,y:2},z:1};
  assert.equal(stableStringify(a),stableStringify(b));
});
test('stable report serialization preserves array order',()=>{
  assert.notEqual(stableStringify({x:[1,2]}),stableStringify({x:[2,1]}));
});
test('report format version is independent from app version',()=>{
  assert.equal(REPORT_FORMAT_VERSION,'1');
});

test('canonical report checksum survives key reordering',async()=>{
  const {readReport,sha256,REPORT_HASH_SCOPE}=await import('../../apps/web/io.js');
  const body={format:'cardtruth-inspection',format_version:'1',version:'99.0.0',scan_id:'x1',sides:{front:null,back:null}};
  const receipt={sides:body.sides,scan_id:body.scan_id,version:body.version,format_version:body.format_version,format:body.format,
    receipt_sha256:await sha256(stableStringify(body)),hash_scope:REPORT_HASH_SCOPE};
  const file=new File([JSON.stringify(receipt)],'reordered.ctscan.json',{type:'application/json'});
  const parsed=await readReport(file);
  assert.equal(parsed.scan_id,'x1');
});

test('legacy 0.2.0 report envelope remains readable',async()=>{
  const {readReport}=await import('../../apps/web/io.js');
  const legacy={format:'cardtruth-inspection',version:'0.2.0',scan_id:'legacy',sides:{front:null,back:null}};
  const file=new File([JSON.stringify(legacy)],'legacy.ctscan.json',{type:'application/json'});
  const parsed=await readReport(file);
  assert.equal(parsed.scan_id,'legacy');
});
