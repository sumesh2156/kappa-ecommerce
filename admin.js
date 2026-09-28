const API = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "http://localhost:5000"
  : "https://kappa-ecommerce-production.up.railway.app";
let adminToken = sessionStorage.getItem("kappaAdminToken") || "";
let adminProducts = [];
let chosenImageData = "";

function authHeaders(json=true){const h={Authorization:`Bearer ${adminToken}`};if(json)h["Content-Type"]="application/json";return h}
function parseList(v){try{const x=JSON.parse(v);return Array.isArray(x)?x:[]}catch{return String(v||"").split(",").map(x=>x.trim()).filter(Boolean)}}

async function adminLogin(event){
  event.preventDefault();
  const message=document.getElementById("loginMessage"); message.textContent="Signing in...";
  const response=await fetch(`${API}/api/admin/login`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:adminEmail.value.trim(),password:adminPassword.value})});
  const data=await response.json();
  if(!response.ok){message.textContent=data.message||"Login failed";return}
  adminToken=data.token;sessionStorage.setItem("kappaAdminToken",adminToken);message.textContent="";await openAdmin();
}
async function openAdmin(){
  loginView.classList.add("hidden");adminView.classList.remove("hidden");
  try{await loadAdminProducts();await loadCategories()}catch(e){sessionStorage.removeItem("kappaAdminToken");adminToken="";adminView.classList.add("hidden");loginView.classList.remove("hidden");loginMessage.textContent="Admin session expired. Please sign in again."}
}
async function adminLogout(){try{await fetch(`${API}/api/admin/logout`,{method:"POST",headers:authHeaders(false)})}catch{}sessionStorage.removeItem("kappaAdminToken");location.reload()}
async function loadCategories(){const r=await fetch(`${API}/api/categories`);const cats=await r.json();pCategory.innerHTML='<option value="">Select category</option>'+cats.filter(c=>c.id!=="recently-viewed").map(c=>`<option value="${c.id}">${c.name}</option>`).join("")}
async function loadAdminProducts(){const r=await fetch(`${API}/api/admin/products`,{headers:authHeaders(false)});if(!r.ok)throw new Error("Unauthorized");adminProducts=await r.json();productsBody.innerHTML=adminProducts.map(p=>`<tr><td><img class="thumb" src="${p.image||''}" alt=""></td><td><strong>${p.name}</strong><br><small>${p.brand||''}</small></td><td>${p.category}</td><td>₹${p.price}</td><td class="${p.stock>0?'stock-ok':'stock-out'}">${p.stock>0?p.stock:'Out of Stock'}</td><td><div class="actions"><button class="edit-btn" onclick="editProduct(${p.id})">Edit</button><button class="delete-btn" onclick="deleteProduct(${p.id})">Delete</button></div></td></tr>`).join("")}
function openProductForm(){productForm.reset();editProductId.value="";productFormTitle.textContent="Add Product";chosenImageData="";imagePreview.classList.add("hidden");productFormCard.classList.remove("hidden");productMessage.textContent="";pStock.value=0;pDiscount.value=0;pRating.value=0;productFormCard.scrollIntoView({behavior:"smooth"})}
function closeProductForm(){productFormCard.classList.add("hidden")}
function editProduct(id){const p=adminProducts.find(x=>x.id===id);if(!p)return;openProductForm();editProductId.value=p.id;productFormTitle.textContent="Edit Product";pName.value=p.name;pBrand.value=p.brand||"";pCategory.value=p.category;pPrice.value=p.price;pOriginalPrice.value=p.originalPrice;pDiscount.value=p.discount;pRating.value=p.rating;pStock.value=p.stock;pColors.value=parseList(p.colors).join(", ");pSizes.value=parseList(p.sizes).join(", ");pDescription.value=p.description||"";pImageUrl.value=p.image||"";if(p.image){imagePreview.src=p.image;imagePreview.classList.remove("hidden")}}
function previewImage(event){const file=event.target.files[0];if(!file)return;if(file.size>5*1024*1024){alert("Please choose an image smaller than 5 MB.");event.target.value="";return}const reader=new FileReader();reader.onload=()=>{chosenImageData=reader.result;imagePreview.src=reader.result;imagePreview.classList.remove("hidden")};reader.readAsDataURL(file)}
async function saveProduct(event){event.preventDefault();const id=editProductId.value;const existing=id?adminProducts.find(x=>x.id===Number(id)):null;const payload={name:pName.value.trim(),brand:pBrand.value.trim(),category:pCategory.value,price:Number(pPrice.value),originalPrice:Number(pOriginalPrice.value||pPrice.value),discount:Number(pDiscount.value||0),rating:Number(pRating.value||0),stock:Number(pStock.value||0),colors:pColors.value,sizes:pSizes.value,description:pDescription.value.trim(),image:chosenImageData||pImageUrl.value.trim()||(existing?.image||"")};productMessage.textContent="Saving...";const r=await fetch(id?`${API}/api/admin/products/${id}`:`${API}/api/admin/products`,{method:id?"PUT":"POST",headers:authHeaders(),body:JSON.stringify(payload)});const data=await r.json();if(!r.ok){productMessage.textContent=data.message||"Could not save product";return}productMessage.textContent=data.message;await loadAdminProducts();setTimeout(closeProductForm,500)}
async function deleteProduct(id){const p=adminProducts.find(x=>x.id===id);if(!confirm(`Delete ${p?.name||'this product'} from the store?`))return;const r=await fetch(`${API}/api/admin/products/${id}`,{method:"DELETE",headers:authHeaders(false)});const data=await r.json();if(!r.ok){alert(data.message||"Delete failed");return}await loadAdminProducts()}
function formatOrderDate(value){
  if(!value) return "—";
  const d=new Date(value);
  if(Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {dateStyle:"medium", timeStyle:"short"});
}
async function loadOrders(){
  const r=await fetch(`${API}/api/admin/orders`,{headers:authHeaders(false)});
  const rows=await r.json();
  if(!r.ok)return alert(rows.message||"Could not load orders");
  const statuses=["confirmed","processing","shipped","delivered","cancelled"];
  ordersBody.innerHTML=rows.map(o=>{
    const items=(o.items||[]).map(i=>`<div><strong>${i.name||"Product"}</strong> × ${i.quantity}${i.size?` · ${i.size}`:""}${i.color?` · ${i.color}`:""}</div>`).join("") || "<small>No item details</small>";
    return `<tr><td>#${o.id}</td><td>${o.customer_name||''}<br><small>${o.phone||''}</small></td><td>${items}</td><td>₹${Number(o.total||0).toFixed(2)}</td><td>${o.payment_method||''}</td><td><select class="status-select" onchange="updateOrderStatus(${o.id},this.value)">${statuses.map(s=>`<option value="${s}" ${String(o.status).toLowerCase()===s?'selected':''}>${s}</option>`).join('')}</select></td><td>${formatOrderDate(o.created_at)}</td></tr>`;
  }).join('');
}
async function updateOrderStatus(id,status){const r=await fetch(`${API}/api/admin/orders/${id}/status`,{method:"PUT",headers:authHeaders(),body:JSON.stringify({status})});if(!r.ok){const d=await r.json();alert(d.message||"Update failed")}}
async function loadUsers(){const r=await fetch(`${API}/api/admin/users`,{headers:authHeaders(false)});const rows=await r.json();if(!r.ok)return alert(rows.message||"Could not load users");usersBody.innerHTML=rows.map(u=>`<tr><td>${u.id}</td><td>${u.name||''}</td><td>${u.email||''}</td><td>${u.phone||''}</td><td>${u.address||''}</td></tr>`).join('')}
async function showAdminTab(name,button){document.querySelectorAll('.admin-section').forEach(x=>x.classList.add('hidden'));document.getElementById(`${name}Tab`).classList.remove('hidden');document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));button.classList.add('active');if(name==='orders')await loadOrders();if(name==='users')await loadUsers()}
if(adminToken)openAdmin();
