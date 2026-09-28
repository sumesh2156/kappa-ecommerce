const API = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "http://localhost:5000"
  : "https://kappa-ecommerce-production.up.railway.app";

let categories =[];
let products =[];
let currentUser ={
    name:"",
    email:"",
    phone:"",
    address:""

}
let filteredproducts =[];
let  recentlyviewed =[];

let cart = [];
let order = [];
let currentOrderSteps = 1;



async function loadData() {
    try {

        // Load categories and products separately
        const [categoriesResponse, productsResponse] = await Promise.all([
            fetch(`${API}/api/categories`),
            fetch(`${API}/api/products`)
        ]);

        if (!categoriesResponse.ok || !productsResponse.ok) {
            throw new Error("Failed to load data");
        }

        categories = await categoriesResponse.json();
        products = await productsResponse.json();

        console.log("Categories loaded:", categories);
        console.log("Products loaded from MySQL:", products);

        await initializeApp();

    } catch (error) {

        console.error("Error loading data:", error);

        document.body.innerHTML = `
            <div style="text-align:center; margin-top:50px;">
                <h2>Error loading data. Please refresh the page.</h2>
            </div>
        `;
    }
}

async function initializeApp(){
    await loadUserData();
   await loadCartData();
   await loadOrderData();
         loadRecentlyViewed();
    rendercategories();
    updateAccountPage();
    showpage("home");
}

document.addEventListener("DOMContentLoaded",function(){
    loadData()
})

function showpage(pageID){
    const page = document.querySelectorAll(".page")
    page.forEach(page=> page.classList.add("hidden"))

    const targetpage = document.getElementById(pageID + "page")
    if(targetpage){
        targetpage.classList.remove("hidden")
    }




    switch(pageID){
        case "home":
            rendercategories();
            break;
         case "cart":
            rendercart();
            break;
         case "order":
            renderOrderSteps();
            break;
            case "orders":
    renderOrders();
    break;
            case "account":
                loadUserAccountPage()
                break;
        
    }
}


function toggleSidebar() {
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.querySelector(".sidebar-overlay");

  sidebar.classList.toggle("active");
  overlay.classList.toggle("active");
}

function closeSidebar() {
    document.querySelector('.sidebar').classList.remove('active');
    document.querySelector('.sidebar-overlay').classList.remove('active');
}


function searchProducts() {
    const searchTerm = document.getElementById("searchInput").value.toLowerCase();

    // 1. Exit early if the search input is empty or just spaces
    if (searchTerm.trim() === "") return;

    // 2. Filter the global products array (Make sure filteredProducts is declared globally or outside)
    filteredproducts = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) || 
        product.brand.toLowerCase().includes(searchTerm) || 
        product.description.toLowerCase().includes(searchTerm)
    );

    // 3. Update the UI header with backticks for the template literal
    document.getElementById("categoryTitle").textContent = `Search results for "${searchTerm}"`;

    // 4. Refresh filters, render the matching items, and navigate to the search results page
    populateFilters();
    renderProducts();
    showpage("category"); 
}







function rendercategories(){
    const categorygrid = document.getElementById("categorygrid")
    categorygrid.innerHTML="";

    categories.forEach(category =>{
        const categorycard = document.createElement("div");
        categorycard.className = "category-card";
        categorycard.onclick =()=> showcategory(category.id);


        let cardContent =`
        <img src="${category.image}" alt="${category.name}">
        <div class="category-card-content">
        <h3>${category.name}</h3>
        <p>${category.description}</p>

        `;
        if(category.recentlyviewed){
            if(recentlyviewed.length === 0){
                cardContent +='<p><em>No Rencently Viewed products</em></p>'

            }else{
                 cardContent +=`<p>You have ${recentlyviewed.length}
                 Recently viewed items</p>`
            }
        }
        
        cardContent +=`
        <a href="#" class="category-btn">view products</a>
        </div>
        `;
        categorycard.innerHTML = cardContent;
        categorygrid.appendChild(categorycard);

    });
}


function showcategory(categoryid){
    if(categoryid === "recently-viewed"){
        filteredproducts = products.filter(product => recentlyviewed.includes(product.id))
        
        document.getElementById("categoryTitle").textContent="Recently viewed products"

    }
    else{
        filteredproducts = products.filter(product => product.category=== categoryid);
        const category = categories.find(cat => cat.id === categoryid);
        document.getElementById("categoryTitle").textContent= category.name;
        
    }
    populateFilters();
    renderProducts();
    showpage("category");

}


