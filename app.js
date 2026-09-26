
const palettes = {
  strong: [
    {name:"Wine / Burgundy", hex:"#7A294E"},
    {name:"Berry / Raspberry", hex:"#A92E63"},
    {name:"Plum / Aubergine", hex:"#56314F"},
    {name:"Cobalt / Royal Blue", hex:"#244CB5"},
    {name:"Navy", hex:"#1D2D50"},
    {name:"Cool Teal", hex:"#197A7A"},
    {name:"Emerald", hex:"#167057"},
    {name:"Charcoal", hex:"#44464D"},
  ],
  okay: [
    {name:"Slate Grey", hex:"#69727D"},
    {name:"Cool Pink", hex:"#D07C9A"},
    {name:"Icy Blue", hex:"#BCD8EA"},
    {name:"Soft White / Oyster", hex:"#F2F0EC"},
    {name:"Black", hex:"#171717"},
    {name:"Cream / Ivory", hex:"#EDE5D3", note:"Wearable, but less contrast than soft white/oyster."}
  ],
  caution: [
    {name:"Warm Beige / Camel", hex:"#B98B5F"},
    {name:"Peach / Orange", hex:"#E18B68"},
    {name:"Mustard", hex:"#B78C2C"},
    {name:"Rust", hex:"#A65337"},
    {name:"Yellow Cream", hex:"#EFE0B9"}
  ]
};

const familyHex = Object.values(palettes).flat().reduce((acc, x) => (acc[x.name] = x.hex, acc), {});
familyHex["Other"]="#A7A1A5";

let deferredPrompt = null;
let db;
let editingPhoto = null;

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function toast(msg){
  const t = $("#toast");
  t.textContent = msg; t.hidden = false;
  clearTimeout(t._timer); t._timer = setTimeout(()=>t.hidden=true, 2200);
}

function go(viewId){
  $$(".view").forEach(v=>v.classList.toggle("active", v.id===viewId));
  $$(".tab").forEach(t=>t.classList.toggle("active", t.dataset.view===viewId));
  window.scrollTo({top:0, behavior:"smooth"});
  if(viewId==="wardrobeView") renderWardrobe();
}

$$(".tab").forEach(t=>t.addEventListener("click",()=>go(t.dataset.view)));
$$("[data-go]").forEach(b=>b.addEventListener("click",()=>go(b.dataset.go)));

function renderPalette(target, list, compact=false){
  const el = $(target);
  el.innerHTML = list.map(c => compact
    ? `<div class="swatch-card"><div class="swatch" style="background:${c.hex}"></div><small>${c.name}</small></div>`
    : `<div class="palette-row"><div class="mini" style="background:${c.hex}"></div><span>${c.name}</span></div>`
  ).join("");
}
renderPalette("#bestSwatches", palettes.strong.slice(0,8), true);
renderPalette("#strongPalette", palettes.strong);
renderPalette("#okayPalette", palettes.okay);
renderPalette("#cautionPalette", palettes.caution);

function openDB(){
  return new Promise((resolve,reject)=>{
    const req = indexedDB.open("closetColourDB",1);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      const s = d.createObjectStore("items",{keyPath:"id"});
      s.createIndex("category","category",{unique:false});
    };
    req.onsuccess=e=>resolve(e.target.result);
    req.onerror=e=>reject(e.target.error);
  });
}
function store(mode="readonly"){
  return db.transaction("items",mode).objectStore("items");
}
function getAll(){
  return new Promise((resolve,reject)=>{
    const r=store().getAll(); r.onsuccess=()=>resolve(r.result||[]); r.onerror=()=>reject(r.error);
  });
}
function putItem(item){
  return new Promise((resolve,reject)=>{
    const r=store("readwrite").put(item); r.onsuccess=()=>resolve(); r.onerror=()=>reject(r.error);
  });
}
function deleteItem(id){
  return new Promise((resolve,reject)=>{
    const r=store("readwrite").delete(id); r.onsuccess=()=>resolve(); r.onerror=()=>reject(r.error);
  });
}
function clearItems(){
  return new Promise((resolve,reject)=>{
    const r=store("readwrite").clear(); r.onsuccess=()=>resolve(); r.onerror=()=>reject(r.error);
  });
}

async function refreshStats(){
  const items=await getAll();
  $("#itemCount").textContent=items.length;
  $("#favCount").textContent=items.filter(x=>x.favourite).length;
  $("#colourCount").textContent=new Set(items.map(x=>x.colour)).size;
}

