const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const c={window:{}};vm.createContext(c);vm.runInContext(read('js/xsec.js'),c);
const XS=c.window.XS;let doseCases=0;
for(const species of ['B','P','As','BF2'])for(const E of [10,30,100])for(const channel of [0,.1,.2]){
 const sim=new XS.Sim({W:8,H:4000,dx:1,surf:0}),dose=1e14,r=sim.implant({species,E,dose,channel});
 const arr=r.type==='n'?sim.nd:sim.na;let total=0;for(const n of arr)total+=n*1e-7/8;
 // Gaussian loss at z<0 is physical; channeling redistributes the existing dose.
 let base=0;const dz=.02,lam=r.Rp*.8+2*r.dRp;
 for(let z=dz/2;z<r.Rp+12*r.dRp;z+=dz)base+=Math.exp(-.5*((z-r.Rp)/r.dRp)**2)/(Math.sqrt(2*Math.PI)*r.dRp)*dz;
 const expected=(1-channel)*base+channel;
 assert(Math.abs(total/dose-expected)<.003,`${species}/${E}/${channel}: ${total/dose} vs ${expected}`);doseCases++;
}
const cmp=read('chapters/cmp.html'),start=cmp.indexOf('    function calc(wum'),end=cmp.indexOf('    cv = PB.canvas',start);
vm.runInContext(cmp.slice(start,end),c);let cmpCases=0;
for(const w of [.05,2,50])for(const rho of [.1,.5,.9])for(const oe of [0,30,100])for(const S of [2,10,50]){
 const r=c.calc(w,rho,oe,S);assert(Number.isFinite(r.loss));assert.equal(r.open,r.ero+r.dish>=200);
 if(!r.open)assert(200/(200-r.loss)>=1);cmpCases++;
}
assert(c.calc(2,.9,100,2).open);assert(!c.calc(2,.5,30,10).open);
const anneal=read('chapters/anneal.html');const range=anneal.match(/<input[^>]*id="rt-s"[^>]*>/)[0];
assert(range.includes('min="-1"')&&range.includes('max="7"')&&range.includes('step="any"'));
let values={},callback;const PB={seg:(id,cb)=>{callback=cb;return()=>''},range:(id)=>{const g=()=>values[id];g.set=v=>values[id]=v;return g}};
const a=anneal.indexOf('    var PRE = { furn:'),b=anneal.indexOf('    cv = PB.canvas',a);
const ac={PB,Math,tf:x=>String(x),rr:()=>{}};vm.createContext(ac);vm.runInContext(anneal.slice(a,b),ac);
for(const [name,hold] of [['furn',1800],['rta',10],['spike',0],['flash',.001]]){
 callback(name);const p=ac.profile();assert(Math.abs(p.hold-hold)<=Math.max(1e-12,hold*1e-12));assert(p.total>=hold);
}
let scripts=0;for(const file of fs.readdirSync(path.join(root,'chapters')).filter(x=>x.endsWith('.html'))){for(const m of read('chapters/'+file).matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){if(m[1].includes('src='))continue;if(m[1].includes('ld+json'))JSON.parse(m[2]);else new vm.Script(m[2],{filename:file});scripts++;}}
console.log({doseCases,cmpCases,annealPresets:4,compiledScripts:scripts});