function populateFilters() {
  const brandFilter = document.getElementById("brandfilter");
  const brands = [...new Set(filteredproducts.map(product => product.brand))];

  
  brandFilter.innerHTML = '<option value="">All Brands</option>';
  brands.forEach(brand => {
    const option = document.createElement("option");
    option.value = brand;
    option.textContent = brand;
    brandFilter.appendChild(option);
  });
} 


function applyFilters() {
    const sortBy = document.getElementById("sortBy").value;
    const maxPrice = parseInt(document.getElementById("priceRange").value);
    const selectedBrand = document.getElementById("brandfilter").value;
    document.getElementById("priceValue").textContent = `₹ ${maxPrice}`;
    let filtered = filteredproducts.filter(product => {
        if (product.price > maxPrice) return false;
        if (selectedBrand && product.brand !== selectedBrand) return false;
        return true;
    });

   switch (sortBy) {
  case 'price-low':
    filtered.sort((a, b) => a.price - b.price);
    break;
  case 'price-high':
    filtered.sort((a, b) => b.price - a.price);
    break;
  case 'rating':
    filtered.sort((a, b) => b.rating - a.rating);
    break;
  default:
    break;
}

renderProducts(filtered)
}


function renderProducts(products = filteredproducts) {
    const productGrid = document.getElementById("productGrid");
    productGrid.innerHTML = "";

    if (products.length === 0) {
        productGrid.innerHTML = '<p>No products found matching your criteria.</p>';
        return;
    }

    products.forEach(product => {
        const productCard = document.createElement("div");
        productCard.className = "product-card";
        
    
        productCard.onclick = () => showProduct(product.id);

        
        productCard.innerHTML = `
            <img src="${product.image}" alt="${product.name}"> 
            <div class="product-card-content">
                <div class="product-brand">${product.brand}</div> 
                <h3>${product.name}</h3>
                <div class="product-rating">
                    ${"★".repeat(Math.floor(product.rating))}${"☆".repeat(5-Math.floor(product.rating))}
                    ${product.rating} 
                </div>
                <div class="stock-label ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}">${product.stock > 0 ? `${product.stock} in stock` : "Out of Stock"}</div>
                <div class="product-price">
                <span class="current-price"> ₹ ${product.price}</span>
                <span class="orignal-price"> ₹ ${product.originalPrice}</span>
                <span class="discount"> ₹ ${product.discount}% OFF</span>
                </div>

            </div>
        `;

        productGrid.appendChild(productCard)

             
    });
}




function showProduct(productId) {
    const product = products.find(p => p.id === productId);

    if (!product) return;

    if (!recentlyviewed.includes(productId)) {
        recentlyviewed.unshift(productId);
        if (recentlyviewed.length > 10) {
            recentlyviewed.pop();
        }
        saveRecentlyViewed();
    }

    const productDetail = document.getElementById("productDetail");
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 7);

    productDetail.innerHTML = `
        <div>
            <img src="${product.image}" alt="${product.name}" class="product-image">
        </div>





        <div class="product-info">
        <h1>${product.name}</h1>
        <div class="brand">${product.brand}</div>
  
  <div class="product-rating">
    ${'★'.repeat(Math.floor(product.rating))}${'☆'.repeat(5-Math.floor(product.rating))}
    ${product.rating}/5
  </div>
  
  <div class="product-price">
    <span class="current-price">${product.price}</span>
    <span class="original-price">${product.originalPrice}</span>
    <span class="discount">${product.discount}% OFF</span>
  </div>
  
  <div class="description">${product.description}</div>
  
  <div class="product-option">
  ${product.colors.length > 0 ? `
    <div class="option-group">
      <label>Color:</label>
      <select id="selectedColor">
        ${product.colors.map(color => `<option value="${color}">${color}</option>`).join("")}
      </select>
    </div>
  ` : ''}


    
  ${product.sizes.length > 0 ? `
    <div class="option-group">
      <label>size:</label>
      <select id="selectedSize">
        ${product.sizes.map(size => `<option value="${size}">${size}</option>`).join("")}
      </select>
    </div>
  ` : ''}

</div>

<div class="address-section">
  <h3>Delivery Address</h3>

  <!-- If the user has an address -->
  ${currentUser.address ? `
    <p>${currentUser.address}</p>
    <button class="btn-secondary" onclick="showpage('account')">Change Address</button>
  ` : `
    <!-- If the user does not have an address -->
    <p>No address added</p>
    <button class="btn-secondary" onclick="showpage('account')">Add Address</button>
  `}
</div>

<div class="delivery-info">
  <h4>Delivery Information</h4>
  <p>🗓️ Delivery by ${deliveryDate.toLocaleDateString()}</p>
  <p>📦↩ 10 days return policy</p>
  <p>💵 Cash on delivery available</p>
</div>

<div class="stock-label ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}">
   ${product.stock > 0 ? `${product.stock} item(s) in stock` : 'Out of Stock'}
</div>
<div class="product-actions">
   <button class="btn-primary" onclick="addToCart(${product.id})" ${product.stock <= 0 ? 'disabled' : ''}>Add to cart</button>
   <button class="btn-secondary" onclick="buynow(${product.id})" ${product.stock <= 0 ? 'disabled' : ''}>BUY NOW</button>
   </div>
</div>

    `;
    showpage("product")

}

