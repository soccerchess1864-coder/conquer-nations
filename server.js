// Conquer Nations online server: serves the game page and relays players' messages.
const http=require('http'),fs=require('fs'),path=require('path'),{WebSocketServer}=require('ws');
const page=path.join(__dirname,'index.html');
const srv=http.createServer((req,res)=>{
  if(req.url==='/health'){res.end('ok');return}
  fs.readFile(page,(e,b)=>{if(e){res.writeHead(500);res.end('index.html is missing');return}
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(b)})});
const wss=new WebSocketServer({server:srv,maxPayload:8192});
const cl=new Map();let n=0,dirty=false;
wss.on('connection',ws=>{
  const id='p'+(++n).toString(36)+Math.random().toString(36).slice(2,6);
  cl.set(ws,{id,p:{},alive:true});ws.send(JSON.stringify({t:'hi',id}));
  ws.on('pong',()=>{const c=cl.get(ws);if(c)c.alive=true});
  ws.on('message',raw=>{let m;try{m=JSON.parse(raw)}catch(e){return}const c=cl.get(ws);if(!c)return;
    if(m.t==='p'&&m.p&&typeof m.p==='object'){c.p=m.p;dirty=true}
    else if(m.t==='e'&&typeof m.topic==='string'){const code=c.p.c;if(!code)return;
      const s=JSON.stringify({t:'ev',topic:m.topic,data:m.data,from:c.id});
      for(const[w,o]of cl)if(o.p.c===code&&w.readyState===1)w.send(s)}});
  ws.on('close',()=>{cl.delete(ws);dirty=true})});
setInterval(()=>{if(!dirty)return;dirty=false;const by={};
  for(const o of cl.values()){const k=o.p.c||('_'+o.id);(by[k]=by[k]||{})[o.id]=o.p}
  for(const[w,o]of cl)if(w.readyState===1)w.send(JSON.stringify({t:'ps',peers:by[o.p.c||('_'+o.id)]}))},100);
setInterval(()=>{for(const[w,o]of cl){if(!o.alive){w.terminate();continue}o.alive=false;w.ping()}},30000);
const port=process.env.PORT||3000;srv.listen(port,()=>console.log('Conquer Nations server on port '+port));
