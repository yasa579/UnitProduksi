// app.js - Logic untuk Pembeli
import { 
    db, 
    collection, 
    getDocs, 
    doc, 
    orderBy, 
    query,
    updateDoc,
    increment,
    addDoc,
    serverTimestamp
} from './firebase-config.js';

// Elemen DOM
const viewCartBtn = document.getElementById('viewCartBtn');
const cartCount = document.getElementById('cartCount');
const productDetailModal = document.getElementById('productDetailModal');
const cartModal = document.getElementById('cartModal');
const closeDetail = document.querySelector('.close-detail');
const closeCart = document.querySelector('.close-cart');
const productsContainer = document.getElementById('productsContainer');
const productDetailContent = document.getElementById('productDetailContent');
const cartItems = document.getElementById('cartItems');
const cartTotal = document.getElementById('cartTotal');
const checkoutBtn = document.getElementById('checkoutBtn');
const notification = document.getElementById('notification');
const notificationMessage = document.getElementById('notificationMessage');
const notificationSound = document.getElementById('notificationSound');

// State
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let selectedProduct = null;

// Initialize
updateCartCount();

// Event Listeners
viewCartBtn.addEventListener('click', () => {
    showCart();
});

closeDetail.addEventListener('click', () => {
    productDetailModal.style.display = 'none';
});

closeCart.addEventListener('click', () => {
    cartModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === productDetailModal) {
        productDetailModal.style.display = 'none';
    }
    if (e.target === cartModal) {
        cartModal.style.display = 'none';
    }
});

