const SUPABASE_URL="https://pdhmhflnowpevyeboziv.supabase.co";
const SUPABASE_KEY="sb_publishable_ocpLnuL_L0M6-WRbFsWMyg_DcggD5vDcg";
const supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
let currentUser=null,currentProfile=null,authMode="register";const $=id=>document.getElementById(id);
document.addEventListener("DOMContentLoaded",init);
async function init(){
$("authButton").onclick=handleAuth;$("authSwitch").onclick=switchAuth;$("menuButton").onclick=toggleMenu;$("logoutButton").onclick=logout;$("deleteAccountButton").onclick=confirmDelete;$("confirmDeleteButton").onclick=deleteAccount;$("closeDeleteButton").onclick=closeDelete;$("addCarButton").onclick=addCar;$("createGGButton").onclick=createGGOrder;
document.querySelectorAll("[data-section]").forEach(b=>b.onclick=()=>openSection(b.dataset.section));
const {data,error}=await supabaseClient.auth.getSession();if(error)console.error(error);if(data?.session)await loadUser(data.session.user);
supabaseClient.auth.onAuthStateChange(async(e,s)=>{if(s&&!currentUser)await loadUser(s.user)})}
function switchAuth(){authMode==="register"?showLogin():showRegister()}
function showLogin(){authMode="login";$("authTitle").innerText="Вход";$("authButton").innerText="ВОЙТИ";$("authSwitch").innerText="НАЗАД К РЕГИСТРАЦИИ";$("authUsername").style.display="none";$("authTelegram").style.display="none";$("authMessage").innerText=""}
function showRegister(){authMode="register";$("authTitle").innerText="Регистрация";$("authButton").innerText="ЗАРЕГИСТРИРОВАТЬСЯ";$("authSwitch").innerText="У МЕНЯ ЕСТЬ АККАУНТ";$("authUsername").style.display="block";$("authTelegram").style.display="block";$("authMessage").innerText=""}
async function handleAuth(){authMode==="register"?await register():await login()}
async function register(){
const email=$("authEmail").value.trim(),nick=$("authNick").value.trim(),username=$("authUsername").value.trim(),telegram=$("authTelegram").value.trim(),password=$("authPassword").value,message=$("authMessage");
if(!email||!nick||!username||!telegram||!password){message.innerText="❌ Заполните все поля";return}
if(password.length<6){message.innerText="❌ Пароль минимум 6 символов";return}
if(!telegram.startsWith("@")){message.innerText="❌ Telegram должен начинаться с @";return}
message.innerText="⏳ Регистрация...";
try{const {data,error}=await supabaseClient.auth.signUp({email,password,options:{data:{nick,username,telegram}}});if(error)throw error;if(!data.user)throw new Error("Supabase не создал пользователя");message.style.color="#58e68b";message.innerText=data.session?"✅ Аккаунт создан!":"✅ Аккаунт создан! Проверьте подтверждение Email.";if(data.session)await loadUser(data.user)}catch(e){console.error(e);message.style.color="#ff6378";message.innerText="❌ "+getErrorMessage(e)}}
async function login(){
const email=$("authEmail").value.trim(),password=$("authPassword").value,message=$("authMessage");if(!email||!password){message.innerText="❌ Введите Email и пароль";return}message.innerText="⏳ Вход...";
try{const {data,error}=await supabaseClient.auth.signInWithPassword({email,password});if(error)throw error;await loadUser(data.user)}catch(e){console.error(e);message.style.color="#ff6378";message.innerText="❌ Неверный Email или пароль"}}
async function loadUser(user){
currentUser=user;const {data,error}=await supabaseClient.from("profiles").select("*").eq("id",user.id).maybeSingle();if(error)console.error(error);
currentProfile=data||{id:user.id,nick:user.user_metadata?.nick||"Пользователь",username:user.user_metadata?.username||"",telegram:user.user_metadata?.telegram||"",role:"user",worker:false,blocked:false};
if(currentProfile.blocked){await logout();alert("🚫 Аккаунт заблокирован");return}
$("authPage").classList.add("hidden");$("mainPage").classList.remove("hidden");renderProfile();updateAdminMenu();openSection("home")}
async function logout(){await supabaseClient.auth.signOut();currentUser=null;currentProfile=null;$("mainPage").classList.add("hidden");$("authPage").classList.remove("hidden");showLogin()}
function toggleMenu(){const m=$("menu");m.style.display=m.style.display==="block"?"none":"block"}
function openSection(id){document.querySelectorAll(".content").forEach(s=>s.classList.remove("active"));const s=$(id);if(!s)return;s.classList.add("active");$("menu").style.display="none";if(id==="profile")renderProfile()}
function renderProfile(){const b=$("myProfile");if(!b)return;b.innerHTML=`<h2>👤 ${safe(currentProfile?.nick||"")}</h2><p>🆔 Юзер: ${safe(currentProfile?.username||"")}</p><p>💬 Telegram: ${safe(currentProfile?.telegram||"")}</p><p>🛡️ Роль: ${safe(roleName(currentProfile?.role))}</p>`}
async function addCar(){if(!currentUser)return alert("❌ Сначала войдите");const name=$("carName").value.trim(),photo=$("carPhoto").value.trim(),description=$("carDescription").value.trim(),stats=$("carStats").value.trim(),price=$("carPrice").value.trim();if(!name||!description||!price)return alert("❌ Заполните название, описание и цену");const {error}=await supabaseClient.from("cars").insert({owner_id:currentUser.id,name,photo,description,stats,price});if(error)return alert("❌ "+error.message);alert("✅ Машина опубликована")}
async function createGGOrder(){if(!currentUser)return alert("❌ Сначала войдите");const title=$("ggTitle").value.trim(),description=$("ggDescription").value.trim();if(!title||!description)return alert("❌ Заполните поля");const {error}=await supabaseClient.from("gg_orders").insert({client_id:currentUser.id,title,description,status:"new"});if(error)return alert("❌ "+error.message);alert("✅ Заказ создан")}
function updateAdminMenu(){const b=$("adminMenuButton");if(b)b.style.display=isAdmin()?"block":"none"}
function isAdmin(){return !!(currentProfile&&(currentProfile.role==="admin"||currentProfile.role==="owner"))}
function roleName(r){return({user:"Пользователь",worker:"Работник GG",admin:"Администратор",owner:"Владелец"})[r]||"Пользователь"}
function confirmDelete(){$("deleteModal").classList.add("show")}function closeDelete(){$("deleteModal").classList.remove("show")}
async function deleteAccount(){if(!currentUser||!confirm("Точно удалить аккаунт?"))return;const {error}=await supabaseClient.from("profiles").delete().eq("id",currentUser.id);if(error)return alert("❌ "+error.message);await logout()}
function getErrorMessage(e){const m=String(e?.message||e||"");const l=m.toLowerCase();if(l.includes("invalid api key"))return"Неверный ключ Supabase.";if(l.includes("already registered"))return"Этот Email уже зарегистрирован.";if(l.includes("password"))return"Пароль минимум 6 символов.";if(l.includes("email"))return"Проверьте Email.";return m||"Неизвестная ошибка."}
function safe(v){return String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
