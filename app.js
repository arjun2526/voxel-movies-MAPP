const API="";
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const hue=s=>{let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))%360;return h};
const norm=m=>({id:String(m.id),type:m.type||"movie",title:m.title,year:m.year||"",genre:m.genre||"Other",rating:m.rating||"",overview:m.overview||"",poster:m.poster||"",backdrop:m.backdrop||"",tmdb:m.tmdb||"",added:m.added||"",views:m.views||0,episodes:m.episodes||[],h:[hue(m.title),(hue(m.title)+330)%360]});
let firstAnim=false,M=[],err="",loaded=false,live=false,tab="home",filt="all",sq="",sg="",fav=new Set(),cur=null,sig="",ht=0,lastTouch=0;
try{fav=new Set(JSON.parse(localStorage.getItem("vx-fav")||"[]"))}catch(e){}
const saveFav=()=>{try{localStorage.setItem("vx-fav",JSON.stringify([...fav]))}catch(e){}};
const grad=m=>`linear-gradient(155deg,hsl(${m.h[0]} 85% 38%),hsl(${m.h[1]} 80% 9%) 75%)`;
const img=(u,m)=>u?`url('${esc(pic(u))}'),${grad(m)}`:grad(m);
const lab=m=>m.type==="tv"?"TV Show":"Movie";
const byNew=(a,b)=>String(b.added).localeCompare(String(a.added));
const gens=a=>[...new Set(a.map(m=>m.genre))].sort();
const fmtN=n=>n>=1e6?(n/1e6).toFixed(1)+"M":n>=1e3?(n/1e3).toFixed(1)+"K":String(n);
const ICO={home:'<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',search:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',list:'<svg viewBox="0 0 24 24"><path d="M6 4h12a1 1 0 0 1 1 1v16l-7-4-7 4V5a1 1 0 0 1 1-1z"/></svg>'};
const TABS=[["home","Home"],["search","Search"],["list","My List"]];

async function pull(){
  const d=await getMovies();M=d.movies.map(norm);live=true;loaded=true;err="";render();if(!firstAnim&&M.length){firstAnim=true;animIn("fade")}return d.pending;
}
async function load(){
  try{for(let i=0;i<15;i++){if(!await pull())break;await new Promise(r=>setTimeout(r,900))}
    setInterval(()=>pull().catch(()=>{}),60000)}catch(e){err=(e&&e.message)||"Could not load your library.";loaded=true;sig="";render()}
}
const pc=m=>`<button class="pc" data-id="${esc(m.id)}" style="background-image:${img(m.poster,m)}" aria-label="${esc(m.title)}">${m.poster?"":`<span class="pt">${esc(m.title)}</span>`}${m.rating?`<span class="rb">★ ${esc(m.rating)}</span>`:""}</button>`;
const row=(t,a)=>a.length?`<section class="row"><h2>${t}</h2><div class="rail">${a.map(pc).join("")}</div></section>`:"";
const tile=g=>`<button class="gt" data-g="${esc(g)}" style="--h:${(340+hue(g)%50)%360}">${esc(g)}<small>${M.filter(m=>m.genre===g).length} titles</small></button>`;
const ago=d=>{const n=Math.floor((Date.now()-new Date(d))/864e5);return isNaN(n)?"Just added":n<=0?"Added today":n===1?"Added yesterday":`Added ${n} days ago`};
function hero(l){
  return `<div class="hs" id="hs">${l.map(f=>`<article class="slide" style="background-image:${img(f.poster||f.backdrop,f)}"><div class="sin"><span class="new">NEW · ${esc(ago(f.added))}</span><h2>${esc(f.title)}</h2><div class="sm">${esc(f.genre)} · ${esc(lab(f))}${f.year?" · "+esc(f.year):""}${f.rating?" · ★ "+esc(f.rating):""}</div><div class="sbn"><button class="b play" data-id="${esc(f.id)}" data-play="1">▶ Play</button><button class="b glass" data-id="${esc(f.id)}">More Info</button></div></div></article>`).join("")}</div><div class="dots" id="dots">${l.map((_,i)=>`<i class="${i?"":"on"}"></i>`).join("")}</div>`;
}
function initHero(){
  clearInterval(ht);const hs=$("#hs");if(!hs)return;
  const dots=[...document.querySelectorAll("#dots i")],w=()=>hs.firstElementChild.offsetWidth+12;
  hs.onscroll=()=>{const i=Math.round(hs.scrollLeft/w());dots.forEach((d,j)=>d.classList.toggle("on",j===i))};
  hs.ontouchstart=()=>{lastTouch=Date.now()};
  ht=setInterval(()=>{if(document.hidden||Date.now()-lastTouch<8000||!$("#hs"))return;const n=hs.children.length,i=Math.round(hs.scrollLeft/w());hs.scrollTo({left:((i+1)%n)*w(),behavior:"smooth"})},6000);
}
function home(){
  const list=filt==="all"?M:M.filter(m=>m.type===filt);
  if(!list.length)return `<div class="chips">${chips()}</div><div class="msg"><h3>Nothing here yet</h3>No titles in this category.</div>`;
  const news=list.slice().sort(byNew),top=list.slice().sort((a,b)=>b.views-a.views||b.rating-a.rating);
  let h=`<div class="chips">${chips()}</div>`+hero(news.slice(0,5));
  h+=`<section class="row"><h2><b>Trending on Voxel</b> · Top 10 in India</h2><div class="rail t10">${top.slice(0,10).map((m,i)=>`<div class="it"><span class="num">${i+1}</span>${pc(m)}</div>`).join("")}</div></section>`;
  h+=row("New on Voxel",news.slice(5,20));
  h+=`<section class="row"><h2>Browse genres</h2><div class="rail">${gens(list).map(tile).join("")}</div></section>`;
  h+=row("Top Rated",list.slice().sort((a,b)=>b.rating-a.rating).slice(0,14));
  if(filt==="all")h+=row("TV Shows",M.filter(m=>m.type==="tv"));
  gens(list).forEach(g=>{h+=row(g,list.filter(m=>m.genre===g))});
  return h;
}
const chips=()=>[["all","All"],["movie","Movies"],["tv","TV Shows"]].map(([k,l])=>`<button data-f="${k}" class="${filt===k?"on":""}">${l}</button>`).join("");
function searchShell(){
  $("#main").innerHTML=`<div class="pg"><h1>Search</h1><div class="sbar"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="sq" type="search" placeholder="Movies, shows, genres" value="${esc(sq)}" autocomplete="off" enterkeyhint="search"><button id="sx" aria-label="Clear" style="display:${sq?"block":"none"}">✕</button></div><div id="sres"></div></div>`;
  fillSearch();
}
function fillSearch(){
  const q=sq.toLowerCase(),r=$("#sres");if(!r)return;
  const grid=a=>a.length?`<div class="g3">${a.map(pc).join("")}</div>`:`<div class="msg"><h3>No results</h3>Try another title or genre.</div>`;
  if(q){r.innerHTML=grid(M.filter(m=>m.title.toLowerCase().includes(q)||m.genre.toLowerCase().includes(q)))}
  else if(sg){r.innerHTML=`<h1 style="font-size:22px;margin:0 0 14px;display:flex;gap:12px;align-items:center">${esc(sg)} <button data-g="" style="font-size:12.5px;font-weight:600;padding:6px 12px;border-radius:99px;background:rgba(255,255,255,.1);border:1px solid var(--line)">All genres</button></h1>`+grid(M.filter(m=>m.genre===sg))}
  else r.innerHTML=`<h2 style="font-size:17px;font-weight:600;margin-bottom:12px">Browse categories</h2><div class="g2">${gens(M).map(tile).join("")}</div>`;
  const x=$("#sx");if(x)x.style.display=sq?"block":"none";
}
function listView(){
  const a=M.filter(m=>fav.has(m.id));
  return `<div class="pg"><h1>My List</h1>${a.length?`<div class="g3">${a.map(pc).join("")}</div>`:`<div class="msg"><h3>Nothing saved yet</h3>Open a title and tap “+ My List”.</div>`}</div>`;
}
function render(){
  const s=M.map(m=>m.id+":"+m.views).join()+tab+filt+sg+[...fav].join()+err+loaded;if(s===sig)return;sig=s;
  syncTabs();
  clearInterval(ht);const mn=$("#main");
  if(!M.length){mn.innerHTML=`<div class="msg"><h3>${err?"Couldn’t load your library":loaded?"Your library is empty":"Loading your library…"}</h3>${err?esc(err):loaded?"Upload an MP4 named like “Inception 2010.mp4” to your Drive folder, then refresh.":"Fetching titles from Google Drive and TMDB."}</div>`;return}
  if(tab==="home"){mn.innerHTML=home();initHero()}
  else if(tab==="search")searchShell();
  else mn.innerHTML=listView();
}
function openCard(id){
  const m=M.find(x=>x.id===id);if(!m)return;cur=m;
  const eps=m.type==="tv"&&m.episodes.length?`<div class="eps">${m.episodes.map(e=>`<button data-ep="${esc(e.id)}">S${e.s} · E${e.e}</button>`).join("")}</div>`:"";
  $("#sh").innerHTML=`<div class="grab" id="grab"><i></i></div><button class="cl" id="cl" aria-label="Close">✕</button><div class="shm" id="media" style="background-image:${img(m.backdrop||m.poster,m)}"><div class="note" id="note">Loading trailer…</div></div><div class="shb"><h3>${esc(m.title)}</h3><div class="meta"><span class="tag">${esc(m.genre)}</span><span>${esc(lab(m))}</span><span>${esc(m.year)}</span>${m.rating?`<span>★ ${esc(m.rating)}</span>`:""}</div><div class="acts"><button class="b play" id="wn">▶ Watch Now</button><button class="b glass" id="fv">${fav.has(m.id)?"✓ My List":"+ My List"}</button></div><p>${esc(m.overview)||"No description found for this title."}</p><div class="det"><div><span>Rating</span><b>${m.rating?"★ "+esc(m.rating)+" / 10":"Not rated"}</b></div><div><span>Year</span><b>${esc(m.year)||"—"}</b></div><div><span>Runtime</span><b id="rt">—</b></div><div><span>Watched</span><b>${fmtN(m.views)} times</b></div><div style="grid-column:1/-1"><span>Cast</span><b id="cast">—</b></div></div>${eps}</div>`;
  $("#sv").classList.add("open");$("#sh").classList.add("open");$("#sh").scrollTop=0;document.body.style.overflow="hidden";
  $("#wn").onclick=()=>watch();
  $("#fv").onclick=()=>{fav.has(m.id)?fav.delete(m.id):fav.add(m.id);saveFav();$("#fv").textContent=fav.has(m.id)?"✓ My List":"+ My List";sig="";if(tab==="list")render()};
  if(live&&m.tmdb){
    getDetails(m.type,m.tmdb).then(d=>{
      if(cur!==m)return;
      $("#rt").textContent=d.runtime?d.runtime+" min":"—";$("#cast").textContent=(d.cast||[]).join(", ")||"—";
      if(d.trailer)$("#media").innerHTML=`<iframe src="https://www.youtube.com/embed/${encodeURIComponent(d.trailer)}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1" allow="autoplay; encrypted-media; fullscreen" allowfullscreen title="Trailer"></iframe>`;
      else $("#note").textContent="No trailer found for this title.";
    }).catch(()=>{const n=$("#note");if(n)n.textContent="Trailer unavailable."});
  }else $("#note").textContent=live?"No trailer found for this title.":"Trailer appears once TMDB is connected.";
}
function shut(){
  $("#sv").classList.remove("open");$("#sh").classList.remove("open");cur=null;
  if(!$("#pl").classList.contains("open"))document.body.style.overflow="";
  setTimeout(()=>{if(!cur)$("#sh").innerHTML=""},400);
}
document.addEventListener("click",e=>{
  const t=e.target;let b;
  if(t.id==="sv"||t.closest("#cl"))return shut();
  if(b=t.closest("[data-ep]"))return watch(b.dataset.ep);
  if(b=t.closest("[data-id]")){if(b.dataset.play){cur=M.find(x=>x.id===b.dataset.id);return watch()}return openCard(b.dataset.id)}
  if(b=t.closest("[data-t]")){if(e.detail===0)switchTab(b.dataset.t);return}
  if(b=t.closest("[data-f]")){filt=b.dataset.f;sig="";render();return animIn("fade")}
  if(b=t.closest("[data-g]")){tab="search";sg=b.dataset.g;sq="";scrollTo(0,0);sig="";render();animIn("r");return}
  if(t.closest("#sx")){sq="";const i=$("#sq");if(i){i.value="";i.focus()}return fillSearch()}
});
document.addEventListener("input",e=>{if(e.target.id==="sq"){sq=e.target.value.trim();sg="";fillSearch()}});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("#sv").classList.contains("open"))shut()});
let dragY=0,dragS=0,dragging=false;
document.addEventListener("touchstart",e=>{if(!e.target.closest("#grab"))return;dragS=e.touches[0].clientY;dragging=true;dragY=0;$("#sh").style.transition="none"},{passive:true});
document.addEventListener("touchmove",e=>{if(!dragging)return;dragY=Math.max(0,e.touches[0].clientY-dragS);$("#sh").style.transform=`translateY(${dragY}px)`},{passive:true});
document.addEventListener("touchend",()=>{if(!dragging)return;dragging=false;const s=$("#sh");s.style.transition="";s.style.transform="";if(dragY>110)shut()},{passive:true});
/* ---------- animated tab bar ---------- */
const TN=TABS.length;let thumb=null,pdown=false,moved=false,sx0=0,tx=0,lastN=-1;
const nav=()=>$("#tabs");
function initTabs(){
  const n=nav();
  n.innerHTML='<i class="thumb" id="thumb"></i>'+TABS.map(([k,l],i)=>`<button data-t="${k}" data-i="${i}">${ICO[k]}<span>${l}</span></button>`).join("");
  thumb=$("#thumb");
  const geo=()=>{const r=n.getBoundingClientRect();return{l:r.left+6,w:(r.width-12)/TN}};
  const pos=e=>{const g=geo();return Math.max(0,Math.min(TN-1,(e.clientX-g.l)/g.w-.5))};
  n.addEventListener("pointerdown",e=>{
    if(e.button>0)return;
    pdown=true;moved=false;sx0=e.clientX;lastN=-1;
    try{n.setPointerCapture(e.pointerId)}catch(x){}
    n.classList.add("press");tx=pos(e);thumb.style.setProperty("--x",tx);paintTabs(nearest(tx));
  });
  n.addEventListener("pointermove",e=>{
    if(!pdown)return;
    if(!moved){if(Math.abs(e.clientX-sx0)<4)return;moved=true;n.classList.add("drag")}
    tx=pos(e);thumb.style.setProperty("--x",tx);
    const k=nearest(tx);if(k!==lastN){if(lastN>=0&&navigator.vibrate)navigator.vibrate(6);lastN=k;paintTabs(k)}
  });
  const up=()=>{
    if(!pdown)return;pdown=false;n.classList.remove("press","drag");
    const k=nearest(tx);thumb.style.setProperty("--x",k);switchTab(TABS[k][0]);
  };
  n.addEventListener("pointerup",up);
  n.addEventListener("pointercancel",()=>{pdown=false;n.classList.remove("press","drag");syncTabs()});
}
const nearest=v=>Math.max(0,Math.min(TN-1,Math.round(v)));
function paintTabs(i){[...nav().querySelectorAll("button")].forEach((b,j)=>b.classList.toggle("on",j===i))}
function syncTabs(){if(!thumb||pdown)return;const i=TABS.findIndex(t=>t[0]===tab);thumb.style.setProperty("--x",i);paintTabs(i)}
function animIn(d){const m=$("#main");m.classList.remove("inr","inl","fade");void m.offsetWidth;m.classList.add(d==="r"?"inr":d==="l"?"inl":"fade")}
function switchTab(k){
  if(k===tab){scrollTo({top:0,behavior:"smooth"});syncTabs();return}
  const a=TABS.findIndex(t=>t[0]===tab),b=TABS.findIndex(t=>t[0]===k);
  tab=k;sg="";sig="";scrollTo(0,0);render();syncTabs();animIn(b>a?"r":"l");
}
addEventListener("scroll",()=>document.querySelector(".hdr").classList.toggle("sc",scrollY>12),{passive:true});
initTabs();render();load();
(window.__f=window.__f||[]).push("app.js");
/*END*/
