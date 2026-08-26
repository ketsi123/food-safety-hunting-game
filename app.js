(()=>{"use strict";console.info("Food Safety Hunting Game V14.7 LOCKED BACKEND");
const C=window.FS_CONFIG,$=id=>document.getElementById(id),S_EMAIL="fs_hunting_email_v1",S_USER="fs_hunting_user_v1",S_USERS="fs_hunting_users_by_email_v1",S_Q="fs_questions_v7",S_QT="fs_questions_v7_time";
const e={loginScreen:$("loginScreen"),gameScreen:$("gameScreen"),emailInput:$("emailInput"),loginBtn:$("loginBtn"),loginBackendDot:$("loginBackendDot"),loginBackendText:$("loginBackendText"),gameReadyDot:$("gameReadyDot"),avatar:$("avatar"),displayName:$("displayName"),userEmail:$("userEmail"),timerText:$("timerText"),questionCounter:$("questionCounter"),totalScore:$("totalScore"),sideTotalScore:$("sideTotalScore"),progressFill:$("progressFill"),progressText:$("progressText"),seasonText:$("seasonText"),stepText:$("stepText"),questionImage:$("questionImage"),clickLayer:$("clickLayer"),markerLayer:$("markerLayer"),revealLayer:$("revealLayer"),questionText:$("questionText"),questionIdTag:$("questionIdTag"),hotspotCountTag:$("hotspotCountTag"),reasonList:$("reasonList"),liveQuestionScore:$("liveQuestionScore"),actionStatus:$("actionStatus"),undoBtn:$("undoBtn"),clearBtn:$("clearBtn"),submitBtn:$("submitBtn"),changeUserBtn:$("changeUserBtn"),leaderboardBtn:$("leaderboardBtn"),historyBtn:$("historyBtn"),howToBtn:$("howToBtn"),resultOverlay:$("resultOverlay"),resultHomeBtn:$("resultHomeBtn"),resultIcon:$("resultIcon"),resultTitle:$("resultTitle"),resultScore:$("resultScore"),resultLine:$("resultLine"),resultAnswers:$("resultAnswers"),resultVisual:$("resultVisual"),resultVisualImage:$("resultVisualImage"),resultVisualReveal:$("resultVisualReveal"),resultVisualMarkers:$("resultVisualMarkers"),nextBtn:$("nextBtn"),menuOverlay:$("menuOverlay"),menuModalClose:$("menuModalClose"),menuModalTitle:$("menuModalTitle"),menuModalBody:$("menuModalBody"),busyOverlay:$("busyOverlay"),busyText:$("busyText"),busySub:$("busySub"),toast:$("toast"),playCard:$("playCard"),questionGate:$("questionGate"),gateIcon:$("gateIcon"),gateKicker:$("gateKicker"),gateTitle:$("gateTitle"),gateText:$("gateText"),startQuestionBtn:$("startQuestionBtn"),gateLogoutBtn:$("gateLogoutBtn"),endGameBtn:$("endGameBtn")};
let user=null,questions=[],order=[],idx=0,q=null,selections=[],ended=false,started=false,seconds=45,timer=null,statusTimer=null,questionsPromise=null,backendOnline=false;
const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
function toast(msg,ms=2300){e.toast.textContent=msg;e.toast.classList.add("show");clearTimeout(toast.t);toast.t=setTimeout(()=>e.toast.classList.remove("show"),ms)}
function busy(on,title="กำลังประมวลผล...",sub="กรุณารอสักครู่"){e.busyOverlay.classList.toggle("hidden-layer",!on);e.busyText.textContent=title;e.busySub.textContent=sub;document.body.style.overflow=on?"hidden":""}
function action(msg,state="ready"){e.actionStatus.innerHTML=`<i class="mini-dot ${state==='ok'?'online':''}"></i><span>${esc(msg)}</span>`}
async function request(url,opt={}){
  const timeoutMs=Number(opt.timeoutMs||60000);
  const fetchOpt={...opt};delete fetchOpt.timeoutMs;
  const ctl=new AbortController();
  const to=setTimeout(()=>ctl.abort(),timeoutMs);
  try{
    const r=await fetch(url,{cache:"no-store",redirect:"follow",...fetchOpt,signal:ctl.signal});
    const t=await r.text();
    if(!r.ok)throw Error(`HTTP ${r.status}`);
    let d;
    try{d=JSON.parse(t)}catch{
      const preview=String(t||"").replace(/\s+/g," ").slice(0,120);
      throw Error(`Backend ไม่ได้ส่ง JSON${preview?` • ${preview}`:""}`);
    }
    if(!d.ok)throw Error(d.error||"BACKEND_ERROR");
    return d;
  }catch(err){
    if(err?.name==="AbortError"||/aborted/i.test(String(err?.message||""))){
      throw Error(`Backend ใช้เวลานานเกิน ${Math.round(timeoutMs/1000)} วินาที`);
    }
    if(err instanceof TypeError){
      throw Error(`Network/CORS: ${err.message||"Failed to fetch"}`);
    }
    throw err;
  }finally{clearTimeout(to)}
}
function backendUrl(){
  return String(C.BACKEND_URL||"").trim();
}
async function backendPost(payload,timeoutMs=30000){
  const url=backendUrl();
  if(!url)throw Error("BACKEND_URL_MISSING");
  return request(url,{
    method:"POST",
    headers:{"Content-Type":"text/plain;charset=utf-8"},
    body:JSON.stringify(payload),
    timeoutMs
  });
}
async function backendGet(query,timeoutMs=30000){
  const base=backendUrl();
  if(!base)throw Error("BACKEND_URL_MISSING");
  const sep=query.startsWith("?")?"":"?";
  return request(`${base}${sep}${query}`,{timeoutMs});
}
const api=p=>backendPost(p,30000);
function setBackend(ok){
  backendOnline=!!ok;
  e.loginBackendDot.classList.toggle("online",ok);
  e.loginBackendDot.classList.toggle("offline",!ok);
  e.loginBackendText.textContent=ok?"ระบบพร้อมใช้งาน":"เชื่อมระบบไม่ได้";
  e.gameReadyDot.classList.toggle("online",ok);
  e.gameReadyDot.classList.toggle("offline",!ok)
}
async function ping(){
  try{
    const d=await backendGet(`?action=ping&t=${Date.now()}`,20000);
    setBackend(true);
    e.loginBackendText.textContent=`ระบบพร้อมใช้งาน • ${d.version||"Backend"}`;
    return true
  }catch(err){
    setBackend(false);
    e.loginBackendText.textContent=`เชื่อมไม่ได้ • ${err.message}`;
    console.error("Backend ping failed",err);
    return false
  }
}
async function configureBackend(){
  // Locked to the single Web App URL in config.js.
  return ping();
}

function validEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
function allCachedUsers(){
  try{
    const v=JSON.parse(localStorage.getItem(S_USERS)||"{}");
    return v&&typeof v==="object"?v:{};
  }catch{return {}}
}
function cachedUserByEmail(email){
  const key=String(email||"").trim().toLowerCase();
  return allCachedUsers()[key]||null;
}
function saveUser(u){
  user=u;
  localStorage.setItem(S_USER,JSON.stringify(u));
  if(u?.email){
    const key=String(u.email).trim().toLowerCase();
    const users=allCachedUsers();
    users[key]={...(users[key]||{}),...u,email:key};
    localStorage.setItem(S_USERS,JSON.stringify(users));
    if(C.REMEMBER_EMAIL)localStorage.setItem(S_EMAIL,key);
  }
}
function clearUser(){
  // Logout clears only the active session.
  // Per-email score cache is intentionally kept.
  user=null;
  localStorage.removeItem(S_USER);
}
function cachedQuestions(){try{const t=+localStorage.getItem(S_QT)||0;if(Date.now()-t>600000)return null;const a=JSON.parse(localStorage.getItem(S_Q)||"null");return Array.isArray(a)?a:null}catch{return null}}
function imagePath(x){return `${C.QUESTION_IMAGE_DIR||""}${x.imageFile}?v=${encodeURIComponent(C.ASSET_VERSION||"5")}`}
function preload(items){(items||[]).forEach(x=>{const im=new Image();im.decoding="async";im.src=imagePath(x)})}
async function loadQuestions(force=false){
  if(!force){
    const c=cachedQuestions();
    if(c?.length){questions=c;preload(c);return c}
    if(questionsPromise)return questionsPromise;
  }
  questionsPromise=(async()=>{
    const d=await backendGet(`?action=questions&t=${Date.now()}`,60000);
    const enabled=new Set(C.ENABLED_QUESTION_IDS);
    questions=(d.questions||[]).filter(x=>enabled.has(x.questionId));
    if(!questions.length)throw Error("ยังไม่มีคำถามที่เปิดใช้งาน");
    localStorage.setItem(S_Q,JSON.stringify(questions));
    localStorage.setItem(S_QT,String(Date.now()));
    preload(questions);
    return questions;
  })();
  try{return await questionsPromise}finally{questionsPromise=null}
}
function warmQuestions(){if(!cachedQuestions())loadQuestions().catch(()=>{})}
async function login(){
  const email=e.emailInput.value.trim().toLowerCase();
  if(!validEmail(email)){toast("กรุณากรอกอีเมลให้ถูกต้อง");return}

  // V14.2: Enter game immediately. Backend sync happens in background.
  e.loginBtn.disabled=true;
  e.loginBtn.textContent="กำลังเปิดเกม...";

  const localName=email.split("@")[0]
    .replace(/[._-]+/g," ")
    .replace(/[a-z]/g,c=>c.toUpperCase());

  const previous=cachedUserByEmail(email)||(()=>{try{return JSON.parse(localStorage.getItem(S_USER)||"null")}catch{return null}})();
  user={
    userId:previous?.userId||"",
    email,
    displayName:previous?.email===email?(previous.displayName||localName):localName,
    totalBestScore:previous?.email===email?Number(previous.totalBestScore||0):0,
    currentSeason:1
  };
  saveUser(user);

  const localQuestions=Array.isArray(C.LOCAL_QUESTIONS)?C.LOCAL_QUESTIONS:[];
  const cached=cachedQuestions();
  questions=(cached?.length?cached:localQuestions).filter(x=>C.ENABLED_QUESTION_IDS.includes(x.questionId));

  if(!questions.length){
    e.loginBtn.disabled=false;
    e.loginBtn.textContent="🚀 เริ่มเล่นเกม";
    toast("ไม่พบข้อมูลคำถามใน Frontend");
    return;
  }

  preload(questions);
  e.loginBackendText.textContent="กำลังซิงก์คะแนนเบื้องหลัง...";
  openGame();

  // Do not block the player. Sync account + latest question metadata quietly.
  (async()=>{
    try{
      const loginData=await api({action:"login",email});
      if(loginData?.user){
        saveUser(loginData.user);
        renderUser();
        setTotal(Number(loginData.user.totalBestScore||0));
      }
      setBackend(true);

      try{
        const qData=await backendGet(`?action=questions&t=${Date.now()}`,30000);
        const enabled=new Set(C.ENABLED_QUESTION_IDS);
        const latest=(qData.questions||[]).filter(x=>enabled.has(x.questionId));
        if(latest.length){
          localStorage.setItem(S_Q,JSON.stringify(latest));
          localStorage.setItem(S_QT,String(Date.now()));
        }
      }catch(qErr){console.warn("Background question sync skipped",qErr)}
    }catch(err){
      setBackend(false);
      console.warn("Background login sync failed",err);
      // Submit still talks to backend and can create/update the user later.
    }finally{
      e.loginBtn.disabled=false;
      e.loginBtn.textContent="🚀 เริ่มเล่นเกม";
    }
  })();
}
function renderUser(){e.displayName.textContent=user.displayName||"ผู้เล่น";e.userEmail.textContent=user.email||"";e.avatar.textContent=(user.displayName||user.email||"U")[0].toUpperCase();setTotal(user.totalBestScore||0)}
function setTotal(v){e.totalScore.textContent=v||0;e.sideTotalScore.textContent=`${v||0} คะแนน`}
async function openGame(){renderUser();e.loginScreen.classList.add("hidden");e.gameScreen.classList.remove("hidden");if(!questions.length){busy(true,"กำลังโหลดเกม...");try{await loadQuestions()}finally{busy(false)}}startSession()}
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function startSession(){
  clearInterval(timer); started=false; ended=false;
  order=(C.RANDOMIZE_QUESTIONS?shuffle(questions.map((_,i)=>i)):questions.map((_,i)=>i).sort((a,b)=>String(questions[a].questionId).localeCompare(String(questions[b].questionId))));
  idx=0;loadQ(false)
}
function loadQ(startImmediately=false){
  clearInterval(timer);selections=[];ended=false;started=false;currentAttemptId=null;
  e.markerLayer.innerHTML="";e.revealLayer.innerHTML="";e.clickLayer.style.pointerEvents="auto";if(e.resultIcon)e.resultIcon.textContent="🏆";const resultCard=e.resultOverlay.querySelector(".result-modal");if(resultCard)resultCard.classList.remove("timeout");
  e.reasonList.innerHTML='<div class="empty-reason">กด START ก่อนเริ่มข้อ แล้วจึงเลือกจุดในภาพ</div>';
  e.resultOverlay.classList.add("hidden-layer");
  if(e.resultVisual)e.resultVisual.classList.add("hidden");
  e.submitBtn.disabled=true;e.submitBtn.classList.remove("loading");e.submitBtn.textContent="💾 บันทึกคำตอบ";e.liveQuestionScore.textContent="--";
  q=questions[order[idx]];seconds=Number(q.timeLimitSec||45);const cur=idx+1,total=questions.length;
  e.seasonText.textContent=`🌱 SEASON ${q.season||1} : จากฟาร์ม`;e.stepText.textContent=`ภาพที่ ${cur} / ${total}`;e.questionCounter.textContent=`${cur}/${total}`;
  e.questionIdTag.textContent=q.questionId;e.hotspotCountTag.textContent=`${q.hotspotCount} จุด`;e.questionText.textContent='จากภาพนี้ จุดใด “ไม่สอดคล้อง” กับหลัก Food Safety?';
  e.progressFill.style.width=`${cur/total*100}%`;e.progressText.textContent=`ภาพที่ ${cur} / ${total}`;
  e.questionImage.classList.add("loading");e.questionImage.src=imagePath(q);tick();
  e.playCard.classList.add("game-paused");
  e.gateLogoutBtn.classList.add("hidden");
  e.gateIcon.textContent="🎯";e.gateKicker.textContent=cur===1?"ก่อนเริ่มเกมส์":"พร้อมสำหรับข้อต่อไป";e.gateTitle.textContent=cur===1?"กด START เพื่อเริ่มข้อ 1":`Season 1 • ข้อ ${cur}`;
  e.gateText.textContent=`เวลา ${q.timeLimitSec||45} วินาทีจะเริ่มนับหลังจากกด START เท่านั้น`;
  e.startQuestionBtn.textContent=cur===1?"▶ START ข้อ 1":"▶ START ข้อนี้";
  e.questionGate.classList.remove("off");
  action("รอกด START เพื่อเริ่มจับเวลา");
  if(startImmediately) startQuestion();
  window.scrollTo({top:0,behavior:"smooth"})
}
async function startQuestion(){
  if(started||ended)return;

  const normalText=(idx+1)===1?"▶ START ข้อ 1":"▶ START ข้อนี้";
  e.startQuestionBtn.disabled=true;
  e.startQuestionBtn.textContent="กำลังตรวจระบบ...";

  let ok=backendOnline;
  if(!ok) ok=await ping();

  if(!ok){
    action("กำลังเชื่อม Backend...");
    const configured=await configureBackend();
    if(!configured){
      e.startQuestionBtn.disabled=false;
      e.startQuestionBtn.textContent=normalText;
      e.gateText.textContent="Backend ยังไม่พร้อม • กรุณาตรวจ Apps Script Deployment";
      toast("ยังเชื่อม Backend ไม่ได้",3500);
      return;
    }
  }

  e.startQuestionBtn.disabled=false;
  e.startQuestionBtn.textContent=normalText;

  started=true;
  e.playCard.classList.remove("game-paused");
  e.questionGate.classList.add("off");
  e.submitBtn.disabled=false;
  e.reasonList.innerHTML='<div class="empty-reason">ยังไม่ได้เลือกจุด • คลิก/แตะจุดในภาพเพื่อเพิ่มช่องเหตุผล</div>';
  action(`เริ่มแล้ว • เลือกได้สูงสุด ${q.hotspotCount} จุด`,"ok");
  clearInterval(timer);
  timer=setInterval(()=>{
    seconds--;
    tick();
    if(seconds<=0){
      clearInterval(timer);
      timeoutQuestion();
    }
  },1000);
}
function tick(){e.timerText.textContent=`${String(Math.max(0,Math.floor(seconds/60))).padStart(2,"0")}:${String(Math.max(0,seconds%60)).padStart(2,"0")}`;e.timerText.style.color=seconds<=10?"#ffd057":""}
function selectPoint(cx,cy){if(ended||!started){if(!started)toast("กด START ก่อนเริ่มเลือกจุด");return;}const max=Number(q.hotspotCount||1);if(selections.length>=max){toast(`เลือกได้สูงสุด ${max} จุด`);return}const r=e.clickLayer.getBoundingClientRect(),x=(cx-r.left)/r.width*100,y=(cy-r.top)/r.height*100;if(x<0||x>100||y<0||y>100)return;if(selections.some(s=>Math.hypot(s.x-x,s.y-y)<2.1)){toast("จุดนี้ใกล้กับจุดที่เลือกไว้แล้ว");return}selections.push({x:+x.toFixed(2),y:+y.toFixed(2),reason:""});renderMarkers();renderReasons();action(`เลือกแล้ว ${selections.length}/${max} จุด`,"ok")}
function renderMarkers(){e.markerLayer.innerHTML="";selections.forEach((s,i)=>{const b=document.createElement("button");b.className="marker";b.dataset.index=String(i);b.style.left=s.x+"%";b.style.top=s.y+"%";b.textContent=i+1;b.onclick=ev=>{ev.stopPropagation();if(ended)return;selections.splice(i,1);renderMarkers();renderReasons()};e.markerLayer.appendChild(b)})}
function markSelectionResults(results){const markers=[...e.markerLayer.querySelectorAll(".marker")];markers.forEach((m,i)=>{m.classList.remove("correct","wrong");const r=(results||[])[i];if(!r)return;m.classList.add(r.pointMatched?"correct":"wrong")})}
function renderReasons(){if(!selections.length){e.reasonList.innerHTML='<div class="empty-reason">ยังไม่ได้เลือกจุด • คลิก/แตะจุดในภาพเพื่อเพิ่มช่องเหตุผล</div>';return}e.reasonList.innerHTML="";selections.forEach((s,i)=>{const row=document.createElement("div");row.className="reason-row";row.innerHTML=`<div class="reason-number">${i+1}</div><div><textarea class="reason-input" placeholder="เหตุผลของจุดที่ ${i+1}"></textarea><div class="reason-note">อธิบายสั้น ๆ ว่าจุดนี้เสี่ยงหรือไม่ถูกหลักอย่างไร</div></div>`;const ta=row.querySelector("textarea");ta.value=s.reason||"";ta.oninput=()=>selections[i].reason=ta.value;e.reasonList.appendChild(row)})}
function reveal(list){e.revealLayer.innerHTML="";(list||[]).forEach(h=>{const d=document.createElement("div");d.className="reveal-ring";d.style.left=h.x+"%";d.style.top=h.y+"%";d.style.width=h.rx*2+"%";d.style.height=h.ry*2+"%";e.revealLayer.appendChild(d)})}
function renderResultVisual(revealList,results){
  if(!e.resultVisual||!e.resultVisualImage)return;
  e.resultVisual.classList.remove("hidden");
  e.resultVisualImage.src=imagePath(q);
  e.resultVisualReveal.innerHTML="";
  e.resultVisualMarkers.innerHTML="";
  (revealList||[]).forEach(h=>{
    const ring=document.createElement("div");
    ring.className="answer-ring";
    ring.style.left=h.x+"%";ring.style.top=h.y+"%";
    ring.style.width=h.rx*2+"%";ring.style.height=h.ry*2+"%";
    e.resultVisualReveal.appendChild(ring);
  });
  selections.forEach((sel,i)=>{
    const r=(results||[])[i];
    const m=document.createElement("div");
    m.className=`answer-marker ${r?.pointMatched?"correct":"wrong"}`;
    m.style.left=sel.x+"%";m.style.top=sel.y+"%";m.textContent=i+1;
    e.resultVisualMarkers.appendChild(m);
  });
}
function startStatusCycle(){const msgs=["กำลังตรวจตำแหน่ง...","กำลังตรวจเหตุผล...","กำลังบันทึกคะแนน..."];let i=0;e.busyText.textContent=msgs[0];clearInterval(statusTimer);statusTimer=setInterval(()=>{i=(i+1)%msgs.length;e.busyText.textContent=msgs[i]},900)}
function timeoutQuestion(){
  if(ended)return;
  ended=true;started=false;seconds=0;tick();clearInterval(timer);
  e.submitBtn.disabled=true;e.clickLayer.style.pointerEvents="none";
  action("หมดเวลา • ข้อนี้ไม่ได้บันทึกคะแนน");
  e.liveQuestionScore.textContent="--";
  if(e.resultIcon)e.resultIcon.textContent="⏰";
  const card=e.resultOverlay.querySelector(".result-modal");if(card)card.classList.add("timeout");
  e.resultTitle.textContent="หมดเวลา";
  e.resultScore.textContent="ไม่ได้บันทึกคะแนน";
  e.resultLine.innerHTML='คุณยังไม่ได้กด <b>บันทึกคำตอบ</b> ก่อนหมดเวลา<br>จึงไม่มีการส่งคำตอบไป Google Sheet และข้อนี้ไม่ได้คะแนน';
  if(e.resultVisual)e.resultVisual.classList.add("hidden");e.resultAnswers.innerHTML='<div class="timeout-note">คะแนนจะถูกบันทึกเฉพาะเมื่อกด “บันทึกคำตอบ” ก่อนเวลาหมดเท่านั้น</div>';
  const more=idx<order.length-1;
  e.nextBtn.textContent="▶ เริ่มข้อถัดไป";e.nextBtn.classList.toggle("hidden",!more);
  e.endGameBtn.textContent=more?"■ จบเกมส์":"✓ จบเกมส์";
  e.endGameBtn.parentElement.classList.toggle("final",!more);
  e.resultOverlay.classList.remove("hidden-layer");
}
async function submit(auto=false){
  if(ended)return;
  if(seconds<=0){timeoutQuestion();return}
  if(!started){toast("กด START ก่อน");return}
  if(!selections.length){toast("กรุณาเลือกจุดในภาพก่อน");return}

  // Create once and reuse on retry. Backend V11 makes it impossible to add
  // the same Submit score twice.
  if(!currentAttemptId){
    const token=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():
      `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    currentAttemptId=`ATT-CLIENT-${token}`;
  }

  ended=true;
  clearInterval(timer);
  e.submitBtn.disabled=true;
  e.submitBtn.classList.add("loading");
  e.submitBtn.textContent="กำลังตรวจ...";
  action("กำลังบันทึกและตรวจคำตอบ...");
  busy(true,"กำลังตรวจคำตอบ...","รอสักครู่ • คำตอบของคุณจะไม่หาย");
  startStatusCycle();

  try{
    const payload={
      action:"submit",
      attemptId:currentAttemptId,
      email:user.email,
      questionId:q.questionId,
      selections:selections.map(s=>({x:s.x,y:s.y,reason:s.reason||""})),
      elapsedSec:Math.max(0,Number(q.timeLimitSec||45)-seconds)
    };

    let d;
    try{
      d=await api(payload);
    }catch(firstErr){
      // One quick retry only for transient failures. Same attemptId means safe.
      const msg=String(firstErr?.message||firstErr||"");
      if(/Backend ใช้เวลานาน|Network\/CORS|HTTP 5\d\d/i.test(msg)){
        action("การเชื่อมต่อสะดุด • กำลังลองบันทึกซ้ำ...");
        await new Promise(r=>setTimeout(r,700));
        d=await api(payload);
      }else{
        throw firstErr;
      }
    }

    clearInterval(statusTimer);
    setBackend(true);

    const earnedNow=Number(d.score?.total||0);
    const cumulative=Number(d.totalCumulativeScore ?? d.totalBestScore ?? user?.totalBestScore ?? 0);
    setTotal(cumulative);

    if(user){
      user.totalBestScore=cumulative;
      saveUser(user);
    }

    e.liveQuestionScore.textContent=earnedNow;
    reveal(d.reveal);
    markSelectionResults(d.results);
    renderResultVisual(d.reveal,d.results);

    if(e.resultIcon)e.resultIcon.textContent="🏆";
    const card=e.resultOverlay.querySelector(".result-modal");
    if(card)card.classList.remove("timeout");

    const sc=d.score||{};
    e.resultScore.textContent=`${sc.total||0} / 100`;
    e.resultLine.innerHTML=`พบจุดไม่สอดคล้อง <b>${sc.clickMatchedCount||0}</b> จาก <b>${sc.totalHotspots||q.hotspotCount}</b> จุด<br>ตำแหน่ง <b>${sc.click||0}</b>/50 • เหตุผล <b>${sc.reason||0}</b>/50<div class="latest-total-score"><span>⭐ คะแนนสะสมล่าสุด</span><strong>${cumulative} คะแนน</strong></div>`;

    const ans=(d.reveal||[]).map((h,i)=>`<div style="margin-top:8px"><b>${i+1}) ${esc(h.label||"")}</b><br>${esc(h.whyNotFoodSafety||"")}</div>`).join("");
    e.resultAnswers.innerHTML=`<b>เฉลย</b>${ans||"<div>-</div>"}`;

    const more=idx<order.length-1;
    e.resultTitle.textContent=more?"สรุปผลข้อนี้":"สรุปผลข้อสุดท้าย";
    e.nextBtn.textContent="▶ เริ่มข้อถัดไป";
    e.nextBtn.classList.toggle("hidden",!more);
    e.endGameBtn.textContent=more?"■ จบเกมส์":"✓ จบเกมส์";
    e.endGameBtn.parentElement.classList.toggle("final",!more);

    busy(false);
    e.resultOverlay.classList.remove("hidden-layer");
    action(more?"บันทึกสำเร็จ • กดเริ่มข้อถัดไปเมื่อพร้อม":"บันทึกสำเร็จ • กดจบเกมส์","ok");

  }catch(err){
    clearInterval(statusTimer);
    ended=false;
    e.submitBtn.disabled=false;
    busy(false);

    const msg=String(err?.message||err||"");
    if(/HTTP 404/i.test(msg)){
      setBackend(false);
      action("Backend URL ใช้ไม่ได้ • คำตอบยังอยู่ ไม่ต้องตอบใหม่");
      toast("Backend HTTP 404 • กรุณาใส่ Web app URL /exec ล่าสุด",5000);
      await configureBackend();
    }else{
      action("ยังบันทึกไม่สำเร็จ • คำตอบยังอยู่ กดลองบันทึกอีกครั้ง");
      toast(`ยังบันทึกไม่สำเร็จ: ${msg}`,4500);
    }
  }finally{
    e.submitBtn.classList.remove("loading");
    if(!ended){
      e.submitBtn.textContent="🔄 ลองบันทึกอีกครั้ง";
    }else{
      e.submitBtn.textContent="💾 บันทึกคำตอบ";
    }
  }
}
function next(){
  e.resultOverlay.classList.add("hidden-layer");
  if(idx<order.length-1){idx++;loadQ(true)}else endGame()
}
function endGame(){
  clearInterval(timer);ended=true;started=false;e.resultOverlay.classList.add("hidden-layer");
  e.playCard.classList.add("game-paused","session-done");
  e.gateIcon.textContent="🏆";e.gateKicker.textContent="SESSION COMPLETE";e.gateTitle.textContent="จบเกมส์แล้ว";
  e.gateText.textContent=`คะแนนสะสมทั้งหมด ${Number(user?.totalBestScore||0)} คะแนน`;
  e.startQuestionBtn.textContent="↻ เล่นใหม่ Season 1";e.gateLogoutBtn.classList.remove("hidden");e.questionGate.classList.remove("off");
  e.startQuestionBtn.onclick=()=>{e.playCard.classList.remove("session-done");e.startQuestionBtn.onclick=startQuestion;startSession()};
  action("จบเกมส์แล้ว • เลือกเล่นใหม่หรือออกจากระบบ","ok")
}
function modal(title,html){e.menuModalTitle.textContent=title;e.menuModalBody.innerHTML=html;e.menuOverlay.classList.remove("hidden-layer")}
async function leaderboard(){busy(true,"กำลังโหลด Leaderboard...");try{const d=await backendGet(`?action=leaderboard&limit=20&t=${Date.now()}`,30000),rows=d.leaderboard||[];modal("🏆 Leaderboard",rows.length?`<table class="lb-table"><thead><tr><th>อันดับ</th><th>ผู้เล่น</th><th>คะแนน</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.rank)}</td><td>${esc(r.displayName||r.email||'-')}</td><td><b>${esc(r.totalBestScore||0)}</b></td></tr>`).join('')}</tbody></table>`:'<div class="empty-reason">ยังไม่มีคะแนน</div>')}catch{toast("โหลด Leaderboard ไม่สำเร็จ")}finally{busy(false)}}
async function history(){busy(true,"กำลังโหลดประวัติ...");try{const d=await api({action:"progress",email:user.email}),rows=d.progress||[];if(user){user.totalBestScore=Number(d.totalBestScore||0);saveUser(user);setTotal(user.totalBestScore)}modal("🕘 ประวัติการเล่น",rows.length?`<table class="history-table"><thead><tr><th>ข้อ</th><th>Best</th><th>ครั้ง</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.questionId)}</td><td><b>${esc(r.bestScore||0)}</b></td><td>${esc(r.attempts||0)}</td></tr>`).join('')}</tbody></table>`:'<div class="empty-reason">ยังไม่มีประวัติ</div>')}catch{toast("โหลดประวัติไม่สำเร็จ")}finally{busy(false)}}
function howto(){modal("ⓘ วิธีการเล่น",`<div class="help-list"><div class="help-step"><i>1</i><div><b>สังเกตภาพ</b><br>หาจุดที่ไม่สอดคล้องกับ Food Safety</div></div><div class="help-step"><i>2</i><div><b>คลิก/แตะจุด</b><br>เลือกได้หลายจุดตามจำนวนที่กำหนด</div></div><div class="help-step"><i>3</i><div><b>ใส่เหตุผล</b><br>อธิบายสั้น ๆ ว่าจุดนั้นเสี่ยงอย่างไร</div></div><div class="help-step"><i>4</i><div><b>บันทึกคำตอบ</b><br>ตำแหน่ง 50 + เหตุผล 50 คะแนน • ต้องบันทึกก่อนหมดเวลา</div></div></div>`)}
function logout(){clearInterval(timer);clearUser();e.emailInput.value=localStorage.getItem(S_EMAIL)||"";e.gameScreen.classList.add("hidden");e.loginScreen.classList.remove("hidden");setBackend(false)}
e.loginBtn.onclick=login;e.emailInput.onkeydown=x=>{if(x.key==="Enter")login()};e.changeUserBtn.onclick=logout;e.leaderboardBtn.onclick=leaderboard;e.historyBtn.onclick=history;e.howToBtn.onclick=howto;e.menuModalClose.onclick=()=>e.menuOverlay.classList.add("hidden-layer");e.menuOverlay.onclick=x=>{if(x.target===e.menuOverlay)e.menuOverlay.classList.add("hidden-layer")};document.querySelectorAll(".nav-item[data-season]").forEach(b=>b.onclick=()=>Number(b.dataset.season)===1?toast("Season 1 : จากฟาร์ม"):toast(`Season ${b.dataset.season} ยังไม่เปิดให้เล่น`));e.undoBtn.onclick=()=>{if(ended||!selections.length)return;selections.pop();renderMarkers();renderReasons()};e.clearBtn.onclick=()=>{if(ended)return;selections=[];renderMarkers();renderReasons();action("ล้างจุดที่เลือกแล้ว")};e.submitBtn.onclick=()=>submit(false);e.nextBtn.onclick=next;e.endGameBtn.onclick=endGame;e.startQuestionBtn.onclick=startQuestion;e.gateLogoutBtn.onclick=logout;e.resultHomeBtn.onclick=endGame;e.clickLayer.onclick=x=>selectPoint(x.clientX,x.clientY);e.clickLayer.addEventListener("touchend",x=>{const t=x.changedTouches?.[0];if(t){selectPoint(t.clientX,t.clientY);x.preventDefault()}},{passive:false});e.questionImage.onload=()=>e.questionImage.classList.remove("loading");e.questionImage.onerror=()=>{e.questionImage.classList.remove("loading");toast(`ไม่พบภาพ ${q?.imageFile||""}`)};
localStorage.removeItem("fs_backend_url");
const saved=localStorage.getItem(S_EMAIL);if(saved)e.emailInput.value=saved;try{const u=JSON.parse(localStorage.getItem(S_USER)||"null");if(u?.email)e.emailInput.value=u.email}catch{}e.loginBackendText.textContent="พร้อมเข้าสู่ระบบ";e.loginBackendDot.classList.remove("online","offline");})();