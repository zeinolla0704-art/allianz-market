const SUPABASE_URL="https://pdhmhflnowpevyeboziv.supabase.co";
const SUPABASE_KEY="sb_publishable_ocpLnuL_L0M6-WRbFsWMyg_DcggD5vD";
const supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);

let currentUser=null,currentProfile=null,authMode="register";
const $=id=>document.getElementById(id);

document.addEventListener("DOMContentLoaded",init);

async function init(){
  const ids=["authButton","authSwitch","menuButton","addCarButton","createGGButton","logoutButton","deleteAccountButton","confirmDeleteButton","closeDeleteButton"];
  ids.forEach(id=>{const e=$(id);if(e)e.addEventListener("click",({authButton:handleAuth,authSwitch:switchAuth,menuButton:toggleMenu,addCarButton:addCar,createGGButton:createGGOrder,logoutButton:logout,deleteAccountButton:confirmDelete,confirmDeleteButton:deleteAccount,closeDeleteButton:closeDelete}[id]))});
  document.querySelectorAll("[data-section]").forEach(b=>b.addEventListener("click",()=>openSection(b.dataset.section)));
  try{
    const {data,error}=await supabaseClient.auth.getSession();
    if(error) throw error;
    if(data.session) await loadUser(data.session.user);
  }catch(e){console.error(e)}
  supabaseClient.auth.onAuthStateChange(async(_,session)=>{
    if(session&&!currentUser) await loadUser(session.user);
  });
}

function switchAuth(){authMode==="register"?showLogin():showRegister()}
function showLogin(){
  authMode="login";$("authTitle").textContent="Вход";$("authButton").textContent="ВОЙТИ";$("authSwitch").textContent="НАЗАД К РЕГИСТРАЦИИ";
  $("authEmail").style.display="none";$("authUsername").style.display="none";$("authTelegram").style.display="none";$("authMessage").textContent="";
}
function showRegister(){
  authMode="register";$("authTitle").textContent="Регистрация";$("authButton").textContent="ЗАРЕГИСТРИРОВАТЬСЯ";$("authSwitch").textContent="У МЕНЯ ЕСТЬ АККАУНТ";
  $("authEmail").style.display="block";$("authUsername").style.display="block";$("authTelegram").style.display="block";$("authMessage").textContent="";
}
async function handleAuth(){authMode==="register"?await register():await login()}

async function register(){
  const email=$("authEmail").value.trim(),nick=$("authNick").value.trim(),username=$("authUsername").value.trim(),telegram=$("authTelegram").value.trim(),password=$("authPassword").value;
  const m=$("authMessage");
  if(!email||!nick||!username||!telegram||!password){m.textContent="❌ Заполните все поля";return}
  if(password.length<6){m.textContent="❌ Пароль минимум 6 символов";return}
  if(!telegram.startsWith("@")){m.textContent="❌ Telegram должен начинаться с @";return}
  m.textContent="⏳ Регистрация...";
  try{
    const {data,error}=await supabaseClient.auth.signUp({email,password,options:{data:{nick,username,telegram}}});
    if(error)throw error;
    if(!data.user)throw new Error("Supabase не создал пользователя");
    m.textContent=data.session?"✅ Аккаунт создан!":"✅ Аккаунт создан. Теперь войдите.";
    $("authPassword").value="";
    if(!data.session)setTimeout(showLogin,1200);
  }catch(e){console.error(e);m.textContent="❌ "+friendlyError(e)}
}

async function login(){
  const email=$("authEmail").value.trim(),password=$("authPassword").value,m=$("authMessage");
  if(!email||!password){m.textContent="❌ Введите email и пароль";return}
  m.textContent="⏳ Вход...";
  try{
    const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});
    if(error)throw error;
    await loadUser(data.user);
  }catch(e){console.error(e);m.textContent="❌ Неверный email или пароль"}
}

async function loadUser(user){
  currentUser=user;
  const {data,error}=await supabaseClient.from("profiles").select("*").eq("id",user.id).maybeSingle();
  if(error){console.error(error);$("authMessage").textContent="❌ "+error.message;return}
  currentProfile=data;
  $("authPage").classList.add("hidden");$("mainPage").classList.remove("hidden");
  renderProfile();await renderCars();await renderUsers();await renderGGOrders();updateAdminMenu();openSection("home");
}

async function logout(){await supabaseClient.auth.signOut();currentUser=null;currentProfile=null;$("mainPage").classList.add("hidden");$("authPage").classList.remove("hidden");showLogin()}

