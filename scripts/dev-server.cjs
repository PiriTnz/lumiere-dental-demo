const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const manifest = require('../project.json');
const externalFetch = global.fetch;
if (process.env.ALLOW_EXTERNAL_REQUESTS !== '1') {
  global.fetch = async () => { throw new Error('External requests disabled. Configure sandbox credentials and ALLOW_EXTERNAL_REQUESTS=1 to enable.'); };
}
const types = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.glb':'model/gltf-binary','.json':'application/json'};
const server = http.createServer(async (req,res) => {
 try {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/.netlify/functions/')) {
   const name = url.pathname.slice('/.netlify/functions/'.length);
   if (!/^[a-z0-9-]+$/.test(name)) {res.writeHead(400);return res.end();}
   const file = path.join(root,'netlify/functions',name+'.js');
   if (!fs.existsSync(file)) {res.writeHead(404);return res.end();}
   let body='';
   for await (const part of req) {body+=part;if(Buffer.byteLength(body)>1e6){res.writeHead(413);return res.end();}}
   const result=await require(file).handler({httpMethod:req.method,headers:req.headers,body,queryStringParameters:Object.fromEntries(url.searchParams),isBase64Encoded:false});
   res.writeHead(result.statusCode,result.headers||{});return res.end(result.body||'');
  }
  let target=decodeURIComponent(url.pathname);
  if (target==='/' && manifest.entry) target='/'+manifest.entry;
  if (target==='/' && !manifest.entry) {res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify({name:manifest.name,endpoints:manifest.files.filter(p=>p.startsWith('netlify/functions/'))}));}
  const rel=target.replace(/^\/+/, '');
  if(rel.split('/').some(p=>p.startsWith('.'))){res.writeHead(404);return res.end();}
  const file=path.resolve(root,rel);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
 } catch(e) {res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}));}
});
server.listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log('Local preview: http://127.0.0.1:'+(process.env.PORT||4173)));
