/* School-IHub Firebase edition */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, setDoc, getDoc, updateDoc, deleteDoc, query, orderBy, onSnapshot, serverTimestamp, increment, where, getDocs, limit, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const toast = msg => { const t=$("toast"); if(!t)return; t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200); };
const uid=()=>crypto.randomUUID ? crypto.randomUUID() : "id_"+Date.now()+Math.random().toString(36).slice(2);
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const timeText=ts=>{if(!ts)return "たった今";const d=ts?.toDate?ts.toDate():new Date(ts),diff=Date.now()-d.getTime();if(diff<60000)return"たった今";if(diff<3600000)return Math.floor(diff/60000)+"分前";if(diff<86400000)return Math.floor(diff/3600000)+"時間前";return d.toLocaleDateString("ja-JP")};

let currentUser=null,userData={name:"学生",bio:""},posts=[],questions=[],events=[],studyLogs=[],ranking=[],boardFilter="new",selectedDmUser=null;
let unsubscribers=[]; let dmUnsub=null;

function showPage(page){document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));$("page-"+page)?.classList.add("active");document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.page===page));location.hash=page;if(page==="dm")renderDM();}
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>showPage(b.dataset.page));document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>showPage(b.dataset.go));
$("mobileMenu")?.addEventListener("click",()=>document.querySelector(".sidebar")?.classList.toggle("open"));

let authMode="login";
document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));t.classList.add("active");authMode=t.dataset.auth;$("authSubmit").textContent=authMode==="login"?"ログイン":"アカウントを作成";$("nameField").classList.toggle("hidden",authMode==="login")});
$("authForm").onsubmit=async e=>{e.preventDefault();const email=$("authEmail").value.trim().toLowerCase(),pass=$("authPassword").value,name=$("authName").value.trim();try{if(authMode==="signup"){if(pass.length<6)return toast("パスワードは6文字以上にしてね");const cred=await createUserWithEmailAndPassword(auth, email, pass);await updateProfile(cred.user,{displayName:name||"学生"});await setDoc(doc(db,"users",cred.user.uid),{uid:cred.user.uid,email:cred.user.email,name:name||"学生",bio:"",createdAt:serverTimestamp()});toast("アカウントを作成したよ！")}else{await signInWithEmailAndPassword(auth,email,pass);toast("ログインしたよ！")}}catch(e){console.error(e);const m={"auth/email-already-in-use":"そのメールアドレスは登録済みだよ","auth/invalid-credential":"メールアドレスまたはパスワードが違うよ","auth/invalid-email":"メールアドレスを確認してね","auth/weak-password":"パスワードを6文字以上にしてね"};toast(m[e.code]||"認証に失敗したよ。Firebase設定を確認してね")}};
$("logoutBtn").onclick=async()=>{await signOut(auth);toast("ログアウトしたよ")};
$("themeBtn").onclick=()=>document.body.classList.toggle("dark");

async function loadUserData(){const ref=doc(db,"users",currentUser.uid),snap=await getDoc(ref);if(snap.exists()){userData={name:snap.data().name||currentUser.displayName||"学生",bio:snap.data().bio||""}}else{userData={name:currentUser.displayName||"学生",bio:""};await setDoc(ref,{uid:currentUser.uid,email:currentUser.email,name:userData.name,bio:"",createdAt:serverTimestamp()},{merge:true})}}
function clearSubscriptions(){unsubscribers.forEach(u=>u&&u());unsubscribers=[];if(dmUnsub){dmUnsub();dmUnsub=null}}
function subscribeCore(){
  clearSubscriptions();
  const add=(q,key)=>unsubscribers.push(onSnapshot(q,s=>{const arr=s.docs.map(d=>({id:d.id,...d.data()}));window[key]=arr;renderAll();},e=>{console.error(e);toast("データの読み込みに失敗したよ。Firestore Rulesを確認してね") }));
  add(query(collection(db,"posts"),orderBy("createdAt","desc")),"posts");
  add(query(collection(db,"questions"),orderBy("createdAt","desc")),"questions");
  add(query(collection(db,"events"),orderBy("date","asc")),"events");
  add(query(collection(db,"studyLogs"),orderBy("createdAt","desc")),"studyLogs");
}
async function hydrate(){await loadUserData();$("headerName").textContent=userData.name;$("headerAvatar").textContent=userData.name.charAt(0)||"学";$("profileName").value=userData.name;$("profileBio").value=userData.bio;$("profileAvatar").textContent=userData.name.charAt(0)||"学";subscribeCore();renderAll();const h=location.hash.replace("#","");showPage(["home","board","questions","dm","events","study","ranking","profile"].includes(h)?h:"home")}
function renderAll(){renderPosts();renderQuestions();renderEvents();renderStudy();renderRanking();renderHome();updateStats();renderDM();renderStudyExtras?.();renderRecords?.();renderMemory?.();renderCommunity?.();renderFocus?.()}