function toggleMenu(){const m=$("menu");m.style.display=m.style.display==="flex"?"none":"flex"}
function openSection(id){
  document.querySelectorAll(".content").forEach(s=>s.classList.remove("active"));
  const s=$(id);if(!s)return;s.classList.add("active");$("menu").style.display="none";
  if(id==="market")renderCars();if(id==="users")renderUsers();if(id==="profile")renderProfile();if(id==="gg")renderGGOrders();if(id==="admin")renderAdmin();
}

function renderProfile(){
  if(!currentProfile)return;
  $("myProfile").innerHTML=`<div class="profileCard"><div class="avatar">👤</div><h2>${safe(currentProfile.nick)}</h2><p>👤 Юзер: ${safe(currentProfile.username||"")}</p><p>💬 Telegram: ${safe(currentProfile.telegram)}</p><p>🛡️ Роль: <span class="role">${safe(roleName(currentProfile.role))}</span></p></div>`;
}

async function addCar(){
  if(!currentUser)return alert("❌ Сначала войдите");
  const name=$("carName").value.trim(),photo=$("carPhoto").value.trim(),description=$("carDescription").value.trim(),stats=$("carStats").value.trim(),price=$("carPrice").value.trim();
  if(!name||!description||!price)return alert("❌ Заполните название, описание и цену");
  const {error}=await supabaseClient.from("cars").insert({owner_id:currentUser.id,name,photo,description,stats,price});
  if(error)return alert("❌ "+error.message);
  ["carName","carPhoto","carDescription","carStats","carPrice"].forEach(id=>$(id).value="");await renderCars();
}
async function renderCars(){
  const list=$("carList");if(!list)return;
  const {data,error}=await supabaseClient.from("cars").select("*,profiles(nick,telegram)").order("created_at",{ascending:false});
  if(error){list.innerHTML=`<div class="glass card">❌ ${safe(error.message)}</div>`;return}
  list.innerHTML=data?.length?data.map(c=>`<div class="carCard">${c.photo?`<img src="${safeAttr(c.photo)}" alt="car">`:""}<h2>${safe(c.name)}</h2><p>${safe(c.description)}</p><p>${safe(c.stats||"")}</p><div class="price">💰 ${safe(c.price)}</div><button onclick="openUserProfile('${safeJS(c.owner_id)}')">👤 ${safe(c.profiles?.nick||"Пользователь")}</button>${canDeleteCar(c)?`<button class="danger" onclick="deleteCar('${safeJS(c.id)}')">Удалить</button>`:""}</div>`).join(""):`<div class="glass card">Пока нет объявлений 🚗</div>`;
}
async function deleteCar(id){if(!confirm("Удалить объявление?"))return;const {error}=await supabaseClient.from("cars").delete().eq("id",id);if(error)alert(error.message);else renderCars()}
function canDeleteCar(c){return !!currentUser&&(c.owner_id===currentUser.id||isAdmin())}

async function renderUsers(){
  const list=$("userList");if(!list)return;
  const {data,error}=await supabaseClient.from("profiles").select("id,nick,username,telegram,role,worker,blocked").order("created_at");
  if(error){list.innerHTML=`<div class="glass card">❌ ${safe(error.message)}</div>`;return}
  list.innerHTML=data?.map(u=>`<div class="userCard"><div class="avatar">👤</div><div><strong>${safe(u.nick)}</strong><p>${safe(u.username||"")}</p><p>${safe(roleName(u.role))}</p></div><button onclick="openUserProfile('${safeJS(u.id)}')">ОТКРЫТЬ</button></div>`).join("")||"";
}

async function openUserProfile(id){
  const {data:user,error}=await supabaseClient.from("profiles").select("*").eq("id",id).single();
  if(error||!user)return alert("Пользователь не найден");
  const {data:cars}=await supabaseClient.from("cars").select("*").eq("owner_id",id).order("created_at",{ascending:false});
  const tg=String(user.telegram||"").replace(/^@/,"");
  $("publicProfileBox").innerHTML=`<div class="profileCard"><div class="avatar">👤</div><h1>${safe(user.nick)}</h1><p>👤 ${safe(user.username||"")}</p><p>💬 ${safe(user.telegram)}</p><p>🛡️ ${safe(roleName(user.role))}</p><a href="https://t.me/${encodeURIComponent(tg)}" target="_blank"><button>Telegram</button></a></div><h2>🚗 Объявления</h2>${cars?.map(c=>`<div class="homeCard"><h3>${safe(c.name)}</h3><p>${safe(c.description)}</p><div class="price">💰 ${safe(c.price)}</div></div>`).join("")||`<div class="glass card">Объявлений пока нет.</div>`}`;
  openSection("publicProfile");
}

