// Основные данные приложения
let cart = [];
let currentOrder = null;
let orders = [];
let referrals = [];

// Товары магазина
// Товары магазина - ТОЛЬКО КОЛБА И ШАХТА
const products = [
    {
        id: 'shaft',
        name: '🔩 Шахта для кальяна',
        price: 2000,
        description: 'Металлическая шахта с современным дизайном и защитной сеткой. Идеальная тяга и долговечность.',
        image: '🔩',
        colors: ['⚫️ Черный', '🔴 Красный', '🟢 Зеленый', '🔵 Синий', '⚪️ Серебристый'],
        specs: {
            material: 'Нержавеющая сталь',
            height: '65 см',
            diameter: '6.5 см',
            weight: '850 г'
        }
    },
    {
        id: 'bowl',
        name: '🔮 Колба для кальяна', 
        price: 1000,
        description: 'Стеклянная колба премиум-класса для максимального комфорта использования. Отличная прозрачность и устойчивость.',
        image: '🔮',
        colors: ['🔵 Синяя', '🟢 Зеленая', '🔴 Красная', '⚫️ Черная'],
        specs: {
            material: 'Закаленное стекло',
            volume: '800 мл',
            height: '22 см'
        }
    }
];

// Инициализация приложения
function initApp() {
    loadFromStorage();
    setupEventListeners();
    
    // Инициализация Telegram Web App
    if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
        Telegram.WebApp.ready();
        Telegram.WebApp.expand();
    }
    
    // Проверка возраста
    if (isAgeConfirmed()) {
        showMainApp();
    }
    
    // Обработка реферальных ссылок
    handleReferralParams();
    
    // Загрузка товаров
    loadProducts();
    updateCartUI();
}

// Работа с localStorage
function saveToStorage() {
    localStorage.setItem('minishisha_cart', JSON.stringify(cart));
    localStorage.setItem('minishisha_orders', JSON.stringify(orders));
    localStorage.setItem('minishisha_referrals', JSON.stringify(referrals));
}

function loadFromStorage() {
    try {
        cart = JSON.parse(localStorage.getItem('minishisha_cart') || '[]');
        orders = JSON.parse(localStorage.getItem('minishisha_orders') || '[]');
        referrals = JSON.parse(localStorage.getItem('minishisha_referrals') || '[]');
    } catch (e) {
        console.error('Ошибка загрузки данных:', e);
        cart = [];
        orders = [];
        referrals = [];
    }
}

// Проверка возраста
function isAgeConfirmed() {
    return localStorage.getItem('minishisha_ageConfirmed') === 'true';
}

function confirmAge() {
    localStorage.setItem('minishisha_ageConfirmed', 'true');
    showMainApp();
    showNotification('✅ Добро пожаловать в MiniShisha!');
}

function rejectAge() {
    showNotification('❌ Доступ запрещен для лиц младше 18 лет');
    if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
        setTimeout(() => Telegram.WebApp.close(), 2000);
    }
}

function showMainApp() {
    document.getElementById('ageWarning').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
}

// Навигация
function showScreen(screenId) {
    // Скрываем все экраны
    document.querySelectorAll('.screen-content').forEach(screen => {
        screen.classList.add('hidden');
    });
    
    // Показываем выбранный экран
    document.getElementById(screenId).classList.remove('hidden');
    
    // Обновляем данные для конкретных экранов
    switch(screenId) {
        case 'cart':
            updateCartUI();
            break;
        case 'orders':
            loadOrdersUI();
            break;
        case 'referral':
            loadReferralUI();
            break;
    }
}