$("postText").oninput=e=>$("postChars").textContent=`${e.target.value.length} / 500`;
$("postBtn").onclick=async()=>{const text=$("postText").value.trim();if(!text)return toast("投稿内容を入力してね");try{await addDoc(collection(db,"posts"),{uid:currentUser.uid,name:userData.name,text,likes:0,likedBy:[],createdAt:serverTimestamp()});$("postText").value="";$("postChars").textContent="0 / 500";toast("投稿したよ！")}catch(e){console.error(e);toast("投稿に失敗したよ")}};
document.addEventListener("click",async e=>{const like=e.target.closest("[data-like]");if(like){const p=posts.find(x=>x.id===like.dataset.like);if(!p)return;try{const liked=(p.likedBy||[]).includes(currentUser.uid);await updateDoc(doc(db,"posts",p.id),{likes:increment(liked?-1:1),likedBy:liked?arrayRemove(currentUser.uid):arrayUnion(currentUser.uid)})}catch(err){console.error(err);toast("いいねに失敗したよ")}}const del=e.target.closest("[data-delete-post]");if(del){const p=posts.find(x=>x.id===del.dataset.deletePost);if(p?.uid===currentUser.uid){await deleteDoc(doc(db,"posts",p.id));toast("削除したよ")}}const ans=e.target.closest("[data-answer]");if(ans){const text=prompt("回答を入力してね");if(!text?.trim())return;const q=questions.find(x=>x.id===ans.dataset.answer);if(q)try{await updateDoc(doc(db,"questions",q.id),{answers:[...(q.answers||[]),{uid:currentUser.uid,name:userData.name,text:text.trim(),createdAt:new Date().toISOString()}]});toast("回答したよ！")}catch(err){console.error(err);toast("回答に失敗したよ")}}const de=e.target.closest("[data-delete-event]");if(de){const ev=events.find(x=>x.id===de.dataset.deleteEvent);if(ev?.uid===currentUser.uid){await deleteDoc(doc(db,"events",ev.id));toast("予定を削除したよ")}}});
document.querySelectorAll(".filter").forEach(b=>b.onclick=()=>{document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");boardFilter=b.dataset.filter;renderPosts()});
$("questionBtn").onclick=async()=>{const title=$("questionTitle").value.trim(),body=$("questionBody").value.trim();if(!title||!body)return toast("タイトルと質問内容を入力してね");await addDoc(collection(db,"questions"),{uid:currentUser.uid,name:userData.name,title,body,answers:[],createdAt:serverTimestamp()});$("questionTitle").value="";$("questionBody").value="";toast("質問したよ！")};
$("eventBtn").onclick=async()=>{const title=$("eventTitle").value.trim(),date=$("eventDate").value,place=$("eventPlace").value.trim();if(!title||!date)return toast("イベント名と日時を入力してね");await addDoc(collection(db,"events"),{uid:currentUser.uid,title,date,place,createdAt:serverTimestamp()});$("eventTitle").value="";$("eventDate").value="";$("eventPlace").value="";toast("イベントを追加したよ！")};
$("studyBtn").onclick=async()=>{const minutes=Number($("studyMinutes").value),subject=$("studySubject").value;if(!minutes||minutes<1)return toast("勉強時間を入力してね");await addDoc(collection(db,"studyLogs"),{uid:currentUser.uid,name:userData.name,minutes,subject,createdAt:serverTimestamp()});$("studyMinutes").value="";toast(`${minutes}分記録したよ！`)};
function renderPosts(){let arr=[...posts];if(boardFilter==="popular")arr.sort((a,b)=>(b.likes||0)-(a.likes||0));$("postList").innerHTML=arr.map(p=>`<div class="panel post"><div class="post-head"><div class="avatar">${esc((p.name||"学").charAt(0))}</div><div><div class="post-name">${esc(p.name)}</div><div class="post-time">${timeText(p.createdAt)}</div></div></div><div class="post-text">${esc(p.text)}</div><div class="post-actions"><button class="action ${(p.likedBy||[]).includes(currentUser.uid)?"liked":""}" data-like="${p.id}">❤️ ${p.likes||0}</button>${p.uid===currentUser.uid?`<button class="action" data-delete-post="${p.id}">🗑 削除</button>`:""}</div></div>`).join("")||`<div class="panel muted">まだ投稿がないよ。</div>`}
function renderQuestions(){$("questionList").innerHTML=questions.map(q=>`<div class="panel question"><div class="post-head"><div class="avatar">❓</div><div><b>${esc(q.name)}</b><div class="post-time">${timeText(q.createdAt)}</div></div></div><div class="question-title">${esc(q.title)}</div><div class="post-text">${esc(q.body)}</div>${(q.answers||[]).map(a=>`<div class="answer"><b>💡 ${esc(a.name)}</b><br>${esc(a.text)}</div>`).join("")}<button class="primary" data-answer="${q.id}">回答する</button></div>`).join("")||`<div class="panel muted">まだ質問がないよ。</div>`}
function renderEvents(){$("eventList").innerHTML=events.map(e=>`<div class="panel"><div class="event-date">📅 ${new Date(e.date).toLocaleString("ja-JP")}</div><div class="event-title">${esc(e.title)}</div><div class="event-place">📍 ${esc(e.place||"場所未定")}</div>${e.uid===currentUser.uid?`<br><button class="action" data-delete-event="${e.id}">削除</button>`:""}</div>`).join("")||`<div class="panel muted">予定がないよ。</div>`}
function renderStudy(){const mine=studyLogs.filter(x=>x.uid===currentUser.uid),total=mine.reduce((s,x)=>s+(x.minutes||0),0);$("studyBig").textContent=total;$("studyProgress").style.width=Math.min(100,total/6)+"%";$("studyHistory").innerHTML=mine.slice(0,15).map(x=>`<div class="study-row"><span>📚 ${esc(x.subject)}</span><b>${x.minutes}分</b><span class="post-time">${timeText(x.createdAt)}</span></div>`).join("")||`<p class="muted">まだ記録がないよ。</p>`}
function renderRanking(){const m={};studyLogs.forEach(x=>{m[x.uid]??={uid:x.uid,name:x.name||"学生",minutes:0};m[x.uid].minutes+=x.minutes||0});const arr=Object.values(m).sort((a,b)=>b.minutes-a.minutes).slice(0,20);$("rankingList").innerHTML=arr.map((x,i)=>`<div class="rank"><div class="rank-num">${i+1}</div><div class="rank-avatar">${esc(x.name.charAt(0))}</div><div class="rank-main"><b>${esc(x.name)}</b></div><div class="rank-time">${x.minutes}分</div></div>`).join("")||`<p class="muted">まだランキングデータがないよ。</p>`}
function renderHome(){const popular=[...posts].sort((a,b)=>(b.likes||0)-(a.likes||0)).slice(0,3);$("homePosts").innerHTML=popular.map(p=>`<div class="mini-post"><b>${esc(p.name)}</b><p>${esc(p.text)}</p><span>❤️ ${p.likes||0}</span></div>`).join("")||`<p class="muted">まだ投稿がないよ。</p>`;$("homeEvents").innerHTML=events.slice(0,3).map(e=>`<div class="mini-event"><b>${esc(e.title)}</b><span>${new Date(e.date).toLocaleString("ja-JP")}</span></div>`).join("")||`<p class="muted">予定がないよ。</p>`}
function updateStats(){$("statPosts").textContent=posts.length;$("statQuestions").textContent=questions.length;$("statEvents").textContent=events.length;$("statStudy").textContent=studyLogs.filter(x=>x.uid===currentUser.uid).reduce((s,x)=>s+(x.minutes||0),0)+"分"}

/* ===== DM ===== */
function dmKey(a,b){return [a,b].sort().join("__")}
async function fetchDmUsers(){
 const snap=await getDocs(query(collection(db,"users"),limit(100)));
 return snap.docs.map(d=>({id:d.id,...d.data()})).filter(u=>u.uid!==currentUser.uid);
}
async function renderDM(){
 if(!currentUser||!$("dmUserList"))return;
 try{
  const q=$("dmUserSearch")?.value.trim().toLowerCase()||"";
  let users=await fetchDmUsers();
  users=users.filter(u=>(u.name||"").toLowerCase().includes(q)||(u.email||"").toLowerCase().includes(q));
  $("dmUserList").innerHTML=users.map(u=>`<button class="dm-user ${selectedDmUser?.uid===u.uid?"active":""}" data-dm-user="${esc(u.uid)}"><span class="avatar">${esc((u.name||"学").charAt(0))}</span><span><b>${esc(u.name||"学生")}</b><small>${esc(u.email||"")}</small></span></button>`).join("")||`<p class="muted">他のユーザーがまだいないよ。</p>`;
  if(selectedDmUser)subscribeDMChat();
 }catch(e){
  console.error("DM user load:",e);
  $("dmUserList").innerHTML=`<p class="muted">ユーザー一覧を読み込めなかったよ。FirebaseのFirestore設定・Rulesを確認してね。</p>`;
  toast("DMのユーザー読み込みに失敗したよ");
 }
}
async function ensureConversation(cid,otherUid){
 const ref=doc(db,"conversations",cid);
 const snap=await getDoc(ref);
 if(!snap.exists()) await setDoc(ref,{members:[currentUser.uid,otherUid],updatedAt:serverTimestamp(),createdAt:serverTimestamp()});
 else if(!Array.isArray(snap.data().members)||!snap.data().members.includes(currentUser.uid)) throw new Error("conversation membership invalid");
}
async function subscribeDMChat(){
 if(!selectedDmUser)return;
 if(dmUnsub){dmUnsub();dmUnsub=null}
 const cid=dmKey(currentUser.uid,selectedDmUser.uid);
 try{
  await ensureConversation(cid,selectedDmUser.uid);
 }catch(e){
  console.error("DM conversation init:",e);
  $("dmMessages").innerHTML=`<div class="muted dm-empty">DMを開始できなかったよ。Firestore Rulesを確認してね。</div>`;
  toast("DMの準備に失敗したよ");
  return;
 }
 const msgRef=collection(db,"conversations",cid,"messages");
 dmUnsub=onSnapshot(query(msgRef,orderBy("createdAt","asc")),snap=>{
   const msgs=snap.docs.map(d=>({id:d.id,...d.data()}));
   $("dmAvatar").textContent=(selectedDmUser.name||"学").charAt(0);
   $("dmName").textContent=selectedDmUser.name||"学生";
   $("dmMessages").innerHTML=msgs.map(m=>`<div class="dm-message ${m.from===currentUser.uid?"mine":"theirs"}"><div>${esc(m.text)}</div><small>${m.createdAt?.toDate?m.createdAt.toDate().toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"}):"送信中…"}</small></div>`).join("")||`<div class="muted dm-empty">まだメッセージはないよ。最初の一言を送ろう！</div>`;
   $("dmMessages").scrollTop=$("dmMessages").scrollHeight;
 },e=>{
   console.error("DM message listener:",e);
   $("dmMessages").innerHTML=`<div class="muted dm-empty">DMを読み込めなかったよ。Firestore Rulesを公開済みか確認してね。</div>`;
   toast("DMの読み込みに失敗したよ");
 });
}
$("dmUserSearch")?.addEventListener("input",renderDM);
document.addEventListener("click",e=>{
 const b=e.target.closest("[data-dm-user]");
 if(!b)return;
 fetchDmUsers().then(users=>{selectedDmUser=users.find(u=>u.uid===b.dataset.dmUser)||null;renderDM()}).catch(err=>{console.error(err);toast("ユーザーを選択できなかったよ")});
});
$("dmForm")?.addEventListener("submit",async e=>{
 e.preventDefault();
 if(!selectedDmUser)return toast("相手を選んでね");
 const text=$("dmText").value.trim();
 if(!text)return;
 try{
  const cid=dmKey(currentUser.uid,selectedDmUser.uid);
  await setDoc(doc(db,"conversations",cid),{members:[currentUser.uid,selectedDmUser.uid],updatedAt:serverTimestamp()},{merge:true});
  await addDoc(collection(db,"conversations",cid,"messages"),{from:currentUser.uid,to:selectedDmUser.uid,text,createdAt:serverTimestamp()});
  $("dmText").value="";toast("送信したよ！");
 }catch(err){console.error("DM send:",err);toast("DM送信に失敗したよ。Firestore Rulesを公開しているか確認してね")}
});

/* ===== Study Hub ===== */
const studyState={tasks:load("sh_tasks",[]),cards:load("sh_cards",[]),weak:load("sh_weak",[]),scores:load("sh_scores",[]),recruits:load("sh_recruits",[]),studyQuestions:load("sh_study_questions",[]),recommendations:load("sh_recommendations",[]),formulas:load("sh_formulas",[]),goal:Number(localStorage.getItem("sh_goal")||600),todayGoal:Number(localStorage.getItem("sh_today_goal")||60),focusSeconds:1500,focusRunning:false,focusTimer:null,focusSessions:Number(localStorage.getItem("sh_focus_sessions")||0),focusToday:Number(localStorage.getItem("sh_focus_today")||0)};
const saveStudy=()=>{save("sh_tasks",studyState.tasks);save("sh_cards",studyState.cards);save("sh_weak",studyState.weak);save("sh_scores",studyState.scores);save("sh_recruits",studyState.recruits);save("sh_study_questions",studyState.studyQuestions);save("sh_recommendations",studyState.recommendations);save("sh_formulas",studyState.formulas);localStorage.setItem("sh_goal",studyState.goal);localStorage.setItem("sh_today_goal",studyState.todayGoal);localStorage.setItem("sh_focus_sessions",studyState.focusSessions);localStorage.setItem("sh_focus_today",studyState.focusToday)};
function showStudyTab(tab){document.querySelectorAll(".study-tab").forEach(b=>b.classList.toggle("active",b.dataset.studyTab===tab));document.querySelectorAll(".study-subpage").forEach(x=>x.classList.toggle("active",x.id==="study-"+tab));if(tab==="dashboard")renderStudyExtras();if(tab==="plan")renderTasks();if(tab==="tools"){renderFormulas();}if(tab==="memory")renderMemory();if(tab==="records")renderRecords();if(tab==="community")renderCommunity();if(tab==="focus")renderFocus()}
document.addEventListener("click",e=>{const b=e.target.closest("[data-study-tab]");if(b)showStudyTab(b.dataset.studyTab)});
function renderStudyExtras(){const total=studyLogs.filter(x=>x.uid===currentUser?.uid).reduce((s,x)=>s+(x.minutes||0),0);const now=new Date(),weekStart=new Date(now);weekStart.setDate(now.getDate()-((now.getDay()+6)%7));weekStart.setHours(0,0,0,0);const week=studyLogs.filter(x=>x.uid===currentUser?.uid&&new Date(x.createdAt)>=weekStart).reduce((s,x)=>s+(x.minutes||0),0);$("weeklyGoalText").textContent=studyState.goal+"分";$("todayGoal").textContent=studyState.todayGoal+"分";$("weekStudy").textContent=week+"分";$("studyPoints").textContent=Math.floor(total)+" pt";$("studyStreak").textContent=calcStreak()+"日";const tasks=studyState.tasks.filter(x=>!x.done).slice(0,5);$("todayTasks").innerHTML=tasks.map(x=>`<div class="study-row"><span>${x.priority==="高"?"🔴":x.priority==="低"?"🟢":"🟡"} ${esc(x.text)}</span><button class="action" data-task-done="${x.id}">完了</button></div>`).join("")||`<p class="muted">今日のタスクはないよ。</p>`;$("weakSummary").innerHTML=studyState.weak.slice(0,4).map(x=>`<div class="study-row"><span>📌 ${esc(x.text)}</span><b>${esc(x.subject)}</b></div>`).join("")||`<p class="muted">苦手分野を登録するとここに出るよ。</p>`}
function calcStreak(){const dates=new Set(studyLogs.filter(x=>x.uid===currentUser?.uid).map(x=>new Date(x.createdAt).toISOString().slice(0,10)));let n=0,d=new Date();while(dates.has(d.toISOString().slice(0,10))){n++;d.setDate(d.getDate()-1)}return n}
function renderTasks(){$("goalMinutes").value=studyState.goal;$("todayGoalInput").value=studyState.todayGoal;$("taskList").innerHTML=studyState.tasks.map(x=>`<div class="study-row"><span>${x.done?"✅":"⬜"} ${esc(x.text)} <small class="muted">(${esc(x.subject)}・${esc(x.priority)})</small></span><div><button class="action" data-task-done="${x.id}">${x.done?"未完了":"完了"}</button><button class="action" data-task-delete="${x.id}">削除</button></div></div>`).join("")||`<p class="muted">タスクがないよ。</p>`;const days=["月","火","水","木","金","土","日"];$("weekPlan").innerHTML=days.map(d=>`<div><b>${d}</b><p class="muted">タスクを追加すると計画として整理できるよ。</p></div>`).join("")}
$("taskAddBtn").onclick=()=>{const text=$("taskText").value.trim();if(!text)return toast("タスクを書いてね");studyState.tasks.unshift({id:uid(),text,subject:$("taskSubject").value,priority:$("taskPriority").value,done:false});$("taskText").value="";saveStudy();renderTasks();renderStudyExtras();toast("タスクを追加したよ！")};$("goalSaveBtn").onclick=()=>{studyState.goal=Math.max(10,Number($("goalMinutes").value)||600);studyState.todayGoal=Math.max(10,Number($("todayGoalInput").value)||60);saveStudy();renderStudyExtras();toast("目標を保存したよ！")};document.addEventListener("click",e=>{const d=e.target.closest("[data-task-done]");if(d){const x=studyState.tasks.find(t=>t.id===d.dataset.taskDone);if(x){x.done=!x.done;saveStudy();renderTasks();renderStudyExtras()}}const del=e.target.closest("[data-task-delete]");if(del){studyState.tasks=studyState.tasks.filter(t=>t.id!==del.dataset.taskDelete);saveStudy();renderTasks();renderStudyExtras()}});$("clearDoneTasks").onclick=()=>{studyState.tasks=studyState.tasks.filter(t=>!t.done);saveStudy();renderTasks();renderStudyExtras()};
$("calcBtn").onclick=()=>{try{$("calcResult").textContent=Function('"use strict";return ('+$("calcInput").value.replace(/[^0-9+\-*/().% ]/g,"")+")")()}catch{$("calcResult").textContent="計算できない式だよ"}};$("unitBtn").onclick=()=>{const v=Number($("unitValue").value),t=$("unitType").value,f={"cm-m":v/100,"m-cm":v*100,"g-kg":v/1000,"kg-g":v*1000,"ml-l":v/1000,"l-ml":v*1000};$("unitResult").textContent=Number.isFinite(f[t])?f[t]:"—"};$("graphBtn").onclick=()=>{const a=Number($("graphA").value),b=Number($("graphB").value),c=Number($("graphC").value);$("graphBox").innerHTML=`<svg viewBox="0 0 360 160" width="100%" height="160"><line x1="20" y1="80" x2="340" y2="80" stroke="#aaa"/><line x1="180" y1="10" x2="180" y2="150" stroke="#aaa"/><path d="${Array.from({length:65},(_,i)=>{const x=(i-32)/4,y=a*x*x+b*x+c,px=180+x*20,py=80-y*8;return(i?"L":"M")+px+" "+py}).join(" ")}" fill="none" stroke="#6872e9" stroke-width="3"/></svg>`};
const refs={
 english:{title:"🇬🇧 英語",points:["英単語：意味だけでなく例文とセットで覚える","英文法：時制・助動詞・不定詞・動名詞・関係詞を整理","長文：主語・動詞を先に探し、段落ごとの要点を取る"],method:"毎日10〜20分。単語→文法→短い長文の順で反復すると使いやすいよ。"},
 japanese:{title:"🇯🇵 国語",points:["現代文：接続語と指示語を追って論理を整理","古文：単語・助動詞・敬語を優先","漢字：間違えたものだけを繰り返す"],method:"答え合わせ後に『なぜその答えになるか』を本文に戻って確認しよう。"},
 science:{title:"🧪 理科",points:["物理：公式だけでなく単位と図をセットで確認","化学：元素記号・化学式・反応の関係を整理","生物・地学：用語を図や流れと結びつける"],method:"用語→仕組み→問題の順で確認。計算問題は途中式を残そう。"},
 social:{title:"🌍 社会",points:["歴史：出来事を年号だけでなく原因→結果で整理","地理：地図・統計・気候を関連づける","公民：制度・用語・具体例をセットで覚える"],method:"一問一答だけで終わらず、説明できるか確認すると定着しやすいよ。"},
 math:{title:"📐 数学",points:["公式の意味を確認してから使う","二次関数・図形・確率は典型問題を反復","間違えた問題は解法を一行でメモする"],method:"例題→類題→間違い直しの3段階。途中式を省略しないのがおすすめ。"},
 search:{title:"🔎 用語検索",points:["上の検索欄から登録済みのリファレンスを検索できるよ。","数学・英語・国語・理科・社会のキーワードに対応。"],method:"知りたい用語を入力して検索してみよう。"}
};
function showReference(key,extra=""){
 const r=refs[key];
 if(!r)return;
 $("referenceDetail").innerHTML=`<h3>${esc(r.title)}</h3><ul>${r.points.map(x=>`<li>${esc(x)}</li>`).join("")}</ul><p><b>💡 勉強の進め方：</b>${esc(r.method)}</p>${extra}`;
}
document.querySelectorAll(".reference-item").forEach(b=>b.onclick=()=>showReference(b.dataset.ref));
function searchReference(){
 const q=$("referenceSearch")?.value.trim().toLowerCase();
 if(!q)return toast("検索する用語を入力してね");
 const all=Object.entries(refs).filter(([k,r])=>r.title.toLowerCase().includes(q)||r.points.some(x=>x.toLowerCase().includes(q))||r.method.toLowerCase().includes(q));
 $("referenceDetail").innerHTML=all.length?`<h3>🔎「${esc(q)}」の検索結果</h3>${all.map(([k,r])=>`<div class="study-row"><span><b>${esc(r.title)}</b><br>${esc(r.points.find(x=>x.toLowerCase().includes(q))||r.method)}</span><button class="action" data-reference-open="${k}">開く</button></div>`).join("")}`:`<h3>🔎「${esc(q)}」</h3><p>該当する項目が見つからなかったよ。別の言葉で試してみてね。</p>`;
}
$("referenceSearchBtn")?.addEventListener("click",searchReference);
$("referenceSearch")?.addEventListener("keydown",e=>{if(e.key==="Enter")searchReference()});
document.addEventListener("click",e=>{const b=e.target.closest("[data-reference-open]");if(b)showReference(b.dataset.referenceOpen)});

let cardIndex=0;
function renderMemory(){
 const c=studyState.cards[cardIndex];
 $("cardBox").classList.toggle("hidden",!c);
 $("cardCount").textContent=studyState.cards.length?`${cardIndex+1} / ${studyState.cards.length} 枚`:"カードはまだないよ。";
 if(c){$("cardFrontView").textContent=c.front;$("cardBackView").textContent=c.back;$("cardBackView").classList.add("hidden")}
 $("weakList").innerHTML=studyState.weak.map(x=>`<div class="study-row"><span>📌 ${esc(x.text)} <small class="muted">${esc(x.subject)}</small></span><button class="action" data-weak-delete="${x.id}">削除</button></div>`).join("")||`<p class="muted">まだ登録がないよ。</p>`;
}
$("cardAddBtn").onclick=()=>{const f=$("cardFront").value.trim(),b=$("cardBack").value.trim();if(!f||!b)return toast("表と裏を入力してね");studyState.cards.push({id:uid(),front:f,back:b});$("cardFront").value="";$("cardBack").value="";cardIndex=studyState.cards.length-1;saveStudy();renderMemory();toast("カードを追加したよ！")};
$("cardFlip").onclick=()=>$("cardBackView").classList.toggle("hidden");
$("cardNext").onclick=()=>{if(studyState.cards.length){cardIndex=(cardIndex+1)%studyState.cards.length;renderMemory()}};
$("cardDelete").onclick=()=>{if(!studyState.cards.length)return;const removed=studyState.cards[cardIndex];studyState.cards.splice(cardIndex,1);if(cardIndex>=studyState.cards.length)cardIndex=Math.max(0,studyState.cards.length-1);saveStudy();renderMemory();toast(`「${removed.front}」を削除したよ`)};
$("weakAddBtn").onclick=()=>{const t=$("weakText").value.trim();if(!t)return toast("苦手な内容を書いてね");studyState.weak.unshift({id:uid(),text:t,subject:$("weakSubject").value});$("weakText").value="";saveStudy();renderMemory();renderStudyExtras()};
document.addEventListener("click",e=>{const d=e.target.closest("[data-weak-delete]");if(d){studyState.weak=studyState.weak.filter(x=>x.id!==d.dataset.weakDelete);saveStudy();renderMemory();renderStudyExtras()}});
document.querySelectorAll(".quiz-action").forEach(b=>b.onclick=()=>startReviewGame(b.dataset.quiz,b.textContent));

function startReviewGame(type,label){
 if(!studyState.cards.length)return $("quizArea").innerHTML=`<b>${esc(label)}</b><p>まずフラッシュカードを1枚以上登録してね。</p>`;
 let pool=[...studyState.cards];
 if(type==="wrong"&&studyState.weak.length) pool=pool.filter(c=>studyState.weak.some(w=>c.front.includes(w.text)||c.back.includes(w.text)))||pool;
 const c=pool[Math.floor(Math.random()*pool.length)];
 $("quizArea").innerHTML=`<h3>${esc(label)}</h3><p>問題：<b>${esc(c.front)}</b></p><input id="reviewAnswer" placeholder="答えを入力"><button class="primary" id="reviewCheck">答え合わせ</button><div id="reviewResult"></div>`;
 $("reviewCheck").onclick=()=>{const a=$("reviewAnswer").value.trim();$("reviewResult").innerHTML=a===c.back?`<p>🎉 正解！</p>`:`<p>答え：<b>${esc(c.back)}</b></p>`};
}

function renderFormulas(){
 const defaults=[
  ["二次方程式","x = (-b ± √(b²-4ac)) / 2a"],
  ["因数分解","a²-b² = (a-b)(a+b)"],
  ["円","面積 = πr² / 円周 = 2πr"]
 ];
 $("formulaList").innerHTML=defaults.map(x=>`<div class="formula-list"><b>${esc(x[0])}</b> ${esc(x[1])}</div>`).join("")+
 studyState.formulas.map((x,i)=>`<div class="formula-list"><b>${esc(x.name)}</b> ${esc(x.text)} <button class="action" data-formula-delete="${i}">削除</button></div>`).join("");
}
$("formulaAddBtn")?.addEventListener("click",()=>{const n=$("formulaName").value.trim(),t=$("formulaText").value.trim();if(!n||!t)return toast("公式名と公式を入力してね");studyState.formulas.push({id:uid(),name:n,text:t});$("formulaName").value="";$("formulaText").value="";saveStudy();renderFormulas();toast("数学公式を追加したよ！")});
document.addEventListener("click",e=>{const b=e.target.closest("[data-formula-delete]");if(b){studyState.formulas.splice(Number(b.dataset.formulaDelete),1);saveStudy();renderFormulas()}});

function renderFocus(){const m=Math.floor(studyState.focusSeconds/60),s=studyState.focusSeconds%60;$("focusTime").textContent=`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;$("focusSessions").textContent=studyState.focusSessions+"回";$("focusToday").textContent=studyState.focusToday+"分";$("focusCount").textContent=studyState.focusSessions+"回"}function focusTick(){if(studyState.focusSeconds<=0){clearInterval(studyState.focusTimer);studyState.focusRunning=false;studyState.focusSessions++;studyState.focusToday+=Number($("focusMinutes").value)||25;saveStudy();renderFocus();toast("集中時間終了！休憩しよう☕");return}studyState.focusSeconds--;renderFocus()}$("focusStart").onclick=()=>{if(studyState.focusRunning)return;studyState.focusRunning=true;clearInterval(studyState.focusTimer);studyState.focusTimer=setInterval(focusTick,1000)};$("focusPause").onclick=()=>{studyState.focusRunning=false;clearInterval(studyState.focusTimer)};$("focusReset").onclick=()=>{studyState.focusRunning=false;clearInterval(studyState.focusTimer);studyState.focusSeconds=(Number($("focusMinutes").value)||25)*60;renderFocus()};$("focusApply").onclick=()=>{studyState.focusRunning=false;clearInterval(studyState.focusTimer);studyState.focusSeconds=(Number($("focusMinutes").value)||25)*60;renderFocus();toast("集中時間を設定したよ！")};
function renderRecords(){const mine=studyLogs.filter(x=>x.uid===currentUser?.uid),total=mine.reduce((s,x)=>s+(x.minutes||0),0);$("recordTotal").textContent=total+"分";$("recordBest").textContent=Math.max(0,...mine.map(x=>x.minutes||0))+"分";$("recordDays").textContent=new Set(mine.map(x=>new Date(x.createdAt).toISOString().slice(0,10))).size+"日";$("recordGoal").textContent=(studyState.goal?Math.min(100,Math.round(total/studyState.goal*100)):0)+"%";const sub={};mine.forEach(x=>sub[x.subject]=(sub[x.subject]||0)+(x.minutes||0));const max=Math.max(1,...Object.values(sub));$("subjectStats").innerHTML=Object.entries(sub).map(([k,v])=>`<div><div class="bar-label"><b>${esc(k)}</b><span>${v}分</span></div><div class="bar-track"><div class="bar-fill" style="width:${v/max*100}%"></div></div></div>`).join("")||`<p class="muted">記録すると教科別に表示されるよ。</p>`;$("scoreList").innerHTML=studyState.scores.map((x,i)=>`<div class="study-row"><span>📝 ${esc(x.name)}</span><b>${x.score}点 / 目標${x.goal}点</b><button class="action" data-score-delete="${i}">削除</button></div>`).join("")||`<p class="muted">まだテスト記録がないよ。</p>`;$("scoreChart").innerHTML=studyState.scores.slice(-10).map(x=>`<div class="score-bar" style="height:${Math.max(8,x.score)}%"><span>${x.score}</span></div>`).join("")||`<span class="muted">点数を追加するとグラフが出るよ。</span>`}$("scoreAddBtn").onclick=()=>{const n=$("scoreName").value.trim(),s=Number($("scoreValue").value),g=Number($("scoreGoal").value)||100;if(!n||Number.isNaN(s))return toast("テスト名と点数を入力してね");studyState.scores.push({name:n,score:s,goal:g});$("scoreName").value="";$("scoreValue").value="";$("scoreGoal").value="";saveStudy();renderRecords();toast("点数を記録したよ！")};document.addEventListener("click",e=>{const d=e.target.closest("[data-score-delete]");if(d){studyState.scores.splice(Number(d.dataset.scoreDelete),1);saveStudy();renderRecords()}});
function renderCommunity(){
 $("recruitList").innerHTML=studyState.recruits.map(x=>`<div class="study-row"><span>🤝 ${esc(x.text)} <small class="muted">#${esc(x.subject)}</small></span><button class="action">参加</button></div>`).join("")||`<p class="muted">募集はまだないよ。</p>`;
 $("studyQuestionList").innerHTML=studyState.studyQuestions.map(x=>`<div class="study-row"><span><b>❓ ${esc(x.title)}</b><br>${esc(x.body)}</span></div>`).join("")||`<p class="muted">質問はまだないよ。</p>`;
 $("recommendList").innerHTML=studyState.recommendations.map((x,i)=>`<div class="panel"><b>${esc(x.title)}</b><small class="muted"> ${esc(x.type)}・${esc(x.subject)}</small><p>${esc(x.body)}</p><button class="action" data-recommend-delete="${i}">削除</button></div>`).join("")||`<p class="muted">まだおすすめがないよ。最初の1件を追加してみよう！</p>`;
}
$("recruitBtn").onclick=()=>{const t=$("studyRecruit").value.trim();if(!t)return toast("募集内容を書いてね");studyState.recruits.unshift({text:t,subject:$("recruitSubject").value});$("studyRecruit").value="";saveStudy();renderCommunity();toast("募集を投稿したよ！")};
$("studyQuestionBtn").onclick=()=>{const t=$("studyQuestion").value.trim(),b=$("studyQuestionBody").value.trim();if(!t||!b)return toast("質問を書いてね");studyState.studyQuestions.unshift({title:t,body:b});$("studyQuestion").value="";$("studyQuestionBody").value="";saveStudy();renderCommunity();toast("質問を投稿したよ！")};
$("recommendBtn")?.addEventListener("click",()=>{const t=$("recommendTitle").value.trim(),b=$("recommendBody").value.trim();if(!t||!b)return toast("名前と内容を入力してね");const types={book:"📖 参考書・教材",method:"💡 勉強法",test:"🎯 テスト対策"};studyState.recommendations.unshift({title:t,body:b,type:types[$("recommendType").value],subject:$("recommendSubject").value});$("recommendTitle").value="";$("recommendBody").value="";saveStudy();renderCommunity();toast("おすすめを追加したよ！")});
document.addEventListener("click",e=>{const d=e.target.closest("[data-recommend-delete]");if(d){studyState.recommendations.splice(Number(d.dataset.recommendDelete),1);saveStudy();renderCommunity()}});

const gameData={
 typing:{title:"⌨️ タイピング",desc:"表示された単語を正確に入力してタイムを測ろう。",start:()=>{
   const words=["study","school","math","english","science"];let i=0,t0=Date.now();
   $("gameArea").innerHTML=`<h2>⌨️ タイピング</h2><p id="gamePrompt">${words[0]}</p><input id="gameInput" autofocus placeholder="ここに入力"><p id="gameStatus">1 / ${words.length}</p>`;
   $("gameInput").onkeydown=e=>{if(e.key!=="Enter")return;if(e.target.value!==words[i])return toast("文字が違うよ！");i++;e.target.value="";if(i===words.length){$("gameArea").innerHTML=`<h2>🎉 クリア！</h2><p>タイム：<b>${((Date.now()-t0)/1000).toFixed(2)}秒</b></p><button class="primary" id="gameRestart">もう一度</button>`;$("gameRestart").onclick=()=>gameData.typing.start()}else{$("gamePrompt").textContent=words[i];$("gameStatus").textContent=`${i+1} / ${words.length}`}};
 }},
 math:{title:"➗ 計算タイム",desc:"5問の計算をできるだけ速く解こう。",start:()=>startMathGame()},
 memory:{title:"🧠 記憶ゲーム",desc:"数字を覚えてから入力する記憶力ゲーム。",start:()=>startMemoryGame()},
 quiz:{title:"❓ 学校クイズ",desc:"登録したフラッシュカードから出題。",start:()=>startStudyQuiz()},
 reaction:{title:"⚡ 反射神経",desc:"合図が出たらすぐ押そう。",start:()=>startReactionGame()},
 words:{title:"🔤 英単語チャレンジ",desc:"英単語の意味を答えよう。",start:()=>startWordGame()}
};
function gameShell(g){$("gameArea").innerHTML=`<h2>${g.title}</h2><p>${g.desc}</p><button class="primary" id="gameStartBtn">スタート</button>`;$("gameStartBtn").onclick=g.start}
document.querySelectorAll(".game-card").forEach(b=>b.onclick=()=>gameShell(gameData[b.dataset.game]));
function finishGame(score){studyState.scores.push({name:"学習ゲーム",score:score,goal:100});saveStudy();renderRecords?.();toast(`スコア ${score}！`)}
function startMathGame(){
 const qs=[["7 × 8",56],["12 × 6",72],["45 ÷ 5",9],["15 + 28",43],["90 - 37",53]];let i=0,score=0;
 const draw=()=>{$("gameArea").innerHTML=`<h2>➗ 計算タイム</h2><p>第${i+1}問：<b>${qs[i][0]} = ?</b></p><input id="gameInput" type="number" autofocus><button class="primary" id="gameCheck">回答</button><p>正解：${score} / 5</p>`;$("gameCheck").onclick=()=>{if(Number($("gameInput").value)===qs[i][1])score++;i++;if(i>=qs.length){$("gameArea").innerHTML=`<h2>🎉 終了！</h2><p>5問中 <b>${score}問正解</b>！</p><button class="primary" id="gameRestart">もう一度</button>`;finishGame(score*20);$("gameRestart").onclick=startMathGame}else draw()};$("gameInput").onkeydown=e=>{if(e.key==="Enter")$("gameCheck").click()}};draw();
}
function startMemoryGame(){
 const n=String(Math.floor(100000+Math.random()*900000));$("gameArea").innerHTML=`<h2>🧠 記憶ゲーム</h2><p>この6桁を10秒で覚えてね。</p><div class="study-number">${n}</div><p id="memCount">10秒</p>`;
 let left=10;const timer=setInterval(()=>{left--;$("memCount").textContent=left+"秒";if(left<=0){clearInterval(timer);$("gameArea").innerHTML=`<h2>🧠 入力！</h2><input id="gameInput" maxlength="6" inputmode="numeric" autofocus><button class="primary" id="gameCheck">回答</button>`;$("gameCheck").onclick=()=>{const ok=$("gameInput").value===n;$("gameArea").innerHTML=`<h2>${ok?"🎉 正解！":"😵 惜しい！"}</h2><p>正解は <b>${n}</b></p><button class="primary" id="gameRestart">もう一度</button>`;finishGame(ok?100:0);$("gameRestart").onclick=startMemoryGame}},1000);
}
function startStudyQuiz(){
 if(!studyState.cards.length){$("gameArea").innerHTML=`<h2>❓ 学校クイズ</h2><p>まずフラッシュカードを登録してね。</p>`;return}
 let pool=[...studyState.cards],i=0,score=0;
 const draw=()=>{const c=pool[i];$("gameArea").innerHTML=`<h2>❓ 学校クイズ</h2><p>第${i+1}問：<b>${esc(c.front)}</b></p><input id="gameInput" placeholder="答え"><button class="primary" id="gameCheck">回答</button>`;$("gameCheck").onclick=()=>{if($("gameInput").value.trim()===c.back.trim())score++;i++;if(i>=Math.min(5,pool.length)){finishGame(Math.round(score/Math.min(5,pool.length)*100));$("gameArea").innerHTML=`<h2>🎉 結果</h2><p>${score} / ${Math.min(5,pool.length)}問正解！</p><button class="primary" id="gameRestart">もう一度</button>`;$("gameRestart").onclick=startStudyQuiz}else draw()};};draw();
}
function startReactionGame(){
 $("gameArea").innerHTML=`<h2>⚡ 反射神経</h2><p id="reactionText">「GO」が出るまで待ってね。</p><button id="reactionBtn" class="action" disabled>待機中</button>`;
 const delay=1200+Math.random()*2500;let start=0;setTimeout(()=>{if(!$("reactionBtn"))return;start=performance.now();$("reactionText").textContent="GO!";$("reactionBtn").disabled=false;$("reactionBtn").textContent="押せ！"},delay);
 $("reactionBtn").onclick=()=>{const ms=Math.round(performance.now()-start);$("gameArea").innerHTML=`<h2>⚡ ${ms}ms</h2><p>${ms<300?"すごい！":ms<500?"いい反応！":"もう一回挑戦！"}</p><button class="primary" id="gameRestart">もう一度</button>`;finishGame(Math.max(0,Math.round(100-ms/10)));$("gameRestart").onclick=startReactionGame};
}
function startWordGame(){
 const qs=[["apple","りんご"],["book","本"],["water","水"],["friend","友達"],["school","学校"]];let i=0,score=0;
 const draw=()=>{$("gameArea").innerHTML=`<h2>🔤 英単語チャレンジ</h2><p>${i+1}/5：<b>${qs[i][0]}</b> の意味は？</p><input id="gameInput" autofocus><button class="primary" id="gameCheck">回答</button>`;$("gameCheck").onclick=()=>{if($("gameInput").value.trim()===qs[i][1])score++;i++;if(i===5){finishGame(score*20);$("gameArea").innerHTML=`<h2>🎉 結果</h2><p>${score}/5問正解！</p><button class="primary" id="gameRestart">もう一度</button>`;$("gameRestart").onclick=startWordGame}else draw()};};draw();
}

$("profileSave").onclick=async()=>{const name=$("profileName").value.trim(),bio=$("profileBio").value.trim();if(!name)return toast("表示名を入力してね");try{await updateProfile(currentUser,{displayName:name});await setDoc(doc(db,"users",currentUser.uid),{uid:currentUser.uid,email:currentUser.email,name,bio,updatedAt:serverTimestamp()},{merge:true});userData={name,bio};$("headerName").textContent=name;$("headerAvatar").textContent=name.charAt(0);$("profileAvatar").textContent=name.charAt(0);toast("プロフィールを保存したよ！");renderAll()}catch(e){console.error(e);toast("プロフィール保存に失敗したよ")}};

/* Firebase Auth session */
onAuthStateChanged(auth, async user=>{currentUser=user;if(user){$("authView").classList.add("hidden");$("appView").classList.remove("hidden");try{await hydrate()}catch(e){console.error(e);toast("ユーザー情報の読み込みに失敗したよ")}}else{clearSubscriptions();currentUser=null;selectedDmUser=null;$("appView").classList.add("hidden");$("authView").classList.remove("hidden")}});
