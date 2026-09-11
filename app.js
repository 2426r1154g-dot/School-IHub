/* School-IHub - complete Firebase + local study edition */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, setDoc, getDoc, updateDoc, deleteDoc, query, orderBy, onSnapshot, serverTimestamp, increment, getDocs, limit, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = id => document.getElementById(id);
const on = (id, event, fn) => { const el = $(id); if (el) el.addEventListener(event, fn); };
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c]));
const toast = msg => { const t = $("toast"); if (!t) return; t.textContent = msg; t.classList.add("show"); clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove("show"), 2200); };
const makeId = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : "id_" + Date.now() + Math.random().toString(36).slice(2));
const load = (key, fallback) => { try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; } catch { return fallback; } };
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const asDate = value => { if (!value) return null; if (typeof value.toDate === "function") return value.toDate(); const d = new Date(value); return Number.isNaN(d.getTime()) ? null : d; };
const timeText = value => { const d = asDate(value); if (!d) return "たった今"; const diff = Date.now() - d.getTime(); if (diff < 60000) return "たった今"; if (diff < 3600000) return Math.floor(diff / 60000) + "分前"; if (diff < 86400000) return Math.floor(diff / 3600000) + "時間前"; return d.toLocaleDateString("ja-JP"); };
const dateText = value => { const d = asDate(value); return d ? d.toLocaleString("ja-JP", { dateStyle:"medium", timeStyle:"short" }) : "日時未設定"; };
const dayKey = value => { const d = asDate(value); return d ? d.toLocaleDateString("sv-SE") : ""; };


const UNIVERSITY_CATALOG = [
  {id:"u-tokyo",name:"東京大学",type:"国立",region:"東京",url:"https://www.u-tokyo.ac.jp/",materialUrl:"https://www.u-tokyo.ac.jp/ja/admissions/undergraduate/e01_06_01.html",desc:"大学案内・選抜要項・募集要項"},
  {id:"kyoto",name:"京都大学",type:"国立",region:"京都",url:"https://www.kyoto-u.ac.jp/ja",materialUrl:"https://www.kyoto-u.ac.jp/ja/admissions/about/admission",desc:"受験生向け大学案内・入試情報"},
  {id:"osaka",name:"大阪大学",type:"国立",region:"大阪",url:"https://www.osaka-u.ac.jp/ja",materialUrl:"https://www.osaka-u.ac.jp/ja/admissions/yourOU/d_pamphlet",desc:"大学案内デジタルパンフレット"},
  {id:"okayama",name:"岡山大学",type:"国立",region:"岡山",url:"https://www.okayama-u.ac.jp/",materialUrl:"https://www.okayama-u.ac.jp/tp/admission/",desc:"入試・大学案内・学部案内"},
  {id:"kobe",name:"神戸大学",type:"国立",region:"兵庫",url:"https://www.kobe-u.ac.jp/",materialUrl:"https://www.kobe-u.ac.jp/ja/admissions/",desc:"入試・受験生向け情報"},
  {id:"hiroshima",name:"広島大学",type:"国立",region:"広島",url:"https://www.hiroshima-u.ac.jp/",materialUrl:"https://www.hiroshima-u.ac.jp/admission",desc:"入試・受験生向け情報"},
  {id:"kyushu",name:"九州大学",type:"国立",region:"福岡",url:"https://www.kyushu-u.ac.jp/ja/",materialUrl:"https://www.kyushu-u.ac.jp/ja/admission/",desc:"入試・受験生向け情報"},
  {id:"tohoku",name:"東北大学",type:"国立",region:"宮城",url:"https://www.tohoku.ac.jp/japanese/",materialUrl:"https://www.tnc.tohoku.ac.jp/",desc:"受験生向け入試情報"},
  {id:"waseda",name:"早稲田大学",type:"私立",region:"東京",url:"https://www.waseda.jp/top/",materialUrl:"https://www.waseda.jp/inst/admission/",desc:"入学センター・入試情報"},
  {id:"keio",name:"慶應義塾大学",type:"私立",region:"東京",url:"https://www.keio.ac.jp/ja/",materialUrl:"https://www.keio.ac.jp/ja/admissions/",desc:"入学案内・入試情報"},
  {id:"okayama-pref",name:"岡山県立大学",type:"公立",region:"岡山",url:"https://www.oka-pu.ac.jp/",materialUrl:"https://www.oka-pu.ac.jp/admission/",desc:"入試・大学案内"},
  {id:"osaka-metro",name:"大阪公立大学",type:"公立",region:"大阪",url:"https://www.omu.ac.jp/",materialUrl:"https://www.omu.ac.jp/admissions/",desc:"入試・受験生向け情報"}
];


// 全国検索用の大学データ（主要大学を収録。追加後は詳細データを編集可能）
const NATIONAL_UNIVERSITIES = [
  ['北海道','国立','北海道大学'],['北海道','公立','札幌市立大学'],['北海道','私立','北海学園大学'],
  ['青森','国立','弘前大学'],['青森','公立','青森県立保健大学'],['青森','私立','青森大学'],
  ['岩手','国立','岩手大学'],['岩手','私立','岩手医科大学'],
  ['宮城','国立','東北大学'],['宮城','公立','宮城大学'],['宮城','私立','東北学院大学'],
  ['秋田','国立','秋田大学'],['秋田','公立','秋田県立大学'],
  ['山形','国立','山形大学'],['山形','私立','東北芸術工科大学'],
  ['福島','国立','福島大学'],['福島','私立','奥羽大学'],
  ['茨城','国立','筑波大学'],['茨城','国立','茨城大学'],['茨城','私立','常磐大学'],
  ['栃木','国立','宇都宮大学'],['栃木','私立','自治医科大学'],
  ['群馬','国立','群馬大学'],['群馬','私立','高崎健康福祉大学'],
  ['埼玉','国立','埼玉大学'],['埼玉','公立','埼玉県立大学'],['埼玉','私立','獨協大学'],
  ['千葉','国立','千葉大学'],['千葉','私立','千葉工業大学'],
  ['東京','国立','東京大学'],['東京','国立','東京工業大学'],['東京','国立','一橋大学'],['東京','私立','早稲田大学'],['東京','私立','慶應義塾大学'],['東京','私立','上智大学'],['東京','私立','明治大学'],['東京','私立','青山学院大学'],['東京','私立','立教大学'],['東京','私立','中央大学'],
  ['神奈川','国立','横浜国立大学'],['神奈川','公立','横浜市立大学'],['神奈川','私立','神奈川大学'],['神奈川','私立','東海大学'],
  ['新潟','国立','新潟大学'],['新潟','公立','新潟県立大学'],
  ['富山','国立','富山大学'],['石川','国立','金沢大学'],['石川','公立','石川県立大学'],
  ['福井','国立','福井大学'],['福井','私立','福井工業大学'],
  ['山梨','国立','山梨大学'],['山梨','私立','山梨学院大学'],
  ['長野','国立','信州大学'],['長野','公立','長野県立大学'],
  ['岐阜','国立','岐阜大学'],['岐阜','私立','岐阜聖徳学園大学'],
  ['静岡','国立','静岡大学'],['静岡','公立','静岡県立大学'],['静岡','私立','常葉大学'],
  ['愛知','国立','名古屋大学'],['愛知','国立','名古屋工業大学'],['愛知','公立','名古屋市立大学'],['愛知','私立','南山大学'],['愛知','私立','中京大学'],
  ['三重','国立','三重大学'],['三重','私立','皇學館大学'],
  ['滋賀','国立','滋賀大学'],['滋賀','公立','滋賀県立大学'],
  ['京都','国立','京都大学'],['京都','国立','京都工芸繊維大学'],['京都','私立','同志社大学'],['京都','私立','立命館大学'],
  ['大阪','国立','大阪大学'],['大阪','公立','大阪公立大学'],['大阪','私立','関西大学'],['大阪','私立','近畿大学'],['大阪','私立','大阪工業大学'],
  ['兵庫','国立','神戸大学'],['兵庫','公立','兵庫県立大学'],['兵庫','私立','関西学院大学'],['兵庫','私立','甲南大学'],
  ['奈良','国立','奈良女子大学'],['奈良','国立','奈良教育大学'],['奈良','私立','近畿大学農学部'],
  ['和歌山','国立','和歌山大学'],['和歌山','私立','和歌山信愛大学'],
  ['鳥取','国立','鳥取大学'],['鳥取','私立','鳥取看護大学'],
  ['島根','国立','島根大学'],['島根','私立','松江赤十字看護専門学校'],
  ['岡山','国立','岡山大学'],['岡山','公立','岡山県立大学'],['岡山','私立','ノートルダム清心女子大学'],['岡山','私立','川崎医科大学'],
  ['広島','国立','広島大学'],['広島','公立','県立広島大学'],['広島','私立','広島修道大学'],
  ['山口','国立','山口大学'],['山口','公立','山口県立大学'],
  ['徳島','国立','徳島大学'],['徳島','公立','徳島県立総合看護学校'],
  ['香川','国立','香川大学'],['香川','私立','四国学院大学'],
  ['愛媛','国立','愛媛大学'],['愛媛','私立','松山大学'],
  ['高知','国立','高知大学'],['高知','私立','高知学園大学'],
  ['福岡','国立','九州大学'],['福岡','公立','福岡県立大学'],['福岡','私立','福岡大学'],['福岡','私立','西南学院大学'],
  ['佐賀','国立','佐賀大学'],['佐賀','私立','西九州大学'],
  ['長崎','国立','長崎大学'],['長崎','公立','長崎県立大学'],
  ['熊本','国立','熊本大学'],['熊本','私立','熊本学園大学'],
  ['大分','国立','大分大学'],['大分','公立','大分県立看護科学大学'],
  ['宮崎','国立','宮崎大学'],['宮崎','公立','宮崎公立大学'],
  ['鹿児島','国立','鹿児島大学'],['鹿児島','私立','志學館大学'],
  ['沖縄','国立','琉球大学'],['沖縄','公立','名桜大学']
].map(([region,type,name],i)=>({id:'national-'+i,name,type,region,url:'https://portraits.niad.ac.jp/',materialUrl:'https://portraits.niad.ac.jp/',desc:'大学ポートレート等の公的な大学情報から確認できます。'}));