// Загрузка товаров
function loadProducts() {
    const productsList = document.getElementById('productsList');
    productsList.innerHTML = '';

    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <div class="product-header">
                <span class="product-icon">${product.image}</span>
                <h3>${product.name}</h3>
            </div>
            <p>${product.description}</p>
            ${product.colors ? `<p><small>🎨 ${product.colors.join(', ')}</small></p>` : ''}
            ${product.flavors ? `<p><small>🍃 Вкусы: ${product.flavors.join(', ')}</small></p>` : ''}
            <div class="product-footer">
                <div class="product-price">${product.price}₽</div>
                <button class="btn-secondary" onclick="addToCart('${product.id}')">
                    ➕ В корзину
                </button>
            </div>
        `;
        productsList.appendChild(productCard);
    });
}

// Работа с корзиной
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            ...product,
            quantity: 1,
            addedAt: new Date().toISOString()
        });
    }
    
    updateCartUI();
    showNotification(`✅ "${product.name}" добавлен в корзину!`);
    showScreen('cart');
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartUI();
    showNotification('🗑️ Товар удален из корзины');
}

function updateCartQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            updateCartUI();
        }
    }
}

function updateCartUI() {
    const cartItems = document.getElementById('cartItems');
    const totalPrice = document.getElementById('totalPrice');
    const cartCount = document.getElementById('cartCount');
    
    // Обновляем счетчик в навигации
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    
    // Очищаем список товаров
    cartItems.innerHTML = '';
    
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <div style="font-size: 48px; margin-bottom: 15px;">🛒</div>
                <p>Ваша корзина пуста</p>
                <button onclick="showScreen('catalog')" class="btn-primary" style="margin-top: 15px;">
                    🛍️ Перейти к покупкам
                </button>
            </div>
        `;
        totalPrice.textContent = '0₽';
        saveToStorage();
        return;
    }
    
    // Отображаем товары в корзине
    let total = 0;
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <div class="cart-item-actions">
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="updateCartQuantity('${item.id}', -1)">-</button>
                        <span class="quantity">${item.quantity} шт.</span>
                        <button class="quantity-btn" onclick="updateCartQuantity('${item.id}', 1)">+</button>
                    </div>
                    <div class="item-price">${itemTotal}₽</div>
                    <button class="btn-secondary" onclick="removeFromCart('${item.id}')" 
                            style="background: var(--danger-color);">
                        🗑️ Удалить
                    </button>
                </div>
            </div>
        `;
        cartItems.appendChild(cartItem);
    });
    
    totalPrice.textContent = `${total}₽`;
    saveToStorage();
}

// Оформление заказа
function checkout() {
    if (cart.length === 0) {
        showNotification('❌ Корзина пуста!');
        return;
    }
    
    showScreen('checkout');
}

// Обработка формы заказа
function setupEventListeners() {
    const orderForm = document.getElementById('orderForm');
    if (orderForm) {
        orderForm.addEventListener('submit', function(e) {
            e.preventDefault();
            processOrderForm(this);
        });
    }
}

function processOrderForm(form) {
    const formData = new FormData(form);
    const orderData = {
        name: formData.get('name').trim(),
        telegram: formData.get('telegram').trim(),
        phone: formData.get('phone').trim(),
        address: formData.get('address').trim(),
        comment: formData.get('comment').trim(),
        cart: [...cart],
        total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        timestamp: Date.now()
    };
    
    // Валидация
    if (!orderData.name || !orderData.telegram || !orderData.phone || !orderData.address) {
        showNotification('❌ Заполните все обязательные поля!');
        return;
    }
    
    if (!orderData.telegram.startsWith('@')) {
        orderData.telegram = '@' + orderData.telegram;
    }
    
    createOrder(orderData);
}

function createOrder(orderData) {
    const orderId = 'MS' + Date.now().toString().slice(-6);
    const prepayment = Math.ceil(orderData.total * 0.5); // 50% предоплата
    
    const order = {
        id: orderId,
        ...orderData,
        prepayment: prepayment,
        status: 'new',
        date: new Date().toLocaleDateString('ru-RU'),
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    };
    
    orders.push(order);
    currentOrder = order;
    
    saveToStorage();
    showPaymentScreen(orderId, prepayment);
    showNotification('✅ Заказ создан! Перейдите к оплате.');
}

function showPaymentScreen(orderId, amount) {
    document.getElementById('orderId').textContent = orderId;
    document.getElementById('paymentAmount').textContent = `${amount}₽`;
    showScreen('payment');
}

function confirmPayment() {
    if (currentOrder) {
        // Обновляем статус заказа
        const order = orders.find(o => o.id === currentOrder.id);
        if (order) {
            order.status = 'paid';
            saveToStorage();
        }
        
        showNotification(`✅ Спасибо! Заказ #${currentOrder.id} принят в обработку. Ожидайте подтверждения!`);
        
        // Очищаем корзину
        cart = [];
        updateCartUI();
        
        // Возвращаем в каталог
        showScreen('catalog');
    }
}

