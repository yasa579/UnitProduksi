// admin.js - Logic untuk Penjual/Admin
import { 
    db, 
    collection, 
    addDoc, 
    getDocs, 
    deleteDoc, 
    doc, 
    orderBy, 
    serverTimestamp, 
    query,
    updateDoc,
    onSnapshot
} from './firebase-config.js';

// Elemen DOM
const addProductBtn = document.getElementById('addProductBtn');
const viewOrdersBtn = document.getElementById('viewOrdersBtn');
const ordersCount = document.getElementById('ordersCount');
const productModal = document.getElementById('productModal');
const ordersModal = document.getElementById('ordersModal');
const closeModal = document.querySelector('.close');
const closeOrders = document.querySelector('.close-orders');
const productForm = document.getElementById('productForm');
const productsContainer = document.getElementById('productsContainer');
const ordersList = document.getElementById('ordersList');
const notification = document.getElementById('notification');
const notificationMessage = document.getElementById('notificationMessage');
const notificationSound = document.getElementById('notificationSound');

// Stats elements
const totalProducts = document.getElementById('totalProducts');
const totalOrders = document.getElementById('totalOrders');
const outOfStockProducts = document.getElementById('outOfStockProducts');

// State
let editingProductId = null;
let orders = [];
let allProducts = []; // Menyimpan semua produk untuk edit

// Event Listeners
addProductBtn.addEventListener('click', () => {
    editingProductId = null;
    document.getElementById('modalTitle').textContent = 'Tambah Produk Baru';
    document.getElementById('submitBtn').textContent = 'Simpan Produk';
    document.getElementById('productId').value = '';
    productForm.reset();
    productModal.style.display = 'block';
});

viewOrdersBtn.addEventListener('click', () => {
    showOrders();
});

closeModal.addEventListener('click', () => {
    productModal.style.display = 'none';
});

closeOrders.addEventListener('click', () => {
    ordersModal.style.display = 'none';
});

document.getElementById('cancelBtn').addEventListener('click', () => {
    productModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === productModal) {
        productModal.style.display = 'none';
    }
    if (e.target === ordersModal) {
        ordersModal.style.display = 'none';
    }
});

// Submit form produk
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const productData = {
        name: document.getElementById('productName').value,
        description: document.getElementById('productDescription').value,
        price: parseFloat(document.getElementById('productPrice').value),
        stock: parseInt(document.getElementById('productStock').value),
        image: document.getElementById('productImage').value,
        updatedAt: serverTimestamp()
    };

    // Jika edit, jangan ubah createdAt. Jika baru, tambahkan createdAt
    if (!editingProductId) {
        productData.createdAt = serverTimestamp();
    }

    try {
        if (editingProductId) {
            // Edit produk
            await updateDoc(doc(db, "products", editingProductId), productData);
            showNotification('✅ Produk berhasil diupdate!');
        } else {
            // Tambah produk baru
            await addDoc(collection(db, "products"), productData);
            showNotification('✅ Produk berhasil ditambahkan!');
        }
        
        productForm.reset();
        productModal.style.display = 'none';
        editingProductId = null;
    } catch (error) {
        console.error('Error saving product: ', error);
        showNotification('❌ Error menyimpan produk: ' + error.message, true);
    }
});

