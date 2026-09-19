import test from 'node:test';import assert from 'node:assert/strict';import {REFERENCES,standardsSummary} from '../../apps/web/core.js';
const m=(lr,tb)=>({lr:{major_interval:[lr,lr]},tb:{major_interval:[tb,tb]}});const check=(s,g,l)=>s.find(x=>x.id===g).checks.find(x=>x.label===l).status;
test('BGS table is present',()=>assert.ok(REFERENCES.bgs.rules.length>=11));
test('BGS 9.5 rejects 55/45 in both front directions',()=>{const s=standardsSummary(m(55,55),m(60,58));assert.equal(check(s,'bgs','Gem Mint 9.5'),'outside_published_guideline');assert.equal(check(s,'bgs','Mint 9'),'within_published_guideline');});
test('BGS 9.5 accepts exact 50/50 one way',()=>assert.equal(check(standardsSummary(m(50,55),m(60,58)),'bgs','Gem Mint 9.5'),'within_published_guideline'));
test('BGS exact 50 axis remains uncertain across 50',()=>{const f={lr:{major_interval:[50,50.4]},tb:{major_interval:[54.8,55]}};assert.equal(check(standardsSummary(f,m(59,58)),'bgs','Gem Mint 9.5'),'boundary_uncertain');});