function buynow(productId){
    addToCart(productId)
    showpage("cart")
}


function validateName(name) {
  const nameRegex = /^[a-zA-Z\s]{2,50}$/;
  return nameRegex.test(name.trim());
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

function validatePhone(phone) {
    const cleanPhone = String(phone).replace(/\D/g, "");
    return /^[6-9][0-9]{9}$/.test(cleanPhone);
}

function addToCart(productId) {
 
  const product = products.find(p => p.id === productId); 
  if (!product) return;
  if (!product.inStock || product.stock <= 0) {
    alert("This product is out of stock.");
    return;
  }

  
  const selectedColor = document.getElementById("selectedColor")?.value || "";
  const selectedSize = document.getElementById("selectedSize")?.value || "";

  
  const existingItem = cart.find(item => item.id === productId && 
    item.color === selectedColor && 
    item.size === selectedSize);

if (existingItem) {
  if (existingItem.quantity >= product.stock) {
    alert(`Only ${product.stock} item(s) are available.`);
    return;
  }
  existingItem.quantity += 1;
} else {
  cart.push({
    id: productId,
    name: product.name,
    brand: product.brand,
    price: product.price,
    originalPrice: product.originalPrice,
    discount: product.discount,
    image: product.image,
    color: selectedColor,
    size: selectedSize,
    quantity: 1
  });
}   
   updateCartCount();
   saveCartData();
   saveCartToBackend();
  
}

function rendercart(){
    const cartitemsContainer = document.getElementById("cartitems");
     const cartsummery = document.getElementById("cartsummery");
     if (cart.length === 0) {
    cartitemsContainer.innerHTML = '<p>Your cart is empty. <a href="#" onclick="showpage(\'home\')">Continue Shopping</a></p>';
    cartsummery.innerHTML = '';
    return;
} 
    cartitemsContainer.innerHTML = '';
    let totalOriginal = 0;
    let totalDiscounted = 0;

    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        const itemOriginalTotal = item.originalPrice * item.quantity;

        totalOriginal += itemOriginalTotal;
        totalDiscounted += itemTotal;

        const cartitems = document.createElement("div"); 
cartitems.className = "cart-item";

cartitems.innerHTML = `
  <img src="${item.image}" alt="${item.name}">
  
  <div class="cart-item-details">
    <h3>${item.name}</h3>
    <div class="product-brand">${item.brand}</div>
    
    ${item.color ? `<p>Color: ${item.color}</p>` : ""}
    ${item.size ? `<p>Size: ${item.size}</p>` : ""}
    
    <div class="product-price">
      <span class="current-price">₹${item.price}</span>
      <span class="original-price">₹${item.originalPrice}</span> 
      <span class="discount">₹${item.discount}% OFF</span>
    </div>
    
    <div class="quantity-controls">
      <button class="quantity-btn" onclick="updateQuantity(${index}, -1)">-</button> 
      <input type="number" class="quantity-input" value="${item.quantity}" min="1" onchange="updateQuantity(${index}, 0, this.value)"> 
      <button class="quantity-btn" onclick="updateQuantity( ${index}, 1)">+</button>
    </div>
    <p>Total : ₹${itemTotal}</p>
  </div>
  <button class="btn-secondary" onclick="removeFromCart(${index})">Remove</button>

`;
cartitemsContainer.appendChild(cartitems)
    });


    // 1. Calculate delivery charges and final total