async function renderWardrobe(){
  const q=$("#wardrobeSearch").value.trim().toLowerCase();
  const cat=$("#categoryFilter").value;
  let items=await getAll();
  items.sort((a,b)=>(b.updated||0)-(a.updated||0));
  items=items.filter(i=>(!cat||i.category===cat) && (!q || [i.name,i.brand,i.colour,i.notes].join(" ").toLowerCase().includes(q)));
  $("#emptyWardrobe").style.display = (items.length || q || cat) ? "none":"block";
  $("#wardrobeGrid").innerHTML = items.map(i=>`
    <button class="item-card card" data-id="${i.id}" style="border:0;text-align:left;padding:0;background:#fff">
      ${i.photo ? `<img class="item-photo" src="${i.photo}" alt="">` : `<div class="item-photo placeholder">✦</div>`}
      ${i.favourite ? `<div class="fav-badge">♥</div>`:""}
      <div class="item-meta">
        <strong>${escapeHtml(i.name)}</strong>
        <small>${escapeHtml(i.category)} · ${escapeHtml(i.colour)}</small>
      </div>
    </button>`).join("");
  $$(".item-card").forEach(c=>c.addEventListener("click",()=>editItem(c.dataset.id)));
}
function escapeHtml(s=""){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}

$("#wardrobeSearch").addEventListener("input",renderWardrobe);
$("#categoryFilter").addEventListener("change",renderWardrobe);

function resetForm(){
  $("#itemForm").reset();
  $("#itemId").value="";
  $("#dialogTitle").textContent="Add item";
  $("#deleteItemBtn").hidden=true;
  $("#itemPreview").hidden=true;
  $("#itemPreview").src="";
  editingPhoto=null;
}
function showAdd(){
  resetForm();
  $("#itemDialog").showModal();
}
$("#addItemBtn").addEventListener("click",showAdd);
$("#emptyAddBtn").addEventListener("click",showAdd);
$("#closeDialogBtn").addEventListener("click",()=>$("#itemDialog").close());
$("#cancelItemBtn").addEventListener("click",()=>$("#itemDialog").close());

$("#itemPhoto").addEventListener("change", async e=>{
  const file=e.target.files?.[0]; if(!file)return;
  editingPhoto=await resizeImage(file,900,0.82);
  $("#itemPreview").src=editingPhoto; $("#itemPreview").hidden=false;
});

async function editItem(id){
  const item=(await getAll()).find(x=>x.id===id); if(!item)return;
  resetForm();
  $("#dialogTitle").textContent="Edit item";
  $("#itemId").value=item.id;
  $("#itemName").value=item.name||"";
  $("#itemCategory").value=item.category||"Tops";
  $("#itemColour").value=item.colour||"Other";
  $("#itemBrand").value=item.brand||"";
  $("#itemNotes").value=item.notes||"";
  $("#itemFavourite").checked=!!item.favourite;
  editingPhoto=item.photo||null;
  if(editingPhoto){$("#itemPreview").src=editingPhoto;$("#itemPreview").hidden=false}
  $("#deleteItemBtn").hidden=false;
  $("#itemDialog").showModal();
}
$("#itemForm").addEventListener("submit", async e=>{
  e.preventDefault();
  const id=$("#itemId").value || (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString());
  const item={
    id,
    name:$("#itemName").value.trim(),
    category:$("#itemCategory").value,
    colour:$("#itemColour").value,
    brand:$("#itemBrand").value.trim(),
    notes:$("#itemNotes").value.trim(),
    favourite:$("#itemFavourite").checked,
    photo:editingPhoto,
    updated:Date.now()
  };
  await putItem(item); $("#itemDialog").close();
  await renderWardrobe(); await refreshStats(); toast("Saved");
});
$("#deleteItemBtn").addEventListener("click",async()=>{
  const id=$("#itemId").value; if(!id)return;
  if(confirm("Delete this wardrobe item?")){
    await deleteItem(id); $("#itemDialog").close(); await renderWardrobe(); await refreshStats(); toast("Deleted");
  }
});

function resizeImage(file,maxDim=900,quality=.82){
  return new Promise((resolve,reject)=>{
    const img=new Image(), fr=new FileReader();
    fr.onload=()=>img.src=fr.result;
    fr.onerror=reject;
    img.onload=()=>{
      let w=img.width,h=img.height;
      const scale=Math.min(1,maxDim/Math.max(w,h)); w=Math.round(w*scale); h=Math.round(h*scale);
      const c=document.createElement("canvas"); c.width=w;c.height=h;
      c.getContext("2d").drawImage(img,0,0,w,h);
      resolve(c.toDataURL("image/jpeg",quality));
    };
    img.onerror=reject; fr.readAsDataURL(file);
  });
}

