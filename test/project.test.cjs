const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root=path.resolve(__dirname,'..');
const project=require('../project.json');
test('all declared application sources exist',()=>{for(const file of project.files) assert.ok(fs.statSync(path.join(root,file)).size>0,file);});
test('JavaScript sources and inline scripts parse',()=>{
 for(const file of project.files){
  const full=path.join(root,file);
  if(file.endsWith('.js')){const r=spawnSync(process.execPath,['--check',full],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);}
  if(file.endsWith('.html')){
   const text=fs.readFileSync(full,'utf8');
   for(const match of text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
    if(/\bsrc\s*=/.test(match[1])||/type=["'](?:importmap|application\/ld\+json)/.test(match[1]))continue;
    const module=/type=["']module/.test(match[1]);
    const r=spawnSync(process.execPath,['--check',...(module?['--input-type=module']:[])],{input:match[2],encoding:'utf8'});assert.equal(r.status,0,file+': '+r.stderr);
   }
  }
 }
});
test('local HTML assets and linked files resolve',()=>{
 for(const file of project.files.filter(x=>x.endsWith('.html'))){
  const full=path.join(root,file);const text=fs.readFileSync(full,'utf8');
  for(const m of text.matchAll(/(?:src|href)=["']([^"']+)["']/g)){
   const url=m[1];if(/^(?:https?:|data:|mailto:|tel:|#|\/\/)/.test(url)||url==='/')continue;
   const rel=url.split(/[?#]/)[0];if(!rel)continue;
   assert.ok(fs.existsSync(path.resolve(url.startsWith('/')?root:path.dirname(full),rel.replace(/^\//,''))),file+' references '+url);
  }
 }
});