const deliveryCharges = totalDiscounted > 500 ? 0 : 50;
const finalTotal = totalDiscounted + deliveryCharges;

// 2. Render the HTML dynamically into the cart summary container
cartsummery.innerHTML = `
  <h3>Price Details</h3>
  
  <div class="summary-row">
    <span>Total MRP:</span> 
    <span>₹${totalOriginal}</span>
  </div>
  
  <div class="summary-row"> 
    <span>Discount:</span> 
    <span>₹${totalOriginal - totalDiscounted}</span>
  </div>
  
  <div class="summary-row"> 
    <span>Delivery Charges:</span>
    <span>₹${deliveryCharges === 0 ? "FREE" : "₹" + deliveryCharges}</span>
  </div>
  
  <div class="summary-divider"></div>
  
  <div class="summary-row summary-total">
    <span>Total Amount:</span> 
    <span>₹${finalTotal}</span>
  </div>
  
  <button class="btn-primary" onclick="proceedToCheckout()" style="width:100%; margin-top:20px;">
  Place order
  </button>
`;
}
     


function updateQuantity(index, Change, newValue = null){
    const item = cart[index];
    const product = products.find(p => p.id === item.id);
    const maxStock = product ? product.stock : item.quantity;
    let wanted;

    if (newValue !== null) {
        wanted = Math.max(1, parseInt(newValue, 10) || 1);
    } else {
        wanted = Math.max(1, item.quantity + Change);
    }

    if (wanted > maxStock) {
        alert(`Only ${maxStock} item(s) are available.`);
        wanted = maxStock;
    }

    item.quantity = wanted;
    updateCartCount();
    saveCartData();
    saveCartToBackend();
    rendercart();
}

function renderOrderSteps(){
    const orderSteps = document.getElementById("orderSteps")

    if(currentOrderSteps === 1){
      
if (!currentUser.name || !currentUser.phone || !currentUser.address) {
    orderSteps.innerHTML = `
        <div class="order-form">
            <h2>Step 1: Enter Your Details</h2>
            
            <div class="form-group">
                <label for="orderName">Name:</label>
                <input type="text" id="orderName" value="${currentUser.name }" placeholder="Enter your name">
            </div>

            <div class="form-group">
                <label for="orderPhone">Phone Number:</label>
                <input type="tel" id="orderPhone" value="${currentUser.phone }" placeholder="Enter your phone number">
            </div>

            <div class="form-group">
                <label for="orderAddress">Address:</label>
                <textarea id="orderAddress" placeholder="Enter your address">${currentUser.address }</textarea>
            </div>
            <button class="btn-primary" onclick="saveOrderDetails()">continue to summary </button>
        </div>

    `;

}else {
    currentOrderSteps =2;
    renderOrderSteps();
}
}else if (currentOrderSteps === 2){
    const carttotal = cart.reduce((total,item)=> total +(item.price * item.quantity),0);
    const deliveryCharges = carttotal >500 ? 0: 50;
    const finalTotal = carttotal + deliveryCharges;

   
let cartItemsHtml = '';


cart.forEach(item => {
  cartItemsHtml += `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.name}"> 
      <div class="cart-item-details"> 
        <h3>${item.name}</h3>
        <div class="product-brand">${item.brand}</div>
        ${item.color ? `<p>Color: ${item.color}</p>` : ""} 
        ${item.size ? `<p>Size: ${item.size}</p>` : ""} 
        <p>Quantity: ${item.quantity}</p>
        <p>Price: ₹${item.price * item.quantity}</p>
      </div>
    </div>
  `;
});


orderSteps.innerHTML = `
  <div class="order-form">
    <h2>Step 2: Order Summary</h2> 
    <div class="address-section"> 
      <h3>Delivery Address</h3> 
      <p><strong>${currentUser.name}</strong></p> 
      <p>${currentUser.phone}</p> 
      <p>${currentUser.address}</p>
    </div>




   <h3>Order Items</h3> 
${cartItemsHtml}
<div class="cart-summary"> 
  <div class="summary-row">
    <span>Items Total:</span> 
    <span>${carttotal}</span>
  </div>
  <div class="summary-row"> 
    <span>Delivery Charges:</span> 
    <span>${deliveryCharges === 0 ? "FREE" : deliveryCharges}</span>
  </div>
  <div class="summary-divider"></div>
  <div class="summary-row summary-total">
    <span>Total Amount:</span>
    <span>₹${finalTotal}</span>
  </div>
</div>
<button class="btn-primary" onclick="proceedToPayment()">Proceed to Payment</button>
  </div>
`;

}else if ( currentOrderSteps === 3) {
    orderSteps.innerHTML = `
        <div class="order-form"> 
            <h2>Step 3: Payment</h2>
            <div class="payment-options">
                <div class="payment-option"> 
                    <input type="radio" id="upi" name="payment" value="upi"> 
                    <label for="upi">UPI Payment</label>
                </div>
                <div class="payment-option"> 
                    <input type="radio" id="card" name="payment" value="card"> 
                    <label for="card">Credit/Debit Card</label>
                </div>
                <div class="payment-option"> 
                    <input type="radio" id="cod" name="payment" value="cod" checked> 
                    <label for="cod">Cash on Delivery</label>
                </div>
            </div>
            <button class="btn-primary" onclick="placeOrder()">Place Order</button>
        </div>
    `;
}
}
function saveOrderDetails() {
    // 1. Get and trim input values
    const name = document.getElementById("orderName").value.trim();
    const phone = document.getElementById("orderPhone").value.trim();
    const address = document.getElementById("orderAddress").value.trim();

    // 2. Validate required fields (Name and Address)
    if (!name || !phone || !address) {
        alert("Please fill all required fields");
        return;
    }


    if(!validateName(name)){
        alert('please enter valid name {2-50 charcters,letter only.');
        return;
    }
    if(!validateName(phone)){
        alert('please enter valid 10-digit phone number' );
        return;
    }

    // 3. Save data to the current user object
    currentUser.name = name;
    currentUser.phone = phone;
    currentUser.address = address;
    saveUserData();

    // 4. Advance the order steps
    currentOrderSteps = 2;
    renderOrderSteps();
}