// Load produk dari Firestore
async function loadProducts() {
    try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        productsContainer.innerHTML = '';
        allProducts = []; // Reset array produk
        let productCount = 0;
        let outOfStockCount = 0;
        
        querySnapshot.forEach((doc) => {
            const product = doc.data();
            const productId = doc.id;
            productCount++;
            
            // Simpan produk ke array untuk edit
            allProducts.push({ id: productId, ...product });
            
            if (product.stock === 0) {
                outOfStockCount++;
            }
            
            const productCard = createAdminProductCard(productId, product);
            productsContainer.appendChild(productCard);
        });

        // Update stats
        totalProducts.textContent = productCount;
        outOfStockProducts.textContent = outOfStockCount;

        if (querySnapshot.empty) {
            productsContainer.innerHTML = `
                <div class="empty-state">
                    <p>📦 Belum ada produk. Tambahkan produk pertama Anda!</p>
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

// Create product card untuk admin
function createAdminProductCard(productId, product) {
    const productCard = document.createElement('div');
    productCard.className = `product-card ${product.stock === 0 ? 'out-of-stock' : ''}`;
    productCard.innerHTML = `
        <img src="${product.image}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/300x200?text=Gambar+Tidak+Tersedia'">
        <h3>${product.name}</h3>
        <p class="description">${product.description}</p>
        <p class="price">💰 Rp ${product.price?.toLocaleString('id-ID') || '0'}</p>
        <p class="stock ${product.stock < 10 ? 'low-stock' : ''}">📦 Stok: ${product.stock}</p>
        <p class="created-at">📅 ${product.createdAt ? new Date(product.createdAt.seconds * 1000).toLocaleDateString('id-ID') : 'Baru saja'}</p>
        <div class="admin-actions">
            <button class="edit-btn" onclick="editProduct('${productId}')">✏️ Edit</button>
            <button class="delete-btn" onclick="deleteProduct('${productId}')">🗑️ Hapus</button>
        </div>
    `;
    
    return productCard;
}

// Edit produk
window.editProduct = async function(productId) {
    editingProductId = productId;
    
    try {
        // Cari produk dari array allProducts
        const product = allProducts.find(p => p.id === productId);
        
        if (product) {
            document.getElementById('modalTitle').textContent = 'Edit Produk';
            document.getElementById('submitBtn').textContent = 'Update Produk';
            document.getElementById('productId').value = productId;
            document.getElementById('productName').value = product.name;
            document.getElementById('productDescription').value = product.description;
            document.getElementById('productPrice').value = product.price;
            document.getElementById('productStock').value = product.stock;
            document.getElementById('productImage').value = product.image;
            
            productModal.style.display = 'block';
        } else {
            showNotification('❌ Produk tidak ditemukan', true);
        }
    } catch (error) {
        console.error('Error loading product for edit: ', error);
        showNotification('❌ Error memuat data produk', true);
    }
}

// Hapus produk
window.deleteProduct = async function(productId) {
    if (confirm('Apakah Anda yakin ingin menghapus produk ini?')) {
        try {
            await deleteDoc(doc(db, "products", productId));
            showNotification('✅ Produk berhasil dihapus!');
            // Products akan otomatis reload via real-time listener
        } catch (error) {
            console.error('Error deleting product: ', error);
            showNotification('❌ Error menghapus produk: ' + error.message, true);
        }
    }
}

// Load dan monitor pesanan
function loadOrders() {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    
    // Simpan waktu load pertama sebagai referensi
    const loadTime = Date.now();
    
    onSnapshot(q, (snapshot) => {
        orders = [];
        let hasNewOrder = false;
        
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const orderData = change.doc.data();
                const orderTime = orderData.createdAt ? 
                    new Date(orderData.createdAt.seconds * 1000) : 
                    new Date();
                
                // Hanya anggap sebagai pesanan baru jika dibuat setelah halaman dimuat
                if (orderTime.getTime() > loadTime - 2000) { // Buffer 2 detik
                    hasNewOrder = true;
                }
            }
        });

        snapshot.forEach((doc) => {
            orders.push({ id: doc.id, ...doc.data() });
        });
        
        updateOrdersCount();
        totalOrders.textContent = orders.length;
        
        // Play sound jika ada pesanan baru
        if (hasNewOrder) {
            playNotificationSound();
            showNotification('🆕 Ada pesanan baru!');
        }
    });
}

// Show orders modal
function showOrders() {
    ordersList.innerHTML = '';
    
    if (orders.length === 0) {
        ordersList.innerHTML = '<div class="empty-cart">📋 Belum ada pesanan</div>';
    } else {
        orders.forEach((order) => {
            const orderElement = document.createElement('div');
            orderElement.className = 'cart-item';
            orderElement.innerHTML = `
                <div class="cart-item-info">
                    <div class="cart-item-name">${order.productName}</div>
                    <div class="cart-item-price">📦 Jumlah: ${order.quantity}</div>
                    <div class="cart-item-total">💵 Total: Rp ${order.totalPrice?.toLocaleString('id-ID') || '0'}</div>
                    <div class="order-status ${order.status}">📊 Status: ${order.status}</div>
                    <div class="order-time">🕒 ${order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString('id-ID') : ''}</div>
                </div>
                <div class="order-actions">
                    ${order.status === 'pending' ? 
                        `<button class="complete-order-btn" onclick="completeOrder('${order.id}')">✅ Selesai</button>` : 
                        '<span class="completed-badge">✅ Selesai</span>'
                    }
                </div>
            `;
            ordersList.appendChild(orderElement);
        });
    }
    
    ordersModal.style.display = 'block';
}

// Complete order
window.completeOrder = async function(orderId) {
    try {
        await updateDoc(doc(db, "orders", orderId), {
            status: 'completed',
            completedAt: serverTimestamp()
        });
        showNotification('✅ Pesanan telah diselesaikan!');
    } catch (error) {
        console.error('Error completing order: ', error);
        showNotification('❌ Error menyelesaikan pesanan: ' + error.message, true);
    }
}

// Update orders count
function updateOrdersCount() {
    const pendingOrders = orders.filter(order => order.status === 'pending').length;
    ordersCount.textContent = pendingOrders;
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
    if (notificationSound) {
        notificationSound.currentTime = 0;
        notificationSound.play().catch(e => console.log('Audio play failed:', e));
    }
}

// Real-time listener untuk produk
function setupProductsListener() {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    
    onSnapshot(q, (snapshot) => {
        loadProducts(); // Reload products ketika ada perubahan
    });
}

// Test koneksi Firebase
async function testFirebaseConnection() {
    try {
        const testDoc = await addDoc(collection(db, "test"), {
            test: "connection",
            timestamp: serverTimestamp()
        });
        console.log("✅ Firebase connected successfully");
        await deleteDoc(doc(db, "test", testDoc.id));
    } catch (error) {
        console.error("❌ Firebase connection failed:", error);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    loadOrders();
    setupProductsListener();
    // Panggil di DOMContentLoaded
    testFirebaseConnection();
});