// Управление заказами
function loadOrdersUI() {
    const ordersList = document.getElementById('ordersList');
    ordersList.innerHTML = '';
    
    const userOrders = orders.filter(order => 
        order.telegram && currentOrder && order.telegram === currentOrder.telegram
    );
    
    if (userOrders.length === 0) {
        ordersList.innerHTML = `
            <div class="empty-cart">
                <div style="font-size: 48px; margin-bottom: 15px;">📋</div>
                <p>У вас пока нет заказов</p>
                <button onclick="showScreen('catalog')" class="btn-primary" style="margin-top: 15px;">
                    🛍️ Сделать первый заказ
                </button>
            </div>
        `;
        return;
    }
    
    // Сортируем заказы по дате (новые first)
    userOrders.sort((a, b) => b.timestamp - a.timestamp);
    
    userOrders.forEach(order => {
        const orderCard = document.createElement('div');
        orderCard.className = `order-card ${order.status}`;
        orderCard.innerHTML = `
            <h4>
                Заказ #${order.id}
                <span class="order-status status-${order.status}">${getStatusText(order.status)}</span>
            </h4>
            <p><strong>📅 Дата:</strong> ${order.date} в ${order.time}</p>
            <p><strong>💰 Сумма:</strong> ${order.total}₽ (предоплата ${order.prepayment}₽)</p>
            <p><strong>📦 Адрес:</strong> ${order.address}</p>
            <p><strong>📱 Контакт:</strong> ${order.telegram}</p>
            ${order.comment ? `<p><strong>💬 Комментарий:</strong> ${order.comment}</p>` : ''}
            <div class="order-items">
                <strong>🛒 Состав заказа:</strong>
                ${order.cart.map(item => `
                    <div style="margin: 5px 0; padding-left: 10px;">
                        ${item.name} - ${item.quantity}шт. × ${item.price}₽ = ${item.price * item.quantity}₽
                    </div>
                `).join('')}
            </div>
        `;
        ordersList.appendChild(orderCard);
    });
}

function getStatusText(status) {
    const statusMap = {
        'new': '🆕 Ожидает оплаты',
        'paid': '💳 Оплачен',
        'completed': '✅ Завершен',
        'cancelled': '❌ Отменен'
    };
    return statusMap[status] || status;
}

// Реферальная система
function loadReferralUI() {
    const userId = generateUserId();
    const referralLink = `${window.location.origin}${window.location.pathname}?ref=${userId}`;
    
    document.getElementById('referralLink').value = referralLink;
    
    // Обновляем статистику
    const userReferrals = referrals.filter(ref => ref.referrerId === userId);
    document.getElementById('referralCount').textContent = userReferrals.length;
    
    // Рассчитываем скидку
    const discount = Math.min(10 + userReferrals.length * 5, 30);
    document.getElementById('discountPercent').textContent = `${discount}%`;
}

function generateUserId() {
    let userId = localStorage.getItem('minishisha_userId');
    if (!userId) {
        userId = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('minishisha_userId', userId);
    }
    return userId;
}

function copyReferralLink() {
    const linkInput = document.getElementById('referralLink');
    linkInput.select();
    linkInput.setSelectionRange(0, 99999);
    
    navigator.clipboard.writeText(linkInput.value).then(() => {
        showNotification('✅ Ссылка скопирована! Делитесь с друзьями!');
    }).catch(() => {
        // Fallback для старых браузеров
        linkInput.select();
        document.execCommand('copy');
        showNotification('✅ Ссылка скопирована!');
    });
}

function handleReferralParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref');
    
    if (refParam) {
        const currentUserId = generateUserId();
        
        if (refParam !== currentUserId) {
            // Сохраняем реферала
            const referral = {
                id: Date.now(),
                referrerId: refParam,
                referredId: currentUserId,
                date: new Date().toISOString(),
                bonusApplied: false
            };
            
            referrals.push(referral);
            saveToStorage();
            
            showNotification('🎉 Вы перешли по реферальной ссылке! Получите скидку 10% на первый заказ!');
        }
    }
}

// Вспомогательные функции
function showNotification(message) {
    if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
        Telegram.WebApp.showAlert(message);
    } else {
        alert(message);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initApp();

});