function proceedToPayment() { 
    currentOrderSteps = 3; // Ensure currentOrderSteps is declared elsewhere in your scope
    renderOrderSteps(); 
} 

async function placeOrder() {

    if (!currentUser || !currentUser.id) {
    alert("Please login before placing an order.");
    return;
}

    if(currentUser.phone && !validatePhone(currentUser.phone)){
    alert("Please enter a valid 10-digit phone number.");
    return;
}
    // 1. Corrected the CSS selector syntax with proper quotes
    const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value;
    
    if (!paymentMethod) { 
        alert("Please select a payment method."); 
        return; 
    } 
    
    // 2. Properly declared variables and fixed "Data.now()" typo to "Date.now()"
    const orderId = 'ORD' + Date.now(); 
    const orderDate = new Date(); 
    const deliveryDate = new Date(); 
    deliveryDate.setDate(deliveryDate.getDate() + 7);


    // 1. Calculate the subtotal of the cart
const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

// 2. Determine delivery charges (Free if subtotal is over 500, otherwise 50)
const deliveryCharges = subtotal > 500 ? 0 : 50;

// 3. Construct the order object
const newOrder  = {
    userId: currentUser.id,
  id: orderId,
  items: [...cart],
  total: cart.reduce((total,item)=> total +(item.price * item.quantity),0), // Grand total including delivery
  deliveryCharges: cart.reduce((total,item)=> total +(item.price * item.quantity),0) >500 ? 0 : 50,
  paymentMethod: paymentMethod,
  orderDate: orderDate,
  deliveryDate: deliveryDate,
  status: "confirmed",
  address: currentUser.address, // Fixed spelling from 'currrentUser'
  phone: currentUser.phone,
  name: currentUser.name
};


try {
    const response = await fetch(`${API}/api/orders`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(newOrder)
    });

    if (!response.ok) {
        throw new Error("Failed to place order");
    }

    const result = await response.json();

console.log("Order saved to backend:", result);

order.push(newOrder);

// Clear cart from MySQL backend
const clearCartResponse = await fetch(`${API}/api/cart?userId=${currentUser.id}`, {
    method: "DELETE"
});

if (!clearCartResponse.ok) {
    throw new Error("Order placed but failed to clear cart");
}

// Clear frontend cart
cart = [];

updateCartCount();

console.log("Cart cleared after order");

} catch (error) {
    console.error("Error placing order:", error);
    alert("Failed to place order");
    return;
}










document.getElementById("orderSteps").innerHTML = `
<div class="order-success">
    <h1>Order Placed Successfully!</h1>
    <p>Your Order ID: <strong>${orderId}</strong></p>
    <p>Expected delivery: ${deliveryDate.toLocaleDateString()}</p>
    
   
    <button class="btn-primary" onclick="showpage('orders')">View My Orders</button>
    <button class="btn-secondary" onclick="showpage('home')">Continue Shopping</button>
</div>
`;
}

function parseOrderDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

function getDeliveryDate(orderData) {
    const explicit = parseOrderDate(orderData.deliveryDate);
    if (explicit) return explicit;
    const placed = parseOrderDate(orderData.orderDate);
    if (!placed) return null;
    const delivery = new Date(placed);
    delivery.setDate(delivery.getDate() + 7);
    return delivery;
}

function formatCustomerDate(value, includeTime = false) {
    const d = value instanceof Date ? value : parseOrderDate(value);
    if (!d) return "Not available";
    return includeTime
        ? d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
        : d.toLocaleDateString("en-IN", { dateStyle: "medium" });
}

function renderOrders() {
    const ordersList = document.getElementById("ordersList");
    
    // Clear previous content
    ordersList.innerHTML = '';

    // Handle empty state
    if (order.length === 0) {
        ordersList.innerHTML = '<p>No orders found. <a href="#" onclick="showpage(\'home\')">Start shopping</a></p>'; 
        return;
    }

    // Sort orders by date (newest first)
    const sortedOrders = [...order].sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));

    // Render each order
    sortedOrders.forEach(order => {
        const currentDate = new Date();
        const deliveryDate = getDeliveryDate(order);
        const isDelivered = String(order.status || "").toLowerCase() === "delivered";

        const orderDiv = document.createElement("div"); 
        orderDiv.className = "order-card";

        let orderItemsHtml = "";

order.items.forEach(item => { 
  orderItemsHtml += `
    <div class="cart-item">
      <img src="${item.image}" alt="${item.name}"> 
      <div class="cart-item-details">
        <h3>${item.name}</h3>
        <div class="product-brand">${item.brand}</div> 
        ${item.color ? `<p>Color: ${item.color}</p>` : ""} 
        ${item.size ? `<p>Size: ${item.size}</p>` : ""} 
        <p>Quantity: ${item.quantity}</p> 
        <p>Price: ${item.price * item.quantity}</p>
      </div>
    </div>
  `;
});
       orderDiv.innerHTML = `
<div class="order-header" onclick="toggleOrderDetails('${order.id}')">
    <div class="order-summary">
        <h3>Order ID: ${order.id}</h3> 
        <span class="status-badge ${isDelivered ? "delivered" : "on-way"}">
            ${isDelivered ? "Delivered" : "On the way"}
        </span>
    </div>
    <div class="order-meta">
        <p><strong>Order Date:</strong>${formatCustomerDate(order.orderDate, true)}</p>
        <p><strong>Total:</strong> ₹${(order.total + order.deliveryCharges).toFixed(2)}</p>
        <p><strong>Items:</strong> ${order.items.length} item${order.items.length > 1 ? "s" : ""}</p>
    </div>
    <div class="dropdown-arrow"> 
        <span class="arrow-icon">▼</span>
    </div>
</div>


<div class="order-details" id="details-${order.id}" style="display: none;">
    <div class="order-info">
        <p><strong>Delivery Date:</strong> ${formatCustomerDate(deliveryDate)}</p> 
        <p><strong>Payment Method:</strong> ${order.paymentMethod.toUpperCase()}</p>
        
        <div class="address-section"> 
            <h4>Delivery Address:</h4> 
            <p>${order.name}</p> 
            <p>${order.phone}</p>
            <p>${order.address}</p>
        </div>
        
        <h4>Order Items:</h4> 
        ${orderItemsHtml}
        
        <div class="cart-summary">
            <div class="summary-row">
                <span>Items Total:</span>
                <span>${order.total}</span>
            </div>
            <div class="summary-row">
                <span> Delivery Charges:</span>
                <span>${order.deliveryCharges === 0 ? "FREE": "₹" + order.deliveryCharges}</span>
            </div>
            <div class="summary-divider></div>
            <div class="summary-row summary-total">
                <span>Total paid:</span>
                <span>${order.total + order.deliveryCharges}</span>
            </div>
        </div>
    </div>
</div>

`;
       ordersList.appendChild(orderDiv);        
    });
}