function hexToRgb(hex){
  const v=hex.replace("#","");
  return [parseInt(v.slice(0,2),16),parseInt(v.slice(2,4),16),parseInt(v.slice(4,6),16)];
}
function rgbToLab([r,g,b]){
  r/=255;g/=255;b/=255;
  [r,g,b]=[r,g,b].map(v=>v>.04045?Math.pow((v+.055)/1.055,2.4):v/12.92);
  let x=(r*.4124+g*.3576+b*.1805)/.95047;
  let y=(r*.2126+g*.7152+b*.0722)/1.00000;
  let z=(r*.0193+g*.1192+b*.9505)/1.08883;
  [x,y,z]=[x,y,z].map(v=>v>.008856?Math.cbrt(v):(7.787*v)+(16/116));
  return [(116*y)-16,500*(x-y),200*(y-z)];
}
function dist(a,b){return Math.sqrt(a.reduce((s,v,i)=>s+(v-b[i])**2,0))}
function nearestColour(rgb){
  const lab=rgbToLab(rgb);
  let best=null;
  for(const [group,list] of Object.entries(palettes)){
    for(const c of list){
      const d=dist(lab,rgbToLab(hexToRgb(c.hex)));
      if(!best||d<best.d)best={...c,group,d};
    }
  }
  return best;
}
function groupCopy(group,name){
  if(group==="strong") return {
    title:"Strong match",
    text:`${name} sits close to your strongest cool palette. This is the kind of colour worth trying near your face.`
  };
  if(group==="okay") return {
    title:"Likely wearable",
    text:name.includes("Cream") ? "Cream is wearable on you, but it gives less contrast. If you have a choice, try soft white, pearl or oyster beside it." :
      `${name} is within your softer/useful palette. Check it against your face, especially in natural light.`
  };
  return {
    title:"Use with care",
    text:`${name} is close to a warmer colour family that can be less flattering. Compare it with a cool alternative before buying.`
  };
}
function renderResult(el,rgb){
  const nearest=nearestColour(rgb), copy=groupCopy(nearest.group,nearest.name);
  const hex="#"+rgb.map(x=>Math.max(0,Math.min(255,Math.round(x))).toString(16).padStart(2,"0")).join("");
  el.innerHTML=`<div class="result-title"><div class="result-chip" style="background:${hex}"></div><div><strong>${copy.title}</strong><br><small>Closest guide colour: ${nearest.name}</small></div></div><p>${copy.text}</p>`;
  el.hidden=false;
}
$("#manualCheckBtn").addEventListener("click",()=>renderResult($("#manualResult"),hexToRgb($("#manualColour").value)));

$("#shopPhoto").addEventListener("change",e=>{
  const file=e.target.files?.[0]; if(!file)return;
  const img=new Image(), fr=new FileReader();
  fr.onload=()=>img.src=fr.result;
  img.onload=()=>{
    const c=$("#colourCanvas"),ctx=c.getContext("2d",{willReadFrequently:true});
    const side=Math.min(img.width,img.height)*.52;
    const sx=(img.width-side)/2, sy=(img.height-side)/2;
    ctx.clearRect(0,0,c.width,c.height);
    ctx.drawImage(img,sx,sy,side,side,0,0,c.width,c.height);
    const data=ctx.getImageData(0,0,c.width,c.height).data;
    let colors=[];
    for(let i=0;i<data.length;i+=16){
      const r=data[i],g=data[i+1],b=data[i+2];
      const max=Math.max(r,g,b),min=Math.min(r,g,b);
      if(max>246 || max<18) continue;
      const sat=max-min;
      colors.push({r,g,b,sat});
    }
    if(!colors.length){toast("Couldn’t read enough fabric colour");return}
    const satColors=colors.filter(x=>x.sat>12);
    const use=satColors.length>colors.length*.2?satColors:colors;
    const rgb=[
      use.reduce((s,x)=>s+x.r,0)/use.length,
      use.reduce((s,x)=>s+x.g,0)/use.length,
      use.reduce((s,x)=>s+x.b,0)/use.length
    ];
    renderResult($("#photoResult"),rgb);
  };
  fr.readAsDataURL(file);
});

$("#exportBtn").addEventListener("click",async()=>{
  const items=await getAll();
  const blob=new Blob([JSON.stringify({version:1,exported:new Date().toISOString(),items},null,2)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="closet-colour-backup.json"; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
});
$("#importInput").addEventListener("change",async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{
    const data=JSON.parse(await file.text());
    if(!Array.isArray(data.items))throw new Error();
    if(!confirm(`Import ${data.items.length} items? This will replace the wardrobe currently stored on this device.`))return;
    await clearItems(); for(const item of data.items) await putItem(item);
    await refreshStats(); await renderWardrobe(); toast("Backup imported");
  }catch{alert("That backup file could not be read.");}
});

window.addEventListener("beforeinstallprompt",e=>{
  e.preventDefault(); deferredPrompt=e; $("#installBtn").hidden=false;
});
$("#installBtn").addEventListener("click",async()=>{
  if(!deferredPrompt){toast("On iPhone: Share → Add to Home Screen");return}
  deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; $("#installBtn").hidden=true;
});
window.addEventListener("appinstalled",()=>toast("Closet Colour installed"));

if("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js"));

(async function init(){
  db=await openDB();
  await refreshStats();
  await renderWardrobe();
})();