function getSearchUniversities(){
  const custom=getCustomUniversities();
  const map=new Map();
  [...NATIONAL_UNIVERSITIES,...UNIVERSITY_CATALOG,...custom].forEach(u=>map.set(u.name+'|'+(u.region||''),u));
  return [...map.values()];
}
function renderNationalSearch(){
  const root=$("nationalUniversityResults"); if(!root)return;
  const q=($("nationalUniversitySearch")?.value||'').trim().toLowerCase();
  const region=$("nationalUniversityRegion")?.value||'all';
  const type=$("nationalUniversityType")?.value||'all';
  const list=getSearchUniversities().filter(u=>{
    const text=[u.name,u.region,u.type,u.faculty||''].join(' ').toLowerCase();
    return (!q||text.includes(q))&& (region==='all'||u.region===region) && (type==='all'||u.type===type);
  });
  $("nationalUniversityResultCount")&&( $("nationalUniversityResultCount").textContent=`${list.length}校` );
  if(!list.length){root.innerHTML='<div class="empty">条件に一致する大学がないよ。検索語や地域を変えてみて！</div>';return;}
  root.innerHTML=list.slice(0,200).map(u=>renderUniversityCard(u,isFavoriteUniversity(u.id))).join('');
  bindUniversityButtons();
}
function bindUniversityButtons(){
  document.querySelectorAll('[data-university-add]').forEach(b=>b.onclick=()=>addFavoriteUniversity(b.dataset.universityAdd));
  document.querySelectorAll('[data-university-remove]').forEach(b=>b.onclick=()=>removeFavoriteUniversity(b.dataset.universityRemove));
  document.querySelectorAll('[data-university-edit]').forEach(b=>b.onclick=()=>editCustomUniversity(b.dataset.universityEdit));
  document.querySelectorAll('[data-university-delete]').forEach(b=>b.onclick=()=>deleteCustomUniversity(b.dataset.universityDelete));
}

let currentUser = null;
let favoriteUniversities = load("schoolhub_favorite_universities", []);
let userData = { name:"学生", bio:"" };
let posts = [], questions = [], events = [], studyLogs = [], users = [];
let boardFilter = "new", selectedDmUser = null;
let unsubscribers = [], dmUnsub = null, usersUnsub = null;


/* ---------- 志望校 ---------- */
function getAllUniversities(){
  const custom = load("schoolhub_custom_universities", []);
  return [...UNIVERSITY_CATALOG, ...custom];
}
function isFavoriteUniversity(id){ return favoriteUniversities.some(x => x.id === id); }
function saveUniversities(){ save("schoolhub_favorite_universities", favoriteUniversities); }
function renderUniversityCard(u, favorite=false){
  const star = favorite ? "⭐" : "☆";
  const isCustom = String(u.id||"").startsWith("custom-");
  const meta = [u.region, u.type].filter(Boolean).map(esc).join(" ・ ");
  const details = [
    u.faculty ? `🎓 ${esc(u.faculty)}` : "",
    u.admission ? `📝 ${esc(u.admission)}` : "",
    u.tuition ? `💰 ${esc(u.tuition)}` : "",
    u.difficulty ? `📊 ${esc(u.difficulty)}` : ""
  ].filter(Boolean).join("<br>");
  return `<article class="university-card">
    <div class="university-head">
      <div>
        <h3 class="university-name">${esc(u.name)}</h3>
        <div class="university-meta">${meta || "大学情報"}</div>
      </div>
      <span class="favorite-star">${star}</span>
    </div>
    ${details ? `<div class="university-details">${details}</div>` : ""}
    <div class="small muted">${esc(u.desc||"大学の公式情報を確認できます。")}</div>
    <div class="university-actions">
      <a href="${esc(u.url||'#')}" target="_blank" rel="noopener noreferrer">🌐 公式サイト</a>
      <a href="${esc(u.materialUrl||u.url||'#')}" target="_blank" rel="noopener noreferrer">📚 入試・資料</a>
      ${u.openCampusUrl ? `<a href="${esc(u.openCampusUrl)}" target="_blank" rel="noopener noreferrer">🏫 オープンキャンパス</a>` : ""}
      ${favorite ? `<button class="danger-mini" data-university-remove="${esc(u.id)}">登録解除</button>` : `<button class="primary-mini" data-university-add="${esc(u.id)}">⭐ 志望校に追加</button>`}
      ${isCustom ? `<button class="secondary-mini" data-university-edit="${esc(u.id)}">編集</button><button class="danger-mini" data-university-delete="${esc(u.id)}">データ削除</button>` : ""}
    </div>
  </article>`;
}

function renderUniversities(){
  const favorites=$("favoriteUniversities");
  const empty=$("favoriteUniversitiesEmpty");
  const count=$("universityCount");
  if(favorites){ favorites.innerHTML=favoriteUniversities.map(u=>renderUniversityCard(u,true)).join(''); }
  if(empty) empty.classList.toggle('hidden', favoriteUniversities.length>0);
  if(count) count.textContent=`${favoriteUniversities.length}校`;
  const q=($("universitySearch")?.value||'').trim().toLowerCase();
  const type=$("universityTypeFilter")?.value||'all';
  const list=UNIVERSITY_CATALOG.filter(u=>{const text=[u.name,u.region,u.type].join(' ').toLowerCase();return (!q||text.includes(q))&&(type==='all'||u.type===type);});
  const catalog=$("universityCatalog");
  if(catalog) catalog.innerHTML=list.map(u=>renderUniversityCard(u,isFavoriteUniversity(u.id))).join('');
  bindUniversityButtons();
  renderNationalSearch();
}

function getCustomUniversities(){ return load("schoolhub_custom_universities", []); }
function saveCustomUniversities(list){ save("schoolhub_custom_universities", list); }