function toggleOrderDetails(orderId) { 
    // Fix: Added backticks for template literal syntax
    const detailsDiv = document.getElementById(`details-${orderId}`); 
    
    // Fix: Added quotes around the class selector
    const arrowIcon = detailsDiv.previousElementSibling.querySelector('.arrow-icon'); 
    
    // Fix: Added quotes around CSS property values ('none', 'block')
    if (detailsDiv.style.display === 'none') { 
        detailsDiv.style.display = 'block'; 
        arrowIcon.style.transform = 'rotate(180deg)'; 
    } else {
        detailsDiv.style.display = 'none'; 
        // Fix: Changed '@deg' to 'rotate(0deg)' to reset the arrow icon
        arrowIcon.style.transform = 'rotate(0deg)'; 
    }
}

function saveOrdersData(){
  try{
    window.ordersData= order

  }catch(e){
    console.log ("storage not available")
  }

}

function saveUserData(){
  try{
    window.userData= currentUser

  }catch(e){
    console.log ("storage not available")
  }
}




function loadUserAccountPage() {
    document.getElementById("userName").value = currentUser.name || "";
    document.getElementById("userEmail").value = currentUser.email || "";
    document.getElementById("userPhone").value = currentUser.phone || "";
    document.getElementById("userAddress").value = currentUser.address || "";
}




async function saveUserInfo() {
    // 1. Fixed typo in 'currentUser'
    // 2. Added missing () to .trim()
    currentUser.name = document.getElementById("userName").value.trim();
    currentUser.email = document.getElementById("userEmail").value.trim();
    currentUser.phone = document.getElementById("userPhone").value.trim();
    
    // 3. Fixed 'document.getElementById' and the ID typo ('userAddress')
    currentUser.address = document.getElementById("userAddress").value.trim(); 


     if(currentUser.name && !validateName(currentUser.name)){
    alert("Please enter a valid name (2-50 characters, letters only).");
    return;
}









if(currentUser.email && !validateEmail(currentUser.email)){
    alert("Please enter a valid email.");
    return;
}
    // 4. Removed broken alert() syntax and called the correct function
    await saveUserDataToBackend();

    // 5. Closed the alert string and parenthesis properly
    
}


async function saveUserDataToBackend() {
    try {
       const response = await fetch(`${API}/api/user`,  {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(currentUser)
        });

        if (!response.ok) {
            throw new Error("Failed to save user");
        }

        const data = await response.json();

        console.log("User saved:", data);

        alert("Information saved successfully!");

    } catch (error) {
        console.error("Error saving user:", error);
        alert("Could not save user information");
    }
}




function removeFromCart(index){
    cart.splice(index,1);
    updateCartCount();
    saveCartData();
    rendercart();

}

function proceedToCheckout(){
     currentOrderSteps = 1;
    showpage('order');
}


function updateCartCount(){
    const cartCount = cart.reduce((total,item)=> total + item.quantity,0)
    document.getElementById("cartCount").textContent = cartCount
}


function saveCartData(){
    try{
        window.cartData = cart
    }catch (e){
        console.log("storage not available")
    }
}


async function saveCartToBackend() {

    if (!currentUser || !currentUser.id) {

        alert("Please login before adding products to cart.");

        return;
    }

    try {

        const response = await fetch(
            `${API}/api/cart`,
            {
                method: "PUT",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    userId: currentUser.id,
                    cart: cart
                })
            }
        );

        if (!response.ok) {
            throw new Error("Failed to save cart");
        }

        const data = await response.json();

        console.log(
            "Cart saved for user:",
            currentUser.id,
            data
        );

    } catch (error) {

        console.error(
            "Error saving cart:",
            error
        );
    }
}



function saveRecentlyViewed(){
    try{
        window.recentlyVieweData = recentlyviewed;

    }catch(e){
        console.log("storage not avilable")
    }
}


async function loadUserData() {

    try {

        const savedUser = localStorage.getItem("loggedInUser");

        if (savedUser) {

            currentUser = JSON.parse(savedUser);

            console.log(
                "Logged-in user restored:",
                currentUser
            );

        } else {

            currentUser = {
                id: null,
                name: "",
                email: "",
                phone: "",
                address: ""
            };

            console.log("No logged-in user");
        }

    } catch (error) {

        console.error(
            "Error loading logged-in user:",
            error
        );

        currentUser = {
            id: null,
            name: "",
            email: "",
            phone: "",
            address: ""
        };
    }
}
async function loadCartData() {

    // No logged-in user
    if (!currentUser || !currentUser.id) {
        cart = [];
        updateCartCount();

        console.log("No logged-in user. Cart not loaded.");
        return;
    }

    try {
        const response = await fetch(
            `${API}/api/cart?userId=${currentUser.id}`
        );

        if (!response.ok) {
            throw new Error("Failed to load cart");
        }

        cart = await response.json();

        updateCartCount();

        console.log(
            `Cart loaded for user ${currentUser.id}:`,
            cart
        );

    } catch (error) {
        console.error("Error loading cart:", error);
    }
}


