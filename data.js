const CFG=window.VOXEL||{};
let PROXY=null;
const pic=u=>PROXY&&u?"https://wsrv.nl/?url="+encodeURIComponent(u):u;
const probe=u=>new Promise(r=>{const i=new Image(),t=setTimeout(()=>r(false),4500);i.onload=()=>{clearTimeout(t);r(true)};i.onerror=()=>{clearTimeout(t);r(false)};i.src=u});
const kget=k=>{try{return JSON.parse(localStorage.getItem(k)||"{}")}catch(e){return {}}};
const kset=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const GEN={28:"Action",12:"Adventure",16:"Animation",35:"Comedy",80:"Crime",99:"Documentary",18:"Drama",10751:"Family",14:"Fantasy",36:"History",27:"Horror",10402:"Music",9648:"Mystery",10749:"Romance",878:"Sci-Fi",53:"Thriller",10752:"War",37:"Western",10759:"Action",10765:"Sci-Fi",10762:"Family",10768:"War",10764:"Reality",10766:"Drama"};
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const clean=t=>t.replace(/[\s(\[-]+$/,"").trim();
function parseName(file){
  const n=file.replace(/\.[^.]+$/,"").replace(/[._]+/g," ");
  const tv=n.match(/^(.*?)[\s-]*S(\d{1,2})\s?E(\d{1,3})/i);
  if(tv)return{tv:true,title:clean(tv[1])||n,s:+tv[2],e:+tv[3]};
  const m=n.match(/^(.*?)[\s(\[-]*((?:19|20)\d{2})(?!\d)/);
  const title=m?m[1]:n.replace(/\b(2160p|1080p|720p|480p|4k|bluray|brrip|webrip|web-dl|hdrip|x264|x265|hevc)\b.*$/i,"");
  return{tv:false,title:clean(title)||n.trim(),year:m?m[2]:""};
}
async function lookup(it){
  const base={title:it.title,year:it.year||"",genre:"Other",rating:"",overview:"",poster:"",backdrop:"",tmdb:""};
  try{
    const kind=it.type==="tv"?"tv":"movie";
    const yr=it.year?(kind==="tv"?"&first_air_date_year=":"&year=")+it.year:"";
    const r=await fetch(`https://api.themoviedb.org/3/search/${kind}?api_key=${CFG.TMDB_KEY}&query=${encodeURIComponent(it.title)}${yr}`);
    const hit=((await r.json()).results||[])[0];if(!hit)return base;
    return{...base,title:hit.title||hit.name||it.title,year:(hit.release_date||hit.first_air_date||it.year||"").slice(0,4),genre:GEN[(hit.genre_ids||[])[0]]||"Other",rating:hit.vote_average?hit.vote_average.toFixed(1):"",overview:hit.overview||"",poster:hit.poster_path?"https://image.tmdb.org/t/p/w500"+hit.poster_path:"",backdrop:hit.backdrop_path?"https://image.tmdb.org/t/p/w1280"+hit.backdrop_path:"",tmdb:String(hit.id)};
  }catch(e){return base}
}
async function getMovies(){
  if(!CFG.TMDB_KEY||!CFG.GOOGLE_API_KEY||!CFG.FOLDER_ID)throw new Error("Your keys are missing. Open config.js and fill in TMDB_KEY, GOOGLE_API_KEY and FOLDER_ID.");
  const q=encodeURIComponent(`'${CFG.FOLDER_ID}' in parents and mimeType contains 'video/' and trashed=false`);
  const r=await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,createdTime)&pageSize=1000&orderBy=createdTime desc&key=${CFG.GOOGLE_API_KEY}`);
  if(!r.ok){let m="";try{m=((await r.json()).error||{}).message||""}catch(e){}throw new Error("Google Drive replied "+r.status+(m?": "+m:"."))}
  const files=(await r.json()).files||[],items=new Map();
  for(const f of files){
    const p=parseName(f.name);
    if(p.tv){const key="tv-"+slug(p.title);let it=items.get(key);
      if(!it){it={key,type:"tv",title:p.title,year:"",added:f.createdTime,episodes:[]};items.set(key,it)}
      it.episodes.push({id:f.id,s:p.s,e:p.e});if(f.createdTime>it.added)it.added=f.createdTime;
    }else items.set(f.id,{key:f.id,type:"movie",title:p.title,year:p.year,added:f.createdTime});
  }
  const meta=kget("vx-meta"),todo=[...items.values()].filter(it=>!meta[it.key]).slice(0,25);
  const fresh=await Promise.all(todo.map(lookup));
  todo.forEach((it,i)=>meta[it.key]=fresh[i]);if(todo.length)kset("vx-meta",meta);
  const movies=[];let pending=0;
  for(const it of items.values()){
    const m=meta[it.key];if(!m){pending++;continue}
    if(it.type==="tv")it.episodes.sort((a,b)=>a.s-b.s||a.e-b.e);
    movies.push({...m,id:it.key,type:it.type,added:it.added,views:0,episodes:it.episodes||[]});
  }
  if(PROXY===null){const s=movies.find(m=>m.poster||m.backdrop);if(s)PROXY=!(await probe(s.poster||s.backdrop))}
  return{movies,pending};
}
async function getDetails(type,tmdb){
  const kind=type==="tv"?"tv":"movie";
  const d=await(await fetch(`https://api.themoviedb.org/3/${kind}/${encodeURIComponent(tmdb)}?api_key=${CFG.TMDB_KEY}&append_to_response=videos,credits`)).json();
  const v=(d.videos&&d.videos.results)||[],t=v.find(x=>x.site==="YouTube"&&x.type==="Trailer")||v.find(x=>x.site==="YouTube");
  return{trailer:t?t.key:"",runtime:kind==="tv"?(d.episode_run_time||[])[0]||"":d.runtime||"",cast:((d.credits&&d.credits.cast)||[]).slice(0,6).map(c=>c.name)};
}
const streamUrl=id=>`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media&key=${CFG.GOOGLE_API_KEY}`;


(window.__f=window.__f||[]).push("data.js");
/*END*/