function addFavoriteUniversity(id){
  const u=getAllUniversities().find(x=>x.id===id); if(!u)return;
  if(!isFavoriteUniversity(id)){ favoriteUniversities.push(u); saveUniversities(); renderUniversities(); toast(`${u.name}を志望校に登録したよ！`); }
}
function removeFavoriteUniversity(id){
  const u=getAllUniversities().find(x=>x.id===id);
  favoriteUniversities=favoriteUniversities.filter(x=>x.id!==id); saveUniversities(); renderUniversities();
  if(u)toast(`${u.name}を志望校から外したよ`);
}
function addCustomUniversity(editId=null){
  const name=$("customUniversityName")?.value.trim();
  const type=$("customUniversityType")?.value||"私立";
  const region=$("customUniversityRegion")?.value.trim()||"";
  const faculty=$("customUniversityFaculty")?.value.trim()||"";
  const admission=$("customUniversityAdmission")?.value.trim()||"";
  const tuition=$("customUniversityTuition")?.value.trim()||"";
  const difficulty=$("customUniversityDifficulty")?.value.trim()||"";
  const desc=$("customUniversityDesc")?.value.trim()||"自分で登録した大学";
  const url=$("customUniversityUrl")?.value.trim()||"#";
  const materialUrl=$("customUniversityMaterialUrl")?.value.trim()||url;
  const openCampusUrl=$("customUniversityOpenCampusUrl")?.value.trim()||"";
  if(!name)return toast("大学名を入力してね");
  for(const x of [url,materialUrl,openCampusUrl]) if(x && x!=="#" && !/^https?:\/\//i.test(x)) return toast("URLはhttps://から入力してね");
  const custom=getCustomUniversities();
  const data={id:editId||"custom-"+makeId(),name,type,region,faculty,admission,tuition,difficulty,desc,url,materialUrl,openCampusUrl};
  if(editId){
    const i=custom.findIndex(x=>x.id===editId); if(i<0)return;
    custom[i]=data;
    favoriteUniversities=favoriteUniversities.map(x=>x.id===editId?data:x); saveUniversities();
    toast(`${name}のデータを更新したよ！`);
  }else{
    custom.push(data);
    favoriteUniversities.push(data); saveUniversities();
    toast(`${name}を登録したよ！`);
  }
  saveCustomUniversities(custom); $("customUniversityForm")?.reset(); $("customUniversityForm")?.removeAttribute("data-edit-id");
  const submit=$("customUniversityForm")?.querySelector("button[type=submit]"); if(submit)submit.textContent="大学データを追加";
  renderUniversities();
}
function editCustomUniversity(id){
  const u=getCustomUniversities().find(x=>x.id===id); if(!u)return;
  const fields={customUniversityName:u.name,customUniversityType:u.type,customUniversityRegion:u.region,customUniversityFaculty:u.faculty,customUniversityAdmission:u.admission,customUniversityTuition:u.tuition,customUniversityDifficulty:u.difficulty,customUniversityDesc:u.desc,customUniversityUrl:u.url==="#"?"":u.url,customUniversityMaterialUrl:u.materialUrl==="#"?"":u.materialUrl,customUniversityOpenCampusUrl:u.openCampusUrl||""};
  Object.entries(fields).forEach(([id,val])=>{if($(id))$(id).value=val||"";});
  $("customUniversityForm")?.setAttribute("data-edit-id",id);
  const submit=$("customUniversityForm")?.querySelector("button[type=submit]"); if(submit)submit.textContent="大学データを更新";
  $("customUniversityName")?.scrollIntoView({behavior:"smooth",block:"center"});
  toast("フォームに大学データを読み込んだよ");
}
function deleteCustomUniversity(id){
  const u=getCustomUniversities().find(x=>x.id===id); if(!u)return;
  if(!confirm(`${u.name}の登録データを削除する？`))return;
  saveCustomUniversities(getCustomUniversities().filter(x=>x.id!==id));
  favoriteUniversities=favoriteUniversities.filter(x=>x.id!==id); saveUniversities(); renderUniversities(); toast("大学データを削除したよ");
}
function exportUniversities(){
  const data={version:1,universities:getCustomUniversities(),favorites:favoriteUniversities};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="school-ihub-universities.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast("大学データを書き出したよ！");
}
async function importUniversities(file){
  try{
    const text=await file.text(), data=JSON.parse(text);
    const incoming=Array.isArray(data)?data:(Array.isArray(data.universities)?data.universities:[]);
    if(!incoming.length)throw new Error("empty");
    const clean=incoming.filter(u=>u&&u.name).map(u=>({...u,id:String(u.id||"custom-"+makeId())}));
    const map=new Map(getCustomUniversities().map(u=>[u.id,u])); clean.forEach(u=>map.set(u.id,u)); saveCustomUniversities([...map.values()]);
    if(Array.isArray(data.favorites)){ const all=[...UNIVERSITY_CATALOG,...map.values()]; favoriteUniversities=data.favorites.map(f=>all.find(u=>u.id===f.id)||f).filter(Boolean); saveUniversities(); }
    renderUniversities();toast(`${clean.length}校の大学データを読み込んだよ！`);
  }catch(e){console.error(e);toast("大学データの読み込みに失敗したよ");}
}

/* ---------- navigation ---------- */
function showPage(page) {
  document.querySelectorAll(".page").forEach(el => el.classList.toggle("active", el.id === "page-" + page));
  document.querySelectorAll(".nav").forEach(el => el.classList.toggle("active", el.dataset.page === page));
  if (location.hash !== "#" + page) history.replaceState(null, "", "#" + page);
  if (page === "dm") renderDM();
  if (page === "universities") { renderUniversities(); renderNationalSearch(); }
}
document.querySelectorAll(".nav").forEach(btn => btn.addEventListener("click", () => showPage(btn.dataset.page)));
document.querySelectorAll("[data-go]").forEach(btn => btn.addEventListener("click", () => showPage(btn.dataset.go)));
on("mobileMenu", "click", () => document.querySelector(".sidebar")?.classList.toggle("open"));

on("nationalUniversitySearch","input",renderNationalSearch);
on("nationalUniversityRegion","change",renderNationalSearch);
on("nationalUniversityType","change",renderNationalSearch);
on("openNationalSearch","click",()=>{ showPage("universities"); $("nationalUniversitySearch")?.focus(); });



/* ---------- authentication ---------- */
let authMode = "login";
document.querySelectorAll(".tab").forEach(tab => tab.addEventListener("click", () => {
  document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
  tab.classList.add("active");
  authMode = tab.dataset.auth;
  $("authSubmit").textContent = authMode === "login" ? "ログイン" : "アカウントを作成";
  $("nameField")?.classList.toggle("hidden", authMode === "login");
}));

on("authForm", "submit", async e => {
  e.preventDefault();
  const email = $("authEmail")?.value.trim().toLowerCase();
  const password = $("authPassword")?.value || "";
  const name = $("authName")?.value.trim() || "学生";
  if (!email || !password) return toast("メールアドレスとパスワードを入力してね");
  try {
    if (authMode === "signup") {
      if (password.length < 6) return toast("パスワードは6文字以上にしてね");
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      await setDoc(doc(db, "users", cred.user.uid), { uid: cred.user.uid, email: cred.user.email, name, bio:"", createdAt:serverTimestamp(), updatedAt:serverTimestamp() });
      toast("アカウントを作成したよ！");
    } else {
      await signInWithEmailAndPassword(auth, email, password);
      toast("ログインしたよ！");
    }
  } catch (err) {
    console.error(err);
    const messages = {
      "auth/email-already-in-use":"そのメールアドレスは登録済みだよ",
      "auth/invalid-credential":"メールアドレスまたはパスワードが違うよ",
      "auth/invalid-email":"メールアドレスを確認してね",
      "auth/weak-password":"パスワードは6文字以上にしてね",
      "auth/network-request-failed":"ネットワーク接続を確認してね",
      "auth/operation-not-allowed":"Firebase AuthenticationのEmail/Passwordを有効にしてね"
    };
    toast(messages[err.code] || "認証に失敗したよ。Consoleを確認してね");
  }
});
on("logoutBtn", "click", async () => { try { await signOut(auth); toast("ログアウトしたよ"); } catch (e) { console.error(e); toast("ログアウトに失敗したよ"); } });

const applyTheme = theme => document.body.classList.toggle("dark", theme === "dark");
on("themeBtn", "click", () => { const dark = !document.body.classList.contains("dark"); applyTheme(dark ? "dark" : "light"); localStorage.setItem("sh_theme", dark ? "dark" : "light"); });
applyTheme(localStorage.getItem("sh_theme") || "light");

/* ---------- Firebase data ---------- */
async function loadUserData() {
  const ref = doc(db, "users", currentUser.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    userData = { name:data.name || currentUser.displayName || "学生", bio:data.bio || "" };
  } else {
    userData = { name:currentUser.displayName || "学生", bio:"" };
    await setDoc(ref, { uid:currentUser.uid, email:currentUser.email || "", name:userData.name, bio:"", createdAt:serverTimestamp(), updatedAt:serverTimestamp() }, { merge:true });
  }
}
function clearSubscriptions() {
  unsubscribers.forEach(fn => { try { fn?.(); } catch {} });
  unsubscribers = [];
  if (dmUnsub) { dmUnsub(); dmUnsub = null; }
  if (usersUnsub) { usersUnsub(); usersUnsub = null; }
}
function subscribeCore() {
  clearSubscriptions();
  const watch = (q, key, errorText) => {
    const unsub = onSnapshot(q, snap => {
      const value = snap.docs.map(d => ({ id:d.id, ...d.data() }));
      if (key === "posts") posts = value;
      if (key === "questions") questions = value;
      if (key === "events") events = value;
      if (key === "studyLogs") studyLogs = value;
      renderAll();
    }, err => { console.error(key, err); toast(errorText || "データの読み込みに失敗したよ"); });
    unsubscribers.push(unsub);
  };
  watch(query(collection(db,"posts"), orderBy("createdAt","desc")), "posts", "掲示板を読み込めなかったよ");
  watch(query(collection(db,"questions"), orderBy("createdAt","desc")), "questions", "質問箱を読み込めなかったよ");
  watch(query(collection(db,"events"), orderBy("date","asc")), "events", "イベントを読み込めなかったよ");
  watch(query(collection(db,"studyLogs"), orderBy("createdAt","desc")), "studyLogs", "勉強記録を読み込めなかったよ");
  usersUnsub = onSnapshot(query(collection(db,"users"), limit(100)), snap => { users = snap.docs.map(d => ({id:d.id,...d.data()})).filter(u => u.uid !== currentUser.uid); if ($("page-dm")?.classList.contains("active")) renderDM(); }, err => { console.error("users", err); toast("ユーザー一覧を読み込めなかったよ"); });
}
async function hydrate() {
  await loadUserData();
  $("headerName").textContent = userData.name;
  $("headerAvatar").textContent = userData.name.charAt(0) || "学";
  $("profileName").value = userData.name;
  $("profileBio").value = userData.bio;
  $("profileAvatar").textContent = userData.name.charAt(0) || "学";
  subscribeCore();
  renderAll();
  const hash = location.hash.replace(/^#/, "");
  showPage(["home","board","questions","dm","events","study","ranking","profile"].includes(hash) ? hash : "home");
}

/* ---------- common rendering ---------- */
function renderAll() {
  renderPosts(); renderQuestions(); renderEvents(); renderStudy(); renderRanking(); renderHome(); updateStats();
  renderStudyExtras(); renderTasks(); renderFormulas(); renderMemory(); renderRecords(); renderCommunity(); renderFocus();
  renderProfileStats();
  if ($("page-dm")?.classList.contains("active")) renderDM();
}

/* ---------- board ---------- */
on("postText", "input", e => { $("postChars").textContent = `${e.target.value.length} / 500`; });
on("postBtn", "click", async () => {
  const text = $("postText").value.trim();
  if (!text) return toast("投稿内容を入力してね");
  try {
    await addDoc(collection(db,"posts"), { uid:currentUser.uid, name:userData.name, text, likes:0, likedBy:[], createdAt:serverTimestamp() });
    $("postText").value = ""; $("postChars").textContent = "0 / 500"; toast("投稿したよ！");
  } catch (e) { console.error(e); toast("投稿に失敗したよ"); }
});
document.querySelectorAll(".filter").forEach(btn => btn.addEventListener("click", () => { document.querySelectorAll(".filter").forEach(x => x.classList.remove("active")); btn.classList.add("active"); boardFilter = btn.dataset.filter; renderPosts(); }));
function renderPosts() {
  const list = [...posts];
  if (boardFilter === "popular") list.sort((a,b) => (b.likes||0) - (a.likes||0));
  $("postList").innerHTML = list.map(p => {
    const liked = (p.likedBy || []).includes(currentUser?.uid);
    return `<div class="panel post"><div class="post-head"><div class="avatar">${esc((p.name||"学").charAt(0))}</div><div><div class="post-name">${esc(p.name||"学生")}</div><div class="post-time">${timeText(p.createdAt)}</div></div></div><div class="post-text">${esc(p.text)}</div><div class="post-actions"><button class="action ${liked?"liked":""}" data-like="${p.id}">❤️ ${p.likes||0}</button>${p.uid===currentUser?.uid?`<button class="action" data-delete-post="${p.id}">🗑 削除</button>`:""}</div></div>`;
  }).join("") || `<div class="panel muted">まだ投稿がないよ。</div>`;
}

/* ---------- questions ---------- */
on("questionBtn", "click", async () => {
  const title = $("questionTitle").value.trim(), body = $("questionBody").value.trim();
  if (!title || !body) return toast("タイトルと質問内容を入力してね");
  try { await addDoc(collection(db,"questions"), { uid:currentUser.uid, name:userData.name, title, body, answers:[], createdAt:serverTimestamp() }); $("questionTitle").value=""; $("questionBody").value=""; toast("質問したよ！"); }
  catch (e) { console.error(e); toast("質問の投稿に失敗したよ"); }
});
function renderQuestions() {
  $("questionList").innerHTML = questions.map(q => `<div class="panel question"><div class="post-head"><div class="avatar">❓</div><div><b>${esc(q.name||"学生")}</b><div class="post-time">${timeText(q.createdAt)}</div></div></div><div class="question-title">${esc(q.title)}</div><div class="post-text">${esc(q.body)}</div>${(q.answers||[]).map(a=>`<div class="answer"><b>💡 ${esc(a.name||"学生")}</b><br>${esc(a.text)}</div>`).join("")}<button class="primary" data-answer="${q.id}">回答する</button>${q.uid===currentUser?.uid?` <button class="action" data-delete-question="${q.id}">削除</button>`:""}</div>`).join("") || `<div class="panel muted">まだ質問がないよ。</div>`;
}

/* ---------- events ---------- */
on("eventBtn", "click", async () => {
  const title=$("eventTitle").value.trim(), date=$("eventDate").value, place=$("eventPlace").value.trim();
  if (!title || !date) return toast("イベント名と日時を入力してね");
  try { await addDoc(collection(db,"events"), { uid:currentUser.uid, title, date, place, createdAt:serverTimestamp() }); $("eventTitle").value=""; $("eventDate").value=""; $("eventPlace").value=""; toast("イベントを追加したよ！"); }
  catch (e) { console.error(e); toast("イベントの追加に失敗したよ"); }
});
function renderEvents() {
  $("eventList").innerHTML = events.map(e => `<div class="panel"><div class="event-date">📅 ${dateText(e.date)}</div><div class="event-title">${esc(e.title)}</div><div class="event-place">📍 ${esc(e.place||"場所未定")}</div>${e.uid===currentUser?.uid?`<br><button class="action" data-delete-event="${e.id}">削除</button>`:""}</div>`).join("") || `<div class="panel muted">予定がないよ。</div>`;
}

/* ---------- DM ---------- */
function dmKey(a,b) { return [a,b].sort().join("__"); }
function renderDM() {
  if (!currentUser || !$("dmUserList")) return;
  const search = $("dmUserSearch")?.value.trim().toLowerCase() || "";
  const filtered = users.filter(u => (u.name||"").toLowerCase().includes(search) || (u.email||"").toLowerCase().includes(search));
  $("dmUserList").innerHTML = filtered.map(u => `<button class="dm-user ${selectedDmUser?.uid===u.uid?"active":""}" data-dm-user="${esc(u.uid)}"><span class="avatar">${esc((u.name||"学").charAt(0))}</span><span><b>${esc(u.name||"学生")}</b><small>${esc(u.email||"")}</small></span></button>`).join("") || `<p class="muted">他のユーザーがまだいないよ。</p>`;
  if (selectedDmUser) subscribeDMChat();
}
async function ensureConversation(cid, otherUid) {
  const ref = doc(db,"conversations",cid), snap = await getDoc(ref);
  if (!snap.exists()) await setDoc(ref,{members:[currentUser.uid,otherUid],updatedAt:serverTimestamp(),createdAt:serverTimestamp()});
  else { const members=snap.data().members; if (!Array.isArray(members) || !members.includes(currentUser.uid)) throw new Error("conversation membership invalid"); }
}
async function subscribeDMChat() {
  if (!selectedDmUser) return;
  if (dmUnsub) { dmUnsub(); dmUnsub=null; }
  const cid=dmKey(currentUser.uid,selectedDmUser.uid);
  try { await ensureConversation(cid,selectedDmUser.uid); }
  catch (e) { console.error(e); $("dmMessages").innerHTML=`<div class="muted dm-empty">DMを開始できなかったよ。Firestore Rulesを確認してね。</div>`; return; }
  $("dmAvatar").textContent=(selectedDmUser.name||"学").charAt(0);
  $("dmName").textContent=selectedDmUser.name||"学生";
  $("dmStatus").textContent="オンライン機能対応";
  const ref=collection(db,"conversations",cid,"messages");
  dmUnsub=onSnapshot(query(ref,orderBy("createdAt","asc")), snap => {
    const messages=snap.docs.map(d=>({id:d.id,...d.data()}));
    $("dmMessages").innerHTML=messages.map(m=>`<div class="dm-message ${m.from===currentUser.uid?"mine":"theirs"}"><div>${esc(m.text)}</div><small>${m.createdAt?.toDate?m.createdAt.toDate().toLocaleTimeString("ja-JP",{hour:"2-digit",minute:"2-digit"}):"送信中…"}</small></div>`).join("") || `<div class="muted dm-empty">まだメッセージはないよ。最初の一言を送ろう！</div>`;
    $("dmMessages").scrollTop=$("dmMessages").scrollHeight;
  }, e => { console.error(e); toast("DMを読み込めなかったよ"); });
}
on("dmUserSearch","input",renderDM);
on("dmForm","submit",async e=>{
  e.preventDefault(); if (!selectedDmUser) return toast("相手を選んでね");
  const text=$("dmText").value.trim(); if(!text)return;
  try { const cid=dmKey(currentUser.uid,selectedDmUser.uid); await ensureConversation(cid,selectedDmUser.uid); await addDoc(collection(db,"conversations",cid,"messages"),{from:currentUser.uid,to:selectedDmUser.uid,text,createdAt:serverTimestamp()}); $("dmText").value=""; toast("送信したよ！"); }
  catch(e){ console.error(e); toast("DM送信に失敗したよ。Rulesとログイン状態を確認してね"); }
});

/* ---------- Study Hub ---------- */
const studyState = {
  tasks:load("sh_tasks",[]), cards:load("sh_cards",[]), weak:load("sh_weak",[]), scores:load("sh_scores",[]),
  recruits:load("sh_recruits",[]), studyQuestions:load("sh_study_questions",[]), recommendations:load("sh_recommendations",[]), formulas:load("sh_formulas",[]),
  goal:Number(localStorage.getItem("sh_goal")||600), todayGoal:Number(localStorage.getItem("sh_today_goal")||60),
  focusSeconds:Number(localStorage.getItem("sh_focus_seconds")||1500), focusRunning:false, focusTimer:null,
  focusSessions:Number(localStorage.getItem("sh_focus_sessions")||0), focusToday:Number(localStorage.getItem("sh_focus_today")||0), focusBest:Number(localStorage.getItem("sh_focus_best")||0),
  lastFocusDay:localStorage.getItem("sh_focus_day")||""
};
const saveStudy=()=>{for(const [key,value] of Object.entries({sh_tasks:studyState.tasks,sh_cards:studyState.cards,sh_weak:studyState.weak,sh_scores:studyState.scores,sh_recruits:studyState.recruits,sh_study_questions:studyState.studyQuestions,sh_recommendations:studyState.recommendations,sh_formulas:studyState.formulas}))save(key,value);localStorage.setItem("sh_goal",studyState.goal);localStorage.setItem("sh_today_goal",studyState.todayGoal);localStorage.setItem("sh_focus_seconds",studyState.focusSeconds);localStorage.setItem("sh_focus_sessions",studyState.focusSessions);localStorage.setItem("sh_focus_today",studyState.focusToday);localStorage.setItem("sh_focus_best",studyState.focusBest);localStorage.setItem("sh_focus_day",studyState.lastFocusDay)};
function showStudyTab(tab){document.querySelectorAll(".study-tab").forEach(b=>b.classList.toggle("active",b.dataset.studyTab===tab));document.querySelectorAll(".study-subpage").forEach(x=>x.classList.toggle("active",x.id==="study-"+tab));if(tab==="dashboard")renderStudyExtras();if(tab==="plan")renderTasks();if(tab==="tools")renderFormulas();if(tab==="memory")renderMemory();if(tab==="records")renderRecords();if(tab==="community")renderCommunity();if(tab==="focus")renderFocus();}
document.addEventListener("click",e=>{const b=e.target.closest("[data-study-tab]");if(b)showStudyTab(b.dataset.studyTab);});

function renderStudy(){
  const mine=studyLogs.filter(x=>x.uid===currentUser?.uid), total=mine.reduce((sum,x)=>sum+Number(x.minutes||0),0);
  $("studyBig").textContent=total; $("studyProgress").style.width=Math.min(100,(total/Math.max(1,studyState.goal))*100)+"%";
  $("studyHistory").innerHTML=mine.slice(0,15).map(x=>`<div class="study-row"><span>📚 ${esc(x.subject||"その他")}</span><b>${Number(x.minutes||0)}分</b><span class="post-time">${timeText(x.createdAt)}</span></div>`).join("")||`<p class="muted">まだ記録がないよ。</p>`;
}
function calcStreak(){const dates=new Set(studyLogs.filter(x=>x.uid===currentUser?.uid).map(x=>dayKey(x.createdAt)).filter(Boolean));let d=new Date();let n=0;while(dates.has(d.toLocaleDateString("sv-SE"))){n++;d.setDate(d.getDate()-1);}return n;}
function weekStart(){const d=new Date();const day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);d.setHours(0,0,0,0);return d;}
function renderStudyExtras(){
  if(!currentUser)return;
  const mine=studyLogs.filter(x=>x.uid===currentUser.uid), total=mine.reduce((s,x)=>s+Number(x.minutes||0),0), start=weekStart();
  const week=mine.filter(x=>{const d=asDate(x.createdAt);return d&&d>=start;}).reduce((s,x)=>s+Number(x.minutes||0),0);
  $("weeklyGoalText").textContent=studyState.goal+"分"; $("todayGoal").textContent=studyState.todayGoal+"分"; $("weekStudy").textContent=week+"分"; $("studyPoints").textContent=Math.floor(total)+" pt"; $("studyStreak").textContent=calcStreak()+"日";
  const tasks=studyState.tasks.filter(x=>!x.done).slice(0,5); $("todayTasks").innerHTML=tasks.map(x=>`<div class="study-row"><span>${x.priority==="高"?"🔴":x.priority==="低"?"🟢":"🟡"} ${esc(x.text)}</span><button class="action" data-task-done="${x.id}">完了</button></div>`).join("")||`<p class="muted">今日のタスクはないよ。</p>`;
  $("weakSummary").innerHTML=studyState.weak.slice(0,4).map(x=>`<div class="study-row"><span>📌 ${esc(x.text)}</span><b>${esc(x.subject)}</b></div>`).join("")||`<p class="muted">苦手分野を登録するとここに出るよ。</p>`;
}
function renderTasks(){
  $("goalMinutes").value=studyState.goal; $("todayGoalInput").value=studyState.todayGoal;
  $("taskList").innerHTML=studyState.tasks.map(x=>`<div class="study-row"><span>${x.done?"✅":"⬜"} ${esc(x.text)} <small class="muted">(${esc(x.subject)}・${esc(x.priority)})</small></span><div><button class="action" data-task-done="${x.id}">${x.done?"未完了":"完了"}</button><button class="action" data-task-delete="${x.id}">削除</button></div></div>`).join("")||`<p class="muted">タスクがないよ。</p>`;
  const days=["月","火","水","木","金","土","日"]; $("weekPlan").innerHTML=days.map((d,i)=>{const target=new Date();const monday=weekStart();monday.setDate(monday.getDate()+i);const key=monday.toLocaleDateString("sv-SE");const count=studyState.tasks.filter(t=>!t.done&&t.day===key).length;return `<div><b>${d}</b><p class="muted">${monday.toLocaleDateString("ja-JP",{month:"numeric",day:"numeric"})}</p><strong>${count?count+"件":"予定なし"}</strong></div>`}).join("");
}
on("taskAddBtn","click",()=>{const text=$("taskText").value.trim();if(!text)return toast("タスクを書いてね");const day=new Date().toLocaleDateString("sv-SE");studyState.tasks.unshift({id:makeId(),text,subject:$("taskSubject").value,priority:$("taskPriority").value,done:false,day});$("taskText").value="";saveStudy();renderTasks();renderStudyExtras();toast("タスクを追加したよ！")});
on("goalSaveBtn","click",()=>{studyState.goal=Math.max(10,Number($("goalMinutes").value)||600);studyState.todayGoal=Math.max(10,Number($("todayGoalInput").value)||60);saveStudy();renderStudyExtras();renderStudy();toast("目標を保存したよ！")});
on("clearDoneTasks","click",()=>{studyState.tasks=studyState.tasks.filter(t=>!t.done);saveStudy();renderTasks();renderStudyExtras();toast("完了済みタスクを整理したよ")});

on("studyBtn","click",async()=>{const minutes=Number($("studyMinutes").value),subject=$("studySubject").value;if(!Number.isFinite(minutes)||minutes<1||minutes>1440)return toast("1〜1440分で入力してね");try{await addDoc(collection(db,"studyLogs"),{uid:currentUser.uid,name:userData.name,minutes,subject,createdAt:serverTimestamp()});$("studyMinutes").value="";toast(`${minutes}分記録したよ！`);}catch(e){console.error(e);toast("勉強時間の記録に失敗したよ");}});

/* ---------- study tools ---------- */
function safeCalculate(expression){
  const cleaned=expression.replace(/\s+/g,"");
  if(!cleaned || !/^[0-9+\-*/().%]+$/.test(cleaned) || cleaned.length>100) throw new Error("invalid");
  if(/[*/%]{2,}/.test(cleaned) || /\.{2,}/.test(cleaned)) throw new Error("invalid");
  const result=Function(`"use strict";return (${cleaned})`)();
  if(typeof result!=="number" || !Number.isFinite(result)) throw new Error("invalid");
  return result;
}
on("calcBtn","click",()=>{try{$("calcResult").textContent=safeCalculate($("calcInput").value)}catch{$("calcResult").textContent="計算できない式だよ"}});
on("unitBtn","click",()=>{const v=Number($("unitValue").value),t=$("unitType").value;const f={"cm-m":v/100,"m-cm":v*100,"g-kg":v/1000,"kg-g":v*1000,"ml-l":v/1000,"l-ml":v*1000};$("unitResult").textContent=Number.isFinite(f[t])?f[t]:"—"});
on("graphBtn","click",()=>{const a=Number($("graphA").value),b=Number($("graphB").value),c=Number($("graphC").value);if(![a,b,c].every(Number.isFinite))return toast("係数を入力してね");const points=Array.from({length:161},(_,i)=>{const x=(i-80)/8,y=a*x*x+b*x+c,px=180+x*12,py=80-y*5;return `${i?"L":"M"}${px.toFixed(1)} ${py.toFixed(1)}`}).join(" ");$("graphBox").innerHTML=`<svg viewBox="0 0 360 160" width="100%" height="160" aria-label="二次関数グラフ"><line x1="0" y1="80" x2="360" y2="80" stroke="#aaa"/><line x1="180" y1="0" x2="180" y2="160" stroke="#aaa"/><path d="${points}" fill="none" stroke="#6872e9" stroke-width="3"/></svg>`});

const refs={
 english:{title:"🇬🇧 英語",points:["英単語：意味だけでなく例文とセットで覚える","英文法：時制・助動詞・不定詞・動名詞・関係詞を整理","長文：主語・動詞を先に探し、段落ごとの要点を取る"],method:"毎日10〜20分。単語→文法→短い長文の順で反復しよう。"},
 japanese:{title:"🇯🇵 国語",points:["現代文：接続語と指示語を追って論理を整理","古文：単語・助動詞・敬語を優先","漢字：間違えたものだけを繰り返す"],method:"答え合わせ後に『なぜその答えになるか』を本文に戻って確認しよう。"},
 science:{title:"🧪 理科",points:["物理：公式だけでなく単位と図をセットで確認","化学：元素記号・化学式・反応の関係を整理","生物・地学：用語を図や流れと結びつける"],method:"用語→仕組み→問題の順で確認。計算問題は途中式を残そう。"},
 social:{title:"🌍 社会",points:["歴史：出来事を年号だけでなく原因→結果で整理","地理：地図・統計・気候を関連づける","公民：制度・用語・具体例をセットで覚える"],method:"一問一答だけで終わらず、説明できるか確認すると定着しやすいよ。"},
 math:{title:"📐 数学",points:["公式の意味を確認してから使う","二次関数・図形・確率は典型問題を反復","間違えた問題は解法を一行でメモする"],method:"例題→類題→間違い直しの3段階。途中式を省略しないのがおすすめ。"},
 search:{title:"🔎 用語検索",points:["上の検索欄から登録済みのリファレンスを検索できるよ。","数学・英語・国語・理科・社会のキーワードに対応。"],method:"知りたい用語を入力して検索してみよう。"}
};
function showReference(key,extra=""){const r=refs[key];if(!r)return;$("referenceDetail").innerHTML=`<h3>${esc(r.title)}</h3><ul>${r.points.map(x=>`<li>${esc(x)}</li>`).join("")}</ul><p><b>💡 勉強の進め方：</b>${esc(r.method)}</p>${extra}`;}
document.querySelectorAll(".reference-item").forEach(b=>b.addEventListener("click",()=>showReference(b.dataset.ref)));
function searchReference(){
  const input=$("referenceSearch");
  const q=input ? input.value.trim().toLowerCase() : "";
  if(!q) return toast("検索する用語を入力してね");
  const found=Object.entries(refs).filter(function(entry){
    const r=entry[1];
    return r.title.toLowerCase().includes(q) || r.points.some(function(x){return x.toLowerCase().includes(q);}) || r.method.toLowerCase().includes(q);
  });
  const detail=$("referenceDetail");
  if(!detail) return;
  if(found.length){
    let html="<h3>🔎「"+esc(q)+"」の検索結果</h3>";
    html+=found.map(function(entry){
      const k=entry[0], r=entry[1];
      const hit=r.points.find(function(x){return x.toLowerCase().includes(q);}) || r.method;
      return "<div class=\"study-row\"><span><b>"+esc(r.title)+"</b><br>"+esc(hit)+"</span><button class=\"action\" data-reference-open=\""+esc(k)+"\">開く</button></div>";
    }).join("");
    detail.innerHTML=html;
  }else{
    detail.innerHTML="<h3>🔎「"+esc(q)+"」</h3><p>該当する項目が見つからなかったよ。</p>";
  }
}
on("referenceSearchBtn","click",searchReference);on("referenceSearch","keydown",e=>{if(e.key==="Enter")searchReference()});

function renderFormulas(){const defaults=[["二次方程式","x = (-b ± √(b²-4ac)) / 2a"],["因数分解","a²-b² = (a-b)(a+b)"],["円","面積 = πr² / 円周 = 2πr"]];$("formulaList").innerHTML=defaults.map(x=>`<div class="formula-list"><b>${esc(x[0])}</b> ${esc(x[1])}</div>`).join("")+studyState.formulas.map((x,i)=>`<div class="formula-list"><b>${esc(x.name)}</b> ${esc(x.text)} <button class="action" data-formula-delete="${i}">削除</button></div>`).join("");}
on("formulaAddBtn","click",()=>{const n=$("formulaName").value.trim(),t=$("formulaText").value.trim();if(!n||!t)return toast("公式名と公式を入力してね");studyState.formulas.push({id:makeId(),name:n,text:t});$("formulaName").value="";$("formulaText").value="";saveStudy();renderFormulas();toast("数学公式を追加したよ！")});

/* ---------- flashcards / review ---------- */
let cardIndex=0;
function renderMemory(){const c=studyState.cards[cardIndex];$("cardBox").classList.toggle("hidden",!c);$("cardCount").textContent=studyState.cards.length?`${cardIndex+1} / ${studyState.cards.length} 枚`:"カードはまだないよ。";if(c){$("cardFrontView").textContent=c.front;$("cardBackView").textContent=c.back;$("cardBackView").classList.add("hidden");}$("weakList").innerHTML=studyState.weak.map(x=>`<div class="study-row"><span>📌 ${esc(x.text)} <small class="muted">${esc(x.subject)}</small></span><button class="action" data-weak-delete="${x.id}">削除</button></div>`).join("")||`<p class="muted">まだ登録がないよ。</p>`;}
on("cardAddBtn","click",()=>{const f=$("cardFront").value.trim(),b=$("cardBack").value.trim();if(!f||!b)return toast("表と裏を入力してね");studyState.cards.push({id:makeId(),front:f,back:b});cardIndex=studyState.cards.length-1;$("cardFront").value="";$("cardBack").value="";saveStudy();renderMemory();toast("カードを追加したよ！")});
on("cardFlip","click",()=>$("cardBackView").classList.toggle("hidden"));
on("cardNext","click",()=>{if(studyState.cards.length){cardIndex=(cardIndex+1)%studyState.cards.length;renderMemory()}});
on("cardDelete","click",()=>{if(!studyState.cards.length)return;const removed=studyState.cards[cardIndex];studyState.cards.splice(cardIndex,1);cardIndex=Math.min(cardIndex,Math.max(0,studyState.cards.length-1));saveStudy();renderMemory();toast(`「${removed.front}」を削除したよ`)});
on("weakAddBtn","click",()=>{const text=$("weakText").value.trim();if(!text)return toast("苦手な内容を書いてね");studyState.weak.unshift({id:makeId(),text,subject:$("weakSubject").value});$("weakText").value="";saveStudy();renderMemory();renderStudyExtras();toast("苦手を追加したよ！")});
function startReviewGame(type,label){
  if(!studyState.cards.length){$("quizArea").innerHTML=`<b>${esc(label)}</b><p>まずフラッシュカードを1枚以上登録してね。</p>`;return;}
  let pool=[...studyState.cards]; if(type==="wrong" && studyState.weak.length){const filtered=pool.filter(c=>studyState.weak.some(w=>c.front.includes(w.text)||c.back.includes(w.text)));if(filtered.length)pool=filtered;}
  if(type==="schedule") pool=pool.slice().sort((a,b)=>(a.nextReview||0)-(b.nextReview||0));
  const c=pool[Math.floor(Math.random()*pool.length)]; const area=$("quizArea");
  if(type==="four"){
    const choices=[c.back,...studyState.cards.filter(x=>x.id!==c.id).sort(()=>Math.random()-.5).slice(0,3).map(x=>x.back)].sort(()=>Math.random()-.5);
    area.innerHTML=`<h3>${esc(label)}</h3><p>問題：<b>${esc(c.front)}</b></p>${choices.map(x=>`<button class="action review-choice" data-answer="${esc(x)}">${esc(x)}</button>`).join(" ")}<div id="reviewResult"></div>`;
    area.querySelectorAll(".review-choice").forEach(btn=>btn.onclick=()=>{const ok=btn.dataset.answer===c.back;$("reviewResult").innerHTML=ok?"<p>🎉 正解！</p>":`<p>答え：<b>${esc(c.back)}</b></p>`;c.nextReview=Date.now()+86400000;saveStudy();});
  } else if(type==="truefalse"){
    const ok=Math.random()>.5; const shown=ok?c.back:(studyState.cards.find(x=>x.id!==c.id)?.back||"別の答え"); area.innerHTML=`<h3>${esc(label)}</h3><p><b>${esc(c.front)}</b></p><p>答えは「${esc(shown)}」で正しい？</p><button class="action" id="tfYes">⭕ 正しい</button> <button class="action" id="tfNo">❌ 間違い</button><div id="reviewResult"></div>`;$("tfYes").onclick=()=>check(ok);$("tfNo").onclick=()=>check(!ok);function check(answer){$("reviewResult").innerHTML=answer?"<p>🎉 正解！</p>":`<p>答え：<b>${esc(c.back)}</b></p>`;c.nextReview=Date.now()+86400000;saveStudy();}
  } else if(type==="fill") {
    const answer=c.back, blank=answer.length>3?answer.slice(0,Math.max(1,Math.floor(answer.length/2)))+"…":""; area.innerHTML=`<h3>${esc(label)}</h3><p>${esc(c.front)} → <b>${esc(blank)}</b></p><input id="reviewAnswer" placeholder="答えを入力"><button class="primary" id="reviewCheck">答え合わせ</button><div id="reviewResult"></div>`;$("reviewCheck").onclick=()=>{const value=$("reviewAnswer").value.trim();$("reviewResult").innerHTML=value===answer?"<p>🎉 正解！</p>":`<p>答え：<b>${esc(answer)}</b></p>`;};
  } else {
    area.innerHTML=`<h3>${esc(label)}</h3><p>問題：<b>${esc(c.front)}</b></p><input id="reviewAnswer" placeholder="答えを入力"><button class="primary" id="reviewCheck">答え合わせ</button><div id="reviewResult"></div>`;$("reviewCheck").onclick=()=>{const ok=$("reviewAnswer").value.trim()===c.back.trim();$("reviewResult").innerHTML=ok?"<p>🎉 正解！</p>":`<p>答え：<b>${esc(c.back)}</b></p>`;c.nextReview=Date.now()+86400000;saveStudy();};
  }
}
document.querySelectorAll(".quiz-action").forEach(btn=>btn.addEventListener("click",()=>startReviewGame(btn.dataset.quiz,btn.textContent)));

/* ---------- focus timer ---------- */
function resetDailyFocus(){const today=new Date().toLocaleDateString("sv-SE");if(studyState.lastFocusDay!==today){studyState.focusToday=0;studyState.lastFocusDay=today;saveStudy();}}
function renderFocus(){resetDailyFocus();const m=Math.floor(studyState.focusSeconds/60),s=studyState.focusSeconds%60;$("focusTime").textContent=`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;$("focusSessions").textContent=studyState.focusSessions+"回";$("focusToday").textContent=studyState.focusToday+"分";$("focusCount").textContent=studyState.focusSessions+"回";$("focusBest").textContent=studyState.focusBest+"分";const total=Math.max(1,(Number($("focusMinutes")?.value)||25)*60);const remaining=Math.min(total,studyState.focusSeconds);$("focusRing").style.setProperty("--focus-progress",`${Math.round((1-remaining/total)*100)}%`);}
function focusTick(){if(studyState.focusSeconds<=0){clearInterval(studyState.focusTimer);studyState.focusRunning=false;const minutes=Number($("focusMinutes").value)||25;studyState.focusSessions++;studyState.focusToday+=minutes;studyState.focusBest=Math.max(studyState.focusBest,minutes);saveStudy();renderFocus();toast("集中時間終了！休憩しよう☕");return;}studyState.focusSeconds--;saveStudy();renderFocus();}
on("focusStart","click",()=>{if(studyState.focusRunning)return;studyState.focusRunning=true;clearInterval(studyState.focusTimer);studyState.focusTimer=setInterval(focusTick,1000);toast("集中スタート！")});
on("focusPause","click",()=>{studyState.focusRunning=false;clearInterval(studyState.focusTimer);saveStudy();renderFocus();toast("一時停止したよ")});
on("focusReset","click",()=>{studyState.focusRunning=false;clearInterval(studyState.focusTimer);studyState.focusSeconds=(Number($("focusMinutes").value)||25)*60;saveStudy();renderFocus()});
on("focusApply","click",()=>{const mins=Math.min(180,Math.max(1,Number($("focusMinutes").value)||25));$("focusMinutes").value=mins;studyState.focusRunning=false;clearInterval(studyState.focusTimer);studyState.focusSeconds=mins*60;saveStudy();renderFocus();toast("集中時間を設定したよ！")});

/* ---------- records ---------- */
function renderRecords(){
  const mine=studyLogs.filter(x=>x.uid===currentUser?.uid),total=mine.reduce((s,x)=>s+Number(x.minutes||0),0);$("recordTotal").textContent=total+"分";$("recordBest").textContent=Math.max(0,...mine.map(x=>Number(x.minutes||0)))+"分";$("recordDays").textContent=new Set(mine.map(x=>dayKey(x.createdAt)).filter(Boolean)).size+"日";$("recordGoal").textContent=Math.min(100,Math.round(total/Math.max(1,studyState.goal)*100))+"%";
  const sub={};mine.forEach(x=>sub[x.subject||"その他"]=(sub[x.subject||"その他"]||0)+Number(x.minutes||0));const max=Math.max(1,...Object.values(sub));$("subjectStats").innerHTML=Object.entries(sub).map(([k,v])=>`<div><div class="bar-label"><b>${esc(k)}</b><span>${v}分</span></div><div class="bar-track"><div class="bar-fill" style="width:${v/max*100}%"></div></div></div>`).join("")||`<p class="muted">記録すると教科別に表示されるよ。</p>`;
  $("scoreList").innerHTML=studyState.scores.map((x,i)=>`<div class="study-row"><span>📝 ${esc(x.name)}</span><b>${Number(x.score)}点 / 目標${Number(x.goal)}点</b><button class="action" data-score-delete="${i}">削除</button></div>`).join("")||`<p class="muted">まだテスト記録がないよ。</p>`;
  $("scoreChart").innerHTML=studyState.scores.slice(-10).map(x=>`<div class="score-bar" style="height:${Math.max(8,Number(x.score))}%"><span>${Number(x.score)}</span></div>`).join("")||`<span class="muted">点数を追加するとグラフが出るよ。</span>`;
}
on("scoreAddBtn","click",()=>{const name=$("scoreName").value.trim(),score=Number($("scoreValue").value),goal=Number($("scoreGoal").value)||100;if(!name||!Number.isFinite(score)||score<0||score>100)return toast("テスト名と0〜100点を入力してね");studyState.scores.push({id:makeId(),name,score,goal:Math.max(0,Math.min(100,goal)),createdAt:Date.now()});$("scoreName").value="";$("scoreValue").value="";$("scoreGoal").value="";saveStudy();renderRecords();toast("点数を記録したよ！")});

/* ---------- community study ---------- */
function renderCommunity(){$("recruitList").innerHTML=studyState.recruits.map((x,i)=>`<div class="study-row"><span>🤝 ${esc(x.text)} <small class="muted">#${esc(x.subject)}</small></span><button class="action" data-recruit-delete="${i}">削除</button></div>`).join("")||`<p class="muted">募集はまだないよ。</p>`;$(`studyQuestionList`).innerHTML=studyState.studyQuestions.map((x,i)=>`<div class="study-row"><span><b>❓ ${esc(x.title)}</b><br>${esc(x.body)}</span><button class="action" data-study-question-delete="${i}">削除</button></div>`).join("")||`<p class="muted">質問はまだないよ。</p>`;$("recommendList").innerHTML=studyState.recommendations.map((x,i)=>`<div class="panel"><b>${esc(x.title)}</b><small class="muted"> ${esc(x.type)}・${esc(x.subject)}</small><p>${esc(x.body)}</p><button class="action" data-recommend-delete="${i}">削除</button></div>`).join("")||`<p class="muted">まだおすすめがないよ。</p>`;}
on("recruitBtn","click",()=>{const text=$("studyRecruit").value.trim();if(!text)return toast("募集内容を書いてね");studyState.recruits.unshift({id:makeId(),text,subject:$("recruitSubject").value});$("studyRecruit").value="";saveStudy();renderCommunity();toast("募集を投稿したよ！")});
on("studyQuestionBtn","click",()=>{const title=$("studyQuestion").value.trim(),body=$("studyQuestionBody").value.trim();if(!title||!body)return toast("質問を書いてね");studyState.studyQuestions.unshift({id:makeId(),title,body});$("studyQuestion").value="";$("studyQuestionBody").value="";saveStudy();renderCommunity();toast("質問を投稿したよ！")});
on("recommendBtn","click",()=>{const title=$("recommendTitle").value.trim(),body=$("recommendBody").value.trim();if(!title||!body)return toast("名前と内容を入力してね");const types={book:"📖 参考書・教材",method:"💡 勉強法",test:"🎯 テスト対策"};studyState.recommendations.unshift({id:makeId(),title,body,type:types[$("recommendType").value],subject:$("recommendSubject").value});$("recommendTitle").value="";$("recommendBody").value="";saveStudy();renderCommunity();toast("おすすめを追加したよ！")});

/* ---------- games ---------- */
function finishGame(score){studyState.scores.push({id:makeId(),name:"学習ゲーム",score:Math.max(0,Math.min(100,Math.round(score))),goal:100,createdAt:Date.now()});saveStudy();renderRecords();toast(`スコア ${Math.round(score)}！`);}
const gameData={
  typing:{title:"⌨️ タイピング",desc:"表示された英単語を正確に入力してタイムを測ろう。",start:()=>{const words=["study","school","math","english","science"];let i=0,start=Date.now();const draw=()=>{$("gameArea").innerHTML=`<h2>⌨️ タイピング</h2><p id="gamePrompt">${words[i]}</p><input id="gameInput" autofocus placeholder="ここに入力"><p id="gameStatus">${i+1} / ${words.length}</p>`;$("gameInput").onkeydown=e=>{if(e.key!=="Enter")return;if(e.target.value!==words[i])return toast("文字が違うよ！");i++;e.target.value="";if(i===words.length){const sec=(Date.now()-start)/1000;$(`gameArea`).innerHTML=`<h2>🎉 クリア！</h2><p>タイム：<b>${sec.toFixed(2)}秒</b></p><button class="primary" id="gameRestart">もう一度</button>`;finishGame(Math.max(0,100-sec*10));$("gameRestart").onclick=gameData.typing.start;}else{$("gamePrompt").textContent=words[i];$("gameStatus").textContent=`${i+1} / ${words.length}`;}};};draw();}},
  math:{title:"➗ 計算タイム",desc:"5問の計算をできるだけ速く解こう。",start:startMathGame},
  memory:{title:"🧠 記憶ゲーム",desc:"数字を覚えてから入力する記憶力ゲーム。",start:startMemoryGame},
  quiz:{title:"❓ 学校クイズ",desc:"登録したフラッシュカードから出題。",start:startStudyQuiz},
  reaction:{title:"⚡ 反射神経",desc:"GOが出たらすぐ押そう。",start:startReactionGame},
  words:{title:"🔤 英単語チャレンジ",desc:"英単語の意味を答えよう。",start:startWordGame}
};
function gameShell(g){$("gameArea").innerHTML=`<h2>${esc(g.title)}</h2><p>${esc(g.desc)}</p><button class="primary" id="gameStartBtn">スタート</button>`;$("gameStartBtn").onclick=g.start;}
document.querySelectorAll(".game-card").forEach(btn=>btn.addEventListener("click",()=>gameShell(gameData[btn.dataset.game])));
function startMathGame(){const qs=[["7 × 8",56],["12 × 6",72],["45 ÷ 5",9],["15 + 28",43],["90 - 37",53]];let i=0,score=0;const draw=()=>{$("gameArea").innerHTML=`<h2>➗ 計算タイム</h2><p>第${i+1}問：<b>${qs[i][0]} = ?</b></p><input id="gameInput" type="number" autofocus><button class="primary" id="gameCheck">回答</button><p>正解：${score} / 5</p>`;const check=()=>{if(Number($("gameInput").value)===qs[i][1])score++;i++;if(i>=qs.length){$("gameArea").innerHTML=`<h2>🎉 終了！</h2><p>5問中 <b>${score}問正解</b>！</p><button class="primary" id="gameRestart">もう一度</button>`;finishGame(score*20);$("gameRestart").onclick=startMathGame;}else draw()};$("gameCheck").onclick=check;$("gameInput").onkeydown=e=>{if(e.key==="Enter")check();};};draw();}
function startMemoryGame(){const n=String(Math.floor(100000+Math.random()*900000));$("gameArea").innerHTML=`<h2>🧠 記憶ゲーム</h2><p>この6桁を10秒で覚えてね。</p><div class="study-number">${n}</div><p id="memCount">10秒</p>`;let left=10;const timer=setInterval(()=>{left--;$("memCount").textContent=left+"秒";if(left<=0){clearInterval(timer);$("gameArea").innerHTML=`<h2>🧠 入力！</h2><input id="gameInput" maxlength="6" inputmode="numeric" autofocus><button class="primary" id="gameCheck">回答</button>`;$("gameCheck").onclick=()=>{const ok=$("gameInput").value===n;$("gameArea").innerHTML=`<h2>${ok?"🎉 正解！":"😵 惜しい！"}</h2><p>正解は <b>${n}</b></p><button class="primary" id="gameRestart">もう一度</button>`;finishGame(ok?100:0);$("gameRestart").onclick=startMemoryGame;};}},1000);}
function startStudyQuiz(){if(!studyState.cards.length){$("gameArea").innerHTML=`<h2>❓ 学校クイズ</h2><p>まずフラッシュカードを登録してね。</p>`;return;}let pool=[...studyState.cards].sort(()=>Math.random()-.5).slice(0,Math.min(5,studyState.cards.length)),i=0,score=0;const draw=()=>{const c=pool[i];$("gameArea").innerHTML=`<h2>❓ 学校クイズ</h2><p>第${i+1}問：<b>${esc(c.front)}</b></p><input id="gameInput" placeholder="答え"><button class="primary" id="gameCheck">回答</button>`;const check=()=>{if($("gameInput").value.trim()===c.back.trim())score++;i++;if(i>=pool.length){finishGame(score/pool.length*100);$("gameArea").innerHTML=`<h2>🎉 結果</h2><p>${score} / ${pool.length}問正解！</p><button class="primary" id="gameRestart">もう一度</button>`;$("gameRestart").onclick=startStudyQuiz;}else draw()};$("gameCheck").onclick=check;$("gameInput").onkeydown=e=>{if(e.key==="Enter")check();};};draw();}
function startReactionGame(){let active=false,finished=false;$("gameArea").innerHTML=`<h2>⚡ 反射神経</h2><p id="reactionText">「GO」が出るまで待ってね。</p><button id="reactionBtn" class="action" disabled>待機中</button>`;const delay=1200+Math.random()*2500;const timer=setTimeout(()=>{if(finished||!$("reactionBtn"))return;active=true;$("reactionText").textContent="GO!";$("reactionBtn").disabled=false;$("reactionBtn").textContent="押せ！";const start=performance.now();$("reactionBtn").onclick=()=>{if(!active)return;finished=true;const ms=Math.round(performance.now()-start);$("gameArea").innerHTML=`<h2>⚡ ${ms}ms</h2><p>${ms<300?"すごい！":ms<500?"いい反応！":"もう一回挑戦！"}</p><button class="primary" id="gameRestart">もう一度</button>`;finishGame(Math.max(0,100-ms/10));$("gameRestart").onclick=startReactionGame;};},delay);$("reactionBtn").onclick=()=>{};window.clearReaction=()=>{clearTimeout(timer);};}
function startWordGame(){const qs=[["apple","りんご"],["book","本"],["water","水"],["friend","友達"],["school","学校"]];let i=0,score=0;const draw=()=>{$("gameArea").innerHTML=`<h2>🔤 英単語チャレンジ</h2><p>${i+1}/5：<b>${qs[i][0]}</b> の意味は？</p><input id="gameInput" autofocus><button class="primary" id="gameCheck">回答</button>`;const check=()=>{if($("gameInput").value.trim()===qs[i][1])score++;i++;if(i===5){finishGame(score*20);$("gameArea").innerHTML=`<h2>🎉 結果</h2><p>${score}/5問正解！</p><button class="primary" id="gameRestart">もう一度</button>`;$("gameRestart").onclick=startWordGame;}else draw()};$("gameCheck").onclick=check;$("gameInput").onkeydown=e=>{if(e.key==="Enter")check();};};draw();}

/* ---------- ranking / home / profile / search ---------- */
function renderRanking(){const totals={};for(const x of studyLogs){if(!totals[x.uid])totals[x.uid]={uid:x.uid,name:x.name||"学生",minutes:0};totals[x.uid].minutes+=Number(x.minutes||0);}const arr=Object.values(totals).sort((a,b)=>b.minutes-a.minutes).slice(0,20);$("rankingList").innerHTML=arr.map((x,i)=>`<div class="rank"><div class="rank-num">${i+1}</div><div class="rank-avatar">${esc(x.name.charAt(0))}</div><div class="rank-main"><b>${esc(x.name)}</b></div><div class="rank-time">${x.minutes}分</div></div>`).join("")||`<p class="muted">まだランキングデータがないよ。</p>`;}
function renderHome(){const popular=[...posts].sort((a,b)=>(b.likes||0)-(a.likes||0)).slice(0,3);$("homePosts").innerHTML=popular.map(p=>`<div class="mini-post"><b>${esc(p.name||"学生")}</b><p>${esc(p.text)}</p><span>❤️ ${p.likes||0}</span></div>`).join("")||`<p class="muted">まだ投稿がないよ。</p>`;$("homeEvents").innerHTML=events.slice(0,3).map(e=>`<div class="mini-event"><b>${esc(e.title)}</b><span>${dateText(e.date)}</span></div>`).join("")||`<p class="muted">予定がないよ。</p>`;}
function updateStats(){if(!currentUser)return;$("statPosts").textContent=posts.length;$("statQuestions").textContent=questions.length;$("statEvents").textContent=events.length;$("statStudy").textContent=studyLogs.filter(x=>x.uid===currentUser.uid).reduce((s,x)=>s+Number(x.minutes||0),0)+"分";}
function renderProfileStats(){if(!currentUser)return;const minePosts=posts.filter(p=>p.uid===currentUser.uid),mineStudy=studyLogs.filter(x=>x.uid===currentUser.uid);$("myPostCount").textContent=minePosts.length;$("myLikes").textContent=minePosts.reduce((s,p)=>s+Number(p.likes||0),0);$("myStudy").textContent=mineStudy.reduce((s,x)=>s+Number(x.minutes||0),0);}
on("profileSave","click",async()=>{const name=$("profileName").value.trim(),bio=$("profileBio").value.trim();if(!name)return toast("表示名を入力してね");try{await updateProfile(currentUser,{displayName:name});await setDoc(doc(db,"users",currentUser.uid),{uid:currentUser.uid,email:currentUser.email||"",name,bio,updatedAt:serverTimestamp()},{merge:true});userData={name,bio};$("headerName").textContent=name;$("headerAvatar").textContent=name.charAt(0);$("profileAvatar").textContent=name.charAt(0);toast("プロフィールを保存したよ！");renderAll();}catch(e){console.error(e);toast("プロフィール保存に失敗したよ");}});

on("globalSearch","keydown",e=>{if(e.key!=="Enter")return;const q=e.target.value.trim().toLowerCase();if(!q)return;const post=posts.find(p=>(p.text||"").toLowerCase().includes(q)||(p.name||"").toLowerCase().includes(q));const question=questions.find(x=>(x.title||"").toLowerCase().includes(q)||(x.body||"").toLowerCase().includes(q));if(post){showPage("board");toast(`「${q}」に近い投稿を表示したよ`);}else if(question){showPage("questions");toast(`「${q}」に近い質問を表示したよ`);}else{showPage("study");showStudyTab("tools");$("referenceSearch").value=q;searchReference();toast("リファレンスを検索したよ");}});


on("universitySearch","input",renderUniversities);
on("universityTypeFilter","change",renderUniversities);
on("customUniversityForm","submit",e=>{e.preventDefault();addCustomUniversity(e.currentTarget.dataset.editId||null);});
on("exportUniversities","click",exportUniversities);
on("importUniversities","change",e=>{const file=e.target.files?.[0];if(file)importUniversities(file);e.target.value="";});

/* ---------- global click actions ---------- */
document.addEventListener("click", async e => {
  const like=e.target.closest("[data-like]");
  if(like){const p=posts.find(x=>x.id===like.dataset.like);if(!p)return;try{const liked=(p.likedBy||[]).includes(currentUser.uid);await updateDoc(doc(db,"posts",p.id),{likes:increment(liked?-1:1),likedBy:liked?arrayRemove(currentUser.uid):arrayUnion(currentUser.uid)});}catch(err){console.error(err);toast("いいねに失敗したよ");}return;}
  const delPost=e.target.closest("[data-delete-post]");if(delPost){const p=posts.find(x=>x.id===delPost.dataset.deletePost);if(p?.uid===currentUser.uid){try{await deleteDoc(doc(db,"posts",p.id));toast("削除したよ");}catch(err){console.error(err);toast("削除に失敗したよ");}}return;}
  const answer=e.target.closest("[data-answer]");if(answer){const q=questions.find(x=>x.id===answer.dataset.answer);if(!q)return;const text=prompt("回答を入力してね");if(!text?.trim())return;try{await updateDoc(doc(db,"questions",q.id),{answers:[...(q.answers||[]),{uid:currentUser.uid,name:userData.name,text:text.trim(),createdAt:new Date().toISOString()}]});toast("回答したよ！");}catch(err){console.error(err);toast("回答に失敗したよ");}return;}
  const delQuestion=e.target.closest("[data-delete-question]");if(delQuestion){const q=questions.find(x=>x.id===delQuestion.dataset.deleteQuestion);if(q?.uid===currentUser.uid){try{await deleteDoc(doc(db,"questions",q.id));toast("質問を削除したよ");}catch(err){console.error(err);toast("削除に失敗したよ");}}return;}
  const delEvent=e.target.closest("[data-delete-event]");if(delEvent){const ev=events.find(x=>x.id===delEvent.dataset.deleteEvent);if(ev?.uid===currentUser.uid){try{await deleteDoc(doc(db,"events",ev.id));toast("予定を削除したよ");}catch(err){console.error(err);toast("削除に失敗したよ");}}return;}
  const dm=e.target.closest("[data-dm-user]");if(dm){selectedDmUser=users.find(u=>u.uid===dm.dataset.dmUser)||null;renderDM();return;}
  const taskDone=e.target.closest("[data-task-done]");if(taskDone){const x=studyState.tasks.find(t=>t.id===taskDone.dataset.taskDone);if(x){x.done=!x.done;saveStudy();renderTasks();renderStudyExtras();}return;}
  const taskDelete=e.target.closest("[data-task-delete]");if(taskDelete){studyState.tasks=studyState.tasks.filter(t=>t.id!==taskDelete.dataset.taskDelete);saveStudy();renderTasks();renderStudyExtras();return;}
  const weakDelete=e.target.closest("[data-weak-delete]");if(weakDelete){studyState.weak=studyState.weak.filter(x=>x.id!==weakDelete.dataset.weakDelete);saveStudy();renderMemory();renderStudyExtras();return;}
  const formulaDelete=e.target.closest("[data-formula-delete]");if(formulaDelete){studyState.formulas.splice(Number(formulaDelete.dataset.formulaDelete),1);saveStudy();renderFormulas();return;}
  const scoreDelete=e.target.closest("[data-score-delete]");if(scoreDelete){studyState.scores.splice(Number(scoreDelete.dataset.scoreDelete),1);saveStudy();renderRecords();return;}
  const recruitDelete=e.target.closest("[data-recruit-delete]");if(recruitDelete){studyState.recruits.splice(Number(recruitDelete.dataset.recruitDelete),1);saveStudy();renderCommunity();return;}
  const studyQuestionDelete=e.target.closest("[data-study-question-delete]");if(studyQuestionDelete){studyState.studyQuestions.splice(Number(studyQuestionDelete.dataset.studyQuestionDelete),1);saveStudy();renderCommunity();return;}
  const recommendDelete=e.target.closest("[data-recommend-delete]");if(recommendDelete){studyState.recommendations.splice(Number(recommendDelete.dataset.recommendDelete),1);saveStudy();renderCommunity();return;}
  const uniAdd=e.target.closest("[data-university-add]");if(uniAdd){addFavoriteUniversity(uniAdd.dataset.universityAdd);return;}
  const uniRemove=e.target.closest("[data-university-remove]");if(uniRemove){removeFavoriteUniversity(uniRemove.dataset.universityRemove);return;}
  const uniEdit=e.target.closest("[data-university-edit]");if(uniEdit){editCustomUniversity(uniEdit.dataset.universityEdit);return;}
  const uniDelete=e.target.closest("[data-university-delete]");if(uniDelete){deleteCustomUniversity(uniDelete.dataset.universityDelete);return;}
  const refOpen=e.target.closest("[data-reference-open]");if(refOpen){showReference(refOpen.dataset.referenceOpen);return;}
});

/* ---------- auth session ---------- */
onAuthStateChanged(auth, async user => {
  currentUser=user;
  if(user){
    $("authView").classList.add("hidden");$("appView").classList.remove("hidden");
    try{await hydrate();renderUniversities();}catch(e){console.error(e);toast("ユーザー情報の読み込みに失敗したよ。Firestore Rulesと設定を確認してね");}
  }else{
    clearSubscriptions();posts=[];questions=[];events=[];studyLogs=[];users=[];selectedDmUser=null;
    $("appView").classList.add("hidden");$("authView").classList.remove("hidden");
  }
});