async function createGGOrder(){
  const title=$("ggTitle").value.trim(),description=$("ggDescription").value.trim();
  if(!title||!description)return alert("❌ Заполните услугу и описание");
  const {error}=await supabaseClient.from("gg_orders").insert({client_id:currentUser.id,title,description,status:"new"});
  if(error)return alert("❌ "+error.message);
  $("ggTitle").value="";$("ggDescription").value="";await renderGGOrders();
}
async function renderGGOrders(){
  const box=$("ggOrders");if(!box)return;
  const {data,error}=await supabaseClient.from("gg_orders").select("*").order("created_at",{ascending:false});
  if(error){box.innerHTML=`<div class="glass card">❌ ${safe(error.message)}</div>`;return}
  box.innerHTML=data?.map(o=>`<div class="orderCard"><h2>🛠️ ${safe(o.title)}</h2><p>${safe(o.description)}</p><p>📌 ${safe(orderStatus(o.status))}</p><p>💰 ${safe(o.price||"—")}</p>${isWorker()&&!o.worker_id&&o.client_id!==currentUser.id?`<button onclick="takeOrder('${safeJS(o.id)}')">ВЗЯТЬ ЗАКАЗ</button>`:""}</div>`).join("")||`<div class="glass card">Заказов пока нет.</div>`;
}
async function takeOrder(id){
  if(!isWorker())return alert("❌ Нет прав");
  const price=prompt("Введите цену услуги:");if(!price)return;
  const {error}=await supabaseClient.from("gg_orders").update({worker_id:currentUser.id,price,status:"worker_assigned"}).eq("id",id).is("worker_id",null);
  if(error)alert(error.message);else renderGGOrders();
}

function isOwner(){return currentProfile?.role==="owner"}
function isAdmin(){return currentProfile?.role==="owner"||currentProfile?.role==="admin"}
function isWorker(){return currentProfile?.worker===true||currentProfile?.role==="worker"||isAdmin()}
function roleName(r){return({user:"Пользователь",worker:"Работник GG",admin:"Администратор",owner:"Владелец"}[r]||"Пользователь")}
function orderStatus(s){return({new:"Новый",worker_assigned:"Работник назначен",completed:"Завершён",cancelled:"Отменён"}[s]||s||"Неизвестно")}
function updateAdminMenu(){const b=$("adminMenuButton");if(b)b.style.display=isAdmin()?"block":"none"}

async function renderAdmin(){
  if(!isAdmin())return openSection("home");
  const list=$("adminList");if(!list)return;
  const {data,error}=await supabaseClient.from("profiles").select("*").order("created_at");
  if(error){list.innerHTML=`<div class="glass card">❌ ${safe(error.message)}</div>`;return}
  list.innerHTML=data?.map(u=>`<div class="adminUser"><strong>👤 ${safe(u.nick)}</strong><span class="role">${safe(roleName(u.role))}</span><span>💬 ${safe(u.telegram)}</span>${isOwner()&&u.id!==currentUser.id?`<p><button onclick="changeRole('${safeJS(u.id)}','admin')">Админ</button><button onclick="changeRole('${safeJS(u.id)}','worker')">Worker</button><button onclick="changeRole('${safeJS(u.id)}','user')">User</button></p>`:""}</div>`).join("")||"";
}
async function changeRole(id,role){if(!isOwner())return alert("❌ Только владелец");const {error}=await supabaseClient.from("profiles").update({role}).eq("id",id);if(error)alert(error.message);else renderAdmin()}
function confirmDelete(){$("deleteModal").classList.add("show")}
function closeDelete(){$("deleteModal").classList.remove("show")}
async function deleteAccount(){if(!currentUser||!confirm("Точно удалить аккаунт?"))return;const {error}=await supabaseClient.from("profiles").delete().eq("id",currentUser.id);if(error)return alert(error.message);closeDelete();logout()}

function friendlyError(e){
  const m=String(e?.message||e||"Неизвестная ошибка");
  const l=m.toLowerCase();
  if(l.includes("invalid api key"))return"Неверный Supabase Publishable key";
  if(l.includes("already registered"))return"Этот email уже зарегистрирован";
  if(l.includes("password"))return"Пароль должен содержать минимум 6 символов";
  if(l.includes("email"))return"Проверьте email";
  return m;
}
function safe(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
function safeAttr(v){return safe(v)}
function safeJS(v){return String(v??"").replaceAll("\\","\\\\").replaceAll("'","\\'")}