async function loadOrderData() {

    // If nobody is logged in, show no orders
    if (!currentUser || !currentUser.id) {
        order = [];
        console.log("No logged-in user. Orders not loaded.");
        return;
    }

    try {
        const response = await fetch(
            `${API}/api/orders/${currentUser.id}`
        );

        if (!response.ok) {
            throw new Error("Failed to load orders");
        }

        order = await response.json();

        console.log(
            `Orders loaded for user ${currentUser.id}:`,
            order
        );

    } catch (error) {
        console.error("Error loading orders:", error);
        order = [];
    }
}




function loadRecentlyViewed() {
  try {
    if (window.recentlyViewedData) {
      recentlyviewed = window.recentlyViewedData;
    }
  } catch (e) {
    console.log("Storage not available.");
  }
}



function showLogin() {
    document.getElementById("registerSection").classList.add("hidden");
    document.getElementById("loginSection").classList.remove("hidden");
}


function showRegister() {
    document.getElementById("loginSection").classList.add("hidden");
    document.getElementById("registerSection").classList.remove("hidden");
}


async function registerUser() {

    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;
    const phone = document.getElementById("registerPhone").value.trim();
    const address = document.getElementById("registerAddress").value.trim();

    if (!name || !email || !password) {
        alert("Name, email and password are required.");
        return;
    }

    if (phone && !validatePhone(phone)) {
        alert("Please enter a valid 10-digit phone number.");
        return;
    }

    try {

        const response = await fetch(
            `${API}/api/register`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    name: name,
                    email: email,
                    password: password,
                    phone: phone,
                    address: address
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || "Registration failed");
            return;
        }

        alert("Registration successful!");

        console.log("Registered user:", data);

        showLogin();

    } catch (error) {

        console.error("Registration error:", error);

        alert("Could not register account");
    }
}





async function loginUser() {

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    if (!email || !password) {
        alert("Please enter your email and password.");
        return;
    }

    try {
        const response = await fetch(`${API}/api/login`, {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || "Login failed");
            return;
        }

        // Save logged-in user in frontend
        currentUser = data.user;

        // Remember logged-in user after refresh
        localStorage.setItem(
            "loggedInUser",
            JSON.stringify(data.user)
        );

        updateAccountPage();

        // Fill Personal Information form
        document.getElementById("userName").value =
            currentUser.name || "";

        document.getElementById("userEmail").value =
            currentUser.email || "";

        document.getElementById("userPhone").value =
            currentUser.phone || "";

        document.getElementById("userAddress").value =
            currentUser.address || "";

        alert("Login successful!");

        console.log("Logged in user:", currentUser);

    } catch (error) {
        console.error("Login error:", error);
        alert("Could not login");
    }
}





function updateAccountPage() {

    const registerSection = document.getElementById("registerSection");
    const loginSection = document.getElementById("loginSection");
    const profileSection = document.getElementById("profileSection");

    if (currentUser && currentUser.id) {

        // User is logged in
        registerSection.classList.add("hidden");
        loginSection.classList.add("hidden");
        profileSection.classList.remove("hidden");

        // Show logged-in user's information
        document.getElementById("userName").value = currentUser.name || "";
        document.getElementById("userEmail").value = currentUser.email || "";
        document.getElementById("userPhone").value = currentUser.phone || "";
        document.getElementById("userAddress").value = currentUser.address || "";

    } else {

        // User is NOT logged in
        profileSection.classList.add("hidden");
        loginSection.classList.add("hidden");
        registerSection.classList.remove("hidden");
    }
}

function logoutUser() {

    // Remove logged-in user
    localStorage.removeItem("loggedInUser");

    // Reset current user
    currentUser = {
        id: null,
        name: "",
        email: "",
        phone: "",
        address: ""
    };

    // Clear frontend cart and orders
    cart = [];
    order = [];

    updateCartCount();

    // Change Account page back to Register/Login
    updateAccountPage();

    alert("Logged out successfully!");

    showpage("home");
}







