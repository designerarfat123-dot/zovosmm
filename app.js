const qs = (s, p=document)=>p.querySelector(s);
const qsa = (s, p=document)=>Array.from(p.querySelectorAll(s));
const API = () => (window.APP_CONFIG?.apiBase || "").replace(/\/+$/,"");
const LS = {
  get(k){ try{return JSON.parse(localStorage.getItem(k)||"null")}catch{return null}},
  set(k,v){ localStorage.setItem(k, JSON.stringify(v))},
  del(k){ localStorage.removeItem(k)}
};
function toast(msg){
  const el = qs("#toast");
  if(!el) return alert(msg);
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(()=>el.classList.remove("show"), 2600);
}

// HTML escaping helpers (used by admin.html + panel.html)
// Fixes: "ReferenceError: escapeHtml is not defined" which leaves tables stuck on "Loading…"
function escapeHtml(input){
  const s = String(input ?? "");
  return s.replace(/[&<>"']/g, (ch)=>({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

function escapeAttr(input){
  // For attribute values (also escapes backticks)
  const s = String(input ?? "");
  return s.replace(/[&<>"'`]/g, (ch)=>({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
    "`": "&#96;",
  }[ch]));
}
function setThemeVars(settings){
  const root = document.documentElement;
  const map = {
    ui_primary: "--primary",
    ui_accent: "--accent",
    ui_bg: "--bg",
    ui_surface: "--surface",
    ui_text: "--text",
    ui_muted: "--muted",
    ui_border: "--border"
  };
  Object.entries(map).forEach(([k, cssVar])=>{
    if(settings?.[k]) root.style.setProperty(cssVar, settings[k]);
  });
}
async function loadPublicTheme(){
  try{
    const r = await fetch(`${API()}/api/settings/public`);
    const j = await r.json();
    if(j?.ok) setThemeVars(j.settings);
  }catch{}
}
function getToken(){ return LS.get("token"); }
function setToken(t){ LS.set("token", t); }
function clearToken(){ LS.del("token"); LS.del("user"); }
function getUser(){ return LS.get("user"); }
function setUser(u){ LS.set("user", u); }

async function api(path, {method="GET", body=null, auth=true}={}){
  const headers = { "Content-Type":"application/json" };
  if(auth){
    const t = getToken();
    if(t) headers["Authorization"] = `Bearer ${t}`;
  }
  const res = await fetch(`${API()}${path}`, { method, headers, body: body?JSON.stringify(body):null });
  const txt = await res.text();
  let j = null;
  try{ j = JSON.parse(txt); }catch{ j = { ok:false, error: txt || "Server error" }; }
  if(!res.ok || j?.ok===false){
    const msg = j?.error || `Request failed (${res.status})`;
    const extras = [];
    if(j?.detail) extras.push(String(j.detail));
    if(j?.debug) extras.push(`DEBUG: ${String(j.debug)}`);
    const full = extras.length ? `${msg}\n${extras.join("\n")}` : msg;
    throw new Error(full);
  }
  return j;
}

function btnLoading(btn, onText){
  const old = btn.textContent;
  btn.disabled = true;
  btn.textContent = onText;
  return ()=>{ btn.disabled=false; btn.textContent=old; };
}

async function guardUser(){
  const t = getToken();
  if(!t){ location.href="login.html"; return false; }
  try{
    const me = await api("/api/me");
    setUser(me.user);
    return true;
  }catch(e){
    clearToken();
    location.href="login.html";
    return false;
  }
}
async function guardAdmin(){
  const t = getToken();
  if(!t){ location.href="admin-login.html"; return false; }
  try{
    const me = await api("/api/me");
    setUser(me.user);
    if(String(me.user.role||"").toLowerCase()!=="admin"){
      toast("Admin access required");
      location.href="login.html";
      return false;
    }
    return true;
  }catch(e){
    clearToken();
    location.href="admin-login.html";
    return false;
  }
}

window.App = { API, api, toast, loadPublicTheme, guardUser, guardAdmin, btnLoading, getUser, setUser, clearToken, setToken, setThemeVars, escapeHtml, escapeAttr };
