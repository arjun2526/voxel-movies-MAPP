function watch(epId){
  const m=cur;if(!m)return;
  const fid=m.type==="tv"?(epId||(m.episodes[0]||{}).id):m.id;
  if(!live||!fid)return;
  const md=$("#media");if(md)md.innerHTML="";
  shut();openPlayer(m,fid);
}
/* ---------- Voxel player ---------- */
const pl=$("#pl"),pv=$("#p_v"),coarse=matchMedia("(pointer:coarse)").matches;
let pm=null,pfid="",idleT=0,lastTap=0,tapT=0,lastSave=0,si=0,dr=false;
const SP=[1,1.25,1.5,2,.75];
const sv=p=>`<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">${p}</svg>`;
const IC={
 play:sv('<path d="M8 5v14l11-7z"/>'),pause:sv('<path d="M6 5h4v14H6zm8 0h4v14h-4z"/>'),
 b10:sv('<path d="M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z"/><text x="12" y="16.2" font-size="6.5" font-weight="700" text-anchor="middle">10</text>'),
 f10:sv('<path d="M12 5V1l5 5-5 5V7a6 6 0 1 0 6 6h2a8 8 0 1 1-8-8z"/><text x="12" y="16.2" font-size="6.5" font-weight="700" text-anchor="middle">10</text>'),
 vol:sv('<path d="M3 9v6h4l5 5V4L7 9z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
 mute:sv('<path d="M3 9v6h4l5 5V4L7 9z"/><path d="m16 9 5 6m0-6-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
 fs:sv('<path d="M4 4h6v2H6v4H4zm10 0h6v6h-2V6h-4zM4 14h2v4h4v2H4zm14 0h2v6h-6v-2h4z"/>'),
 back:sv('<path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>')
};
$("#p_back").innerHTML=IC.back;$("#p_rw").innerHTML=IC.b10;$("#p_ff").innerHTML=IC.f10;$("#p_fs").innerHTML=IC.fs;$("#p_play").innerHTML=IC.play;$("#p_mute").innerHTML=IC.vol;
const tm=s=>{if(!isFinite(s))return"0:00";s=Math.floor(s);const h=Math.floor(s/3600),m=Math.floor(s%3600/60),c=s%60;return(h?h+":"+String(m).padStart(2,"0"):m)+":"+String(c).padStart(2,"0")};
const fsEl=()=>document.fullscreenElement||document.webkitFullscreenElement;
function fsToggle(){
  if(fsEl()){(document.exitFullscreen||document.webkitExitFullscreen).call(document);return}
  const r=pl.requestFullscreen||pl.webkitRequestFullscreen;
  if(r){const p=r.call(pl);if(p&&p.then)p.then(()=>{try{screen.orientation.lock("landscape").catch(()=>{})}catch(e){}}).catch(()=>{})}
  else if(pv.webkitEnterFullscreen)pv.webkitEnterFullscreen();
}
function wake(){pl.classList.remove("idle");clearTimeout(idleT);if(!pv.paused)idleT=setTimeout(()=>pl.classList.add("idle"),3200)}
function togglePlay(){pv.paused?pv.play().catch(()=>{}):pv.pause()}
function flash(side,t){const k=$("#p_skip");k.style.left=side==="left"?"14%":"auto";k.style.right=side==="right"?"14%":"auto";k.textContent=t;k.classList.add("show");clearTimeout(k._t);k._t=setTimeout(()=>k.classList.remove("show"),600)}
function seekBy(d){pv.currentTime=Math.max(0,Math.min(pv.duration||1e9,pv.currentTime+d));flash(d<0?"left":"right",(d<0?"−":"+")+Math.abs(d)+"s")}
function paint(){
  const d=pv.duration||0,t=pv.currentTime||0,p=d?t/d*100:0;
  $("#p_fill").style.width=p+"%";$("#p_knob").style.left=p+"%";
  $("#p_time").textContent=tm(t)+" / "+tm(d);
  if(d&&pv.buffered.length)$("#p_buf").style.width=Math.min(100,pv.buffered.end(pv.buffered.length-1)/d*100)+"%";
}
function savePos(force){
  const n=Date.now();if(!pfid||(!force&&n-lastSave<4000))return;lastSave=n;
  const p=kget("vx-pos"),t=pv.currentTime,d=pv.duration||0;
  if(t>30&&d&&t<d-60)p[pfid]=Math.floor(t);else delete p[pfid];kset("vx-pos",p);
}
function openPlayer(m,fid){
  pl.classList.remove("alt");{const f=$("#p_if");if(f)f.remove()}
  pm=m;pfid=fid;si=0;pv.playbackRate=1;$("#p_speed").textContent="1×";
  const ep=m.type==="tv"?m.episodes.find(e=>e.id===fid):null;
  $("#p_title").textContent=m.title;
  $("#p_sub").textContent=ep?`Season ${ep.s} · Episode ${ep.e}`:[m.year,m.genre].filter(Boolean).join(" · ");
  const nx=ep?m.episodes[m.episodes.indexOf(ep)+1]:null;
  $("#p_next").style.display=nx?"":"none";$("#p_next").dataset.id=nx?nx.id:"";
  $("#p_msg").style.display="none";pl.classList.add("wait","pause");
  const wasOpen=pl.classList.contains("open");
  pv.src=streamUrl(fid);
  const t=+(kget("vx-pos")[fid]||0);
  if(t>30)pv.addEventListener("loadedmetadata",()=>{pv.currentTime=t},{once:true});
  pl.classList.add("open");document.body.style.overflow="hidden";
  if(!wasOpen){try{history.pushState({vp:1},"")}catch(e){}}
  if(coarse&&!fsEl())fsToggle();
  pv.play().catch(()=>{});wake();
}
function closePlayer(fromPop){
  pl.classList.remove("alt");{const f=$("#p_if");if(f)f.remove()}
  savePos(1);pv.pause();pv.removeAttribute("src");pv.load();
  pl.classList.remove("open","wait");$("#p_msg").style.display="none";
  if(fsEl())(document.exitFullscreen||document.webkitExitFullscreen).call(document);
  try{screen.orientation.unlock()}catch(e){}
  document.body.style.overflow="";pm=null;pfid="";
  if(!fromPop&&history.state&&history.state.vp)history.back();
}
addEventListener("popstate",()=>{if(pl.classList.contains("open"))closePlayer(true)});
const on=(id,fn)=>$(id).addEventListener("click",e=>{e.stopPropagation();fn();wake()});
on("#p_back",()=>closePlayer());on("#p_play",togglePlay);on("#p_rw",()=>seekBy(-10));on("#p_ff",()=>seekBy(10));on("#p_fs",fsToggle);
on("#p_mute",()=>{pv.muted=!pv.muted});
on("#p_speed",()=>{si=(si+1)%SP.length;pv.playbackRate=SP[si];$("#p_speed").textContent=SP[si]+"×"});
on("#p_next",()=>{const n=$("#p_next").dataset.id;if(n&&pm)openPlayer(pm,n)});
$("#p_vol").addEventListener("input",e=>{pv.volume=+e.target.value;pv.muted=false});
pv.addEventListener("timeupdate",()=>{paint();savePos()});
["progress","loadedmetadata","durationchange"].forEach(n=>pv.addEventListener(n,paint));
pv.addEventListener("play",()=>{$("#p_play").innerHTML=IC.pause;pl.classList.remove("pause");wake()});
pv.addEventListener("pause",()=>{$("#p_play").innerHTML=IC.play;pl.classList.add("pause");wake()});
pv.addEventListener("waiting",()=>pl.classList.add("wait"));
["canplay","playing","seeked"].forEach(n=>pv.addEventListener(n,()=>pl.classList.remove("wait")));
pv.addEventListener("error",()=>{if(!pfid)return;pl.classList.remove("wait");pl.classList.remove("idle");const m=$("#p_msg");m.style.display="block";m.innerHTML="This video couldn’t be played.<br><small>Google Drive may have reached its daily viewing limit for this file, or the format isn’t supported by your browser.</small><br><button class=\"txt\" id=\"p_alt\" style=\"margin-top:14px\">Play with Google Drive player</button>";$("#p_alt").onclick=()=>{pv.pause();$("#p_msg").style.display="none";pl.classList.add("alt");pv.insertAdjacentHTML("afterend",`<iframe id="p_if" src="https://drive.google.com/file/d/${encodeURIComponent(pfid)}/preview" allow="autoplay; fullscreen" allowfullscreen title="Drive player"></iframe>`)}});
pv.addEventListener("ended",()=>{const n=$("#p_next").dataset.id;if(n&&pm)openPlayer(pm,n);else pl.classList.remove("idle")});
pv.addEventListener("volumechange",()=>{$("#p_mute").innerHTML=pv.muted||pv.volume===0?IC.mute:IC.vol;$("#p_vol").value=pv.muted?0:pv.volume});
const sk=$("#p_seek"),skAt=e=>{const r=sk.getBoundingClientRect();return Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))};
const skGo=e=>{const d=pv.duration;if(d)pv.currentTime=skAt(e)*d;paint();wake()};
sk.addEventListener("pointerdown",e=>{dr=true;sk.classList.add("dr");sk.setPointerCapture(e.pointerId);skGo(e)});
sk.addEventListener("pointermove",e=>{const f=skAt(e),t=$("#p_tip");t.style.left=f*100+"%";t.textContent=tm(f*(pv.duration||0));if(dr)skGo(e)});
const skUp=()=>{dr=false;sk.classList.remove("dr")};
sk.addEventListener("pointerup",skUp);sk.addEventListener("pointercancel",skUp);
$("#p_hit").addEventListener("click",e=>{
  const n=Date.now();
  if(n-lastTap<300){clearTimeout(tapT);lastTap=0;const x=e.clientX/innerWidth;if(x<.35)seekBy(-10);else if(x>.65)seekBy(10);else fsToggle();return}
  lastTap=n;
  tapT=setTimeout(()=>{if(coarse){if(pl.classList.contains("idle")||pv.paused)wake();else pl.classList.add("idle")}else togglePlay()},280);
});
pl.addEventListener("pointermove",e=>{if(e.pointerType==="mouse")wake()});
document.addEventListener("keydown",e=>{
  if(!pl.classList.contains("open"))return;
  const k=e.key;
  if(k===" "||k==="k"){e.preventDefault();togglePlay()}
  else if(k==="ArrowLeft"||k==="j"){e.preventDefault();seekBy(-10)}
  else if(k==="ArrowRight"||k==="l"){e.preventDefault();seekBy(10)}
  else if(k==="ArrowUp"){e.preventDefault();pv.volume=Math.min(1,pv.volume+.1)}
  else if(k==="ArrowDown"){e.preventDefault();pv.volume=Math.max(0,pv.volume-.1)}
  else if(k==="m")pv.muted=!pv.muted;
  else if(k==="f")fsToggle();
  else if(k==="Escape"&&!fsEl())closePlayer();
  wake();
});


(window.__f=window.__f||[]).push("player.js");
/*END*/