// Load produk dari Firestore (hanya yang ada stok)
async function loadProducts() {
    try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        productsContainer.innerHTML = '';
        
        querySnapshot.forEach((doc) => {
            const product = doc.data();
            const productId = doc.id;
            
            // Hanya tampilkan produk yang ada stok
            if (product.stock > 0) {
                const productCard = createProductCard(productId, product);
                productsContainer.appendChild(productCard);
            }
        });

        if (productsContainer.innerHTML === '') {
            productsContainer.innerHTML = `
                <div class="empty-state">
                    <p>😔 Belum ada produk yang tersedia.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading products: ', error);
        productsContainer.innerHTML = `
            <div class="error-state">
                <p>❌ Error memuat produk: ${error.message}</p>
            </div>
        `;
    }
}

// Create product card untuk pembeli
function createProductCard(productId, product) {
    const productCard = document.createElement('div');
    productCard.className = `product-card ${product.stock === 0 ? 'out-of-stock' : ''}`;
    productCard.innerHTML = `
        <img src="${product.image}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/300x200?text=Gambar+Tidak+Tersedia'">
        <h3>${product.name}</h3>
        <p class="description">${product.description}</p>
        <p class="price">💰 Rp ${product.price?.toLocaleString('id-ID') || '0'}</p>
        <p class="stock ${product.stock < 10 ? 'low-stock' : ''}">📦 Stok: ${product.stock}</p>
        ${product.stock > 0 ? '<button class="view-detail-btn">👀 Lihat Detail</button>' : ''}
    `;
    
    // Add click event untuk detail produk
    if (product.stock > 0) {
        const viewDetailBtn = productCard.querySelector('.view-detail-btn');
        viewDetailBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showProductDetail(productId, product);
        });
    }
    
    return productCard;
}

// Show product detail modal
window.showProductDetail = async function(productId, product) {
    selectedProduct = { id: productId, ...product };
    
    productDetailContent.innerHTML = `
        <div class="product-detail">
            <img src="${product.image}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/300x200?text=Gambar+Tidak+Tersedia'">
            <h2>${product.name}</h2>
            <p class="description">${product.description}</p>
            <p class="price">💰 Rp ${product.price?.toLocaleString('id-ID') || '0'}</p>
            <p class="stock ${product.stock < 10 ? 'low-stock' : ''}">📦 Stok: ${product.stock}</p>
            
            <div class="quantity-controls">
                <button class="quantity-btn" onclick="changeQuantity(-1)">-</button>
                <span class="quantity-display" id="quantityDisplay">1</span>
                <button class="quantity-btn" onclick="changeQuantity(1)">+</button>
            </div>
            
            <div class="action-buttons">
                <button class="add-to-cart-btn" onclick="addToCart()">🛒 Tambah ke Keranjang</button>
                <button class="buy-now-btn" onclick="buyNow()">⚡ Beli Sekarang</button>
            </div>
        </div>
    `;
    
    productDetailModal.style.display = 'block';
}

// Change quantity
window.changeQuantity = function(change) {
    const quantityDisplay = document.getElementById('quantityDisplay');
    let quantity = parseInt(quantityDisplay.textContent);
    quantity += change;
    
    if (quantity < 1) quantity = 1;
    if (quantity > selectedProduct.stock) quantity = selectedProduct.stock;
    
    quantityDisplay.textContent = quantity;
}

// Add to cart
window.addToCart = function() {
    const quantity = parseInt(document.getElementById('quantityDisplay').textContent);
    addToCartFunction(quantity);
    productDetailModal.style.display = 'none';
    showNotification('✅ Produk ditambahkan ke keranjang!');
}

// Buy now
window.buyNow = async function() {
    const quantity = parseInt(document.getElementById('quantityDisplay').textContent);
    
    try {
        // Update stock di Firestore
        await updateDoc(doc(db, "products", selectedProduct.id), {
            stock: increment(-quantity)
        });

        // Buat pesanan
        await addDoc(collection(db, "orders"), {
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            quantity: quantity,
            totalPrice: selectedProduct.price * quantity,
            status: 'pending',
            createdAt: serverTimestamp()
        });
        
        // Kirim notifikasi
        showNotification(`✅ Pembelian berhasil! ${quantity} ${selectedProduct.name} telah dibeli.`);
        playNotificationSound();
        
        // Reset dan reload
        productDetailModal.style.display = 'none';
        await loadProducts();
        
    } catch (error) {
        console.error('Error processing purchase: ', error);
        showNotification('❌ Error memproses pembelian: ' + error.message, true);
    }
}

// Add to cart function
function addToCartFunction(quantity) {
    const existingItem = cart.find(item => item.id === selectedProduct.id);
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            id: selectedProduct.id,
            name: selectedProduct.name,
            price: selectedProduct.price,
            image: selectedProduct.image,
            quantity: quantity
        });
    }
    
    saveCart();
}

// Show cart
function showCart() {
    cartItems.innerHTML = '';
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<div class="empty-cart">🛒 Keranjang belanja kosong</div>';
        cartTotal.textContent = '0';
        checkoutBtn.disabled = true;
    } else {
        let total = 0;
        
        cart.forEach((item, index) => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            
            const cartItemElement = document.createElement('div');
            cartItemElement.className = 'cart-item';
            cartItemElement.innerHTML = `
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">💰 Rp ${item.price.toLocaleString('id-ID')} x ${item.quantity}</div>
                    <div class="cart-item-total">💵 Total: Rp ${itemTotal.toLocaleString('id-ID')}</div>
                </div>
                <button class="remove-from-cart" onclick="removeFromCart(${index})">🗑️</button>
            `;
            
            cartItems.appendChild(cartItemElement);
        });
        
        cartTotal.textContent = total.toLocaleString('id-ID');
        checkoutBtn.disabled = false;
    }
    
    cartModal.style.display = 'block';
}

// Remove from cart
window.removeFromCart = function(index) {
    cart.splice(index, 1);
    saveCart();
    showCart();
    showNotification('🗑️ Produk dihapus dari keranjang');
}

// Checkout
checkoutBtn.addEventListener('click', async () => {
    if (cart.length === 0) return;
    
    try {
        // Process each item in cart
        for (const item of cart) {
            // Update stock di Firestore
            await updateDoc(doc(db, "products", item.id), {
                stock: increment(-item.quantity)
            });

            // Buat pesanan untuk setiap item
            await addDoc(collection(db, "orders"), {
                productId: item.id,
                productName: item.name,
                quantity: item.quantity,
                totalPrice: item.price * item.quantity,
                status: 'pending',
                createdAt: serverTimestamp()
            });
        }
        
        // Kirim notifikasi
        showNotification(`✅ Checkout berhasil! ${cart.length} produk telah dibeli.`);
        playNotificationSound();
        
        // Kosongkan keranjang
        cart = [];
        saveCart();
        updateCartCount();
        cartModal.style.display = 'none';
        
        // Reload products untuk update stok
        await loadProducts();
        
    } catch (error) {
        console.error('Error during checkout: ', error);
        showNotification('❌ Error selama checkout: ' + error.message, true);
    }
});

// Save cart to localStorage
function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
}

// Update cart count
function updateCartCount() {
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
    cartCount.textContent = totalItems;
}

// Show notification
function showNotification(message, isError = false) {
    notificationMessage.textContent = message;
    notification.className = `notification ${isError ? 'error' : ''}`;
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// Play notification sound
function playNotificationSound() {
    notificationSound.currentTime = 0;
    notificationSound.play().catch(e => console.log('Audio play failed:', e));
}

// Load produk saat pertama kali
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
});