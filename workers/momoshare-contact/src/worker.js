const ALLOWED_ORIGINS=new Set(['https://yenhaitran.com','https://www.yenhaitran.com']);
const cors=o=>({'Access-Control-Allow-Origin':ALLOWED_ORIGINS.has(o)?o:'https://yenhaitran.com','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'});
const json=(b,s,o)=>new Response(JSON.stringify(b),{status:s,headers:{'Content-Type':'application/json; charset=utf-8',...cors(o)}});
export default{async fetch(request,env){
 const url=new URL(request.url);
  const origin=request.headers.get('Origin')||'';
   if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors(origin)});
    if(request.method!=='POST'||url.pathname!=='/')return json({ok:false,error:'Not found'},404,origin);
     if(!ALLOWED_ORIGINS.has(origin))return json({ok:false,error:'Origin not allowed'},403,origin);
      if(!env.TELEGRAM_BOT_TOKEN||!env.TELEGRAM_CHAT_ID)return json({ok:false,error:'Service not configured'},503,origin);
       let body;try{body=await request.json()}catch{return json({ok:false,error:'Invalid JSON'},400,origin)}
        if(body.website)return json({ok:true},200,origin);
         const type=String(body.type||'Liên hệ').slice(0,80),name=String(body.name||'').trim().slice(0,120),phone=String(body.phone||'').trim().slice(0,80),email=String(body.email||'').trim().slice(0,160),message=String(body.message||'').trim().slice(0,2000);
          if(!name||!phone)return json({ok:false,error:'Vui lòng nhập họ tên và số điện thoại/Zalo.'},400,origin);
           const text=['📩 Liên hệ mới từ yenhaitran.com','','Nhu cầu: '+type,'Họ tên: '+name,'Điện thoại/Zalo: '+phone,email?'Email: '+email:'',message?'Nội dung: '+message:''].filter(Boolean).join('\n');
            const tg=await fetch('https://api.telegram.org/bot'+env.TELEGRAM_BOT_TOKEN+'/sendMessage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:env.TELEGRAM_CHAT_ID,text})});
             if(!tg.ok)return json({ok:false,error:'Không thể gửi thông tin.'},502,origin);
              return json({ok:true},200,origin);
              }};