// Основные данные приложения
let cart = [];
let currentOrder = null;
let orders = [];
let referrals = [];
let userDiscount = 0;
let isReferralUser = false;

// Обновляем функцию handleReferralParams
function handleReferralParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref');
    
    if (refParam) {
        const currentUserId = generateUserId();
        
        if (refParam !== currentUserId) {
            // Проверяем, не был ли уже применен бонус
            const existingReferral = referrals.find(ref => 
                ref.referredId === currentUserId && ref.referrerId === refParam
            );
            
            if (!existingReferral) {
                // Сохраняем реферала
                const referral = {
                    id: Date.now(),
                    referrerId: refParam,
                    referredId: currentUserId,
                    date: new Date().toISOString(),
                    bonusApplied: false
                };
                
                referrals.push(referral);
                
                // Даем скидку новому пользователю
                isReferralUser = true;
                userDiscount = 10; // 10% скидка
                
                // Начисляем бонус рефереру
                applyReferrerBonus(refParam);
                
                saveToStorage();
                
                showNotification('🎉 Вы перешли по реферальной ссылке! Получите скидку 10% на первый заказ!');
            }
        }
    }
}

// Функция для начисления бонуса рефереру
function applyReferrerBonus(referrerId) {
    const referrerReferrals = referrals.filter(ref => ref.referrerId === referrerId);
    
    // Увеличиваем скидку реферера на 5% за каждого приглашенного (максимум 30%)
    const newDiscount = Math.min(10 + referrerReferrals.length * 5, 30);
    
    // Обновляем скидку реферера
    updateUserDiscount(referrerId, newDiscount);
}

function updateUserDiscount(userId, discount) {
    // В реальном приложении здесь бы сохранялось в базу данных
    console.log(`Пользователь ${userId} получает скидку ${discount}%`);
}

// Обновляем функцию расчета итоговой суммы
function calculateTotalPrice() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    if (isReferralUser && userDiscount > 0) {
        const discountAmount = (subtotal * userDiscount) / 100;
        return {
            subtotal: subtotal,
            discount: discountAmount,
            total: subtotal - discountAmount
        };
    }
    
    return {
        subtotal: subtotal,
        discount: 0,
        total: subtotal
    };
}

// Обновляем функцию updateCartUI
function updateCartUI() {
    const cartItems = document.getElementById('cartItems');
    const totalPrice = document.getElementById('totalPrice');
    const cartCount = document.getElementById('cartCount');
    
    if (!cartItems || !totalPrice || !cartCount) return;
    
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    
    cartItems.innerHTML = '';
    
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <div class="empty-cart-icon">🛒</div>
                <p>Ваша корзина пуста</p>
                <button onclick="showScreen('catalog')" class="btn-checkout" style="margin-top: 20px;">
                    🛍️ Перейти к покупкам
                </button>
            </div>
        `;
        totalPrice.textContent = '0₽';
        saveToStorage();
        return;
    }
    
    const prices = calculateTotalPrice();
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <span class="item-price-single">${item.price}₽ × ${item.quantity}</span>
            </div>
            <div class="cart-item-actions">
                <div class="quantity-controls">
                    <button class="quantity-btn" onclick="updateCartQuantity('${item.id}', -1)">-</button>
                    <span class="quantity">${item.quantity}</span>
                    <button class="quantity-btn" onclick="updateCartQuantity('${item.id}', 1)">+</button>
                </div>
                <div class="item-price">${itemTotal}₽</div>
                <button class="btn-remove" onclick="removeFromCart('${item.id}')">
                    🗑️
                </button>
            </div>
        `;
        cartItems.appendChild(cartItem);
    });
    
    // Добавляем блок с информацией о скидке
    if (prices.discount > 0) {
        const discountInfo = document.createElement('div');
        discountInfo.className = 'discount-info';
        discountInfo.innerHTML = `
            <div class="discount-line">
                <span>Скидка ${userDiscount}%:</span>
                <span class="discount-amount">-${prices.discount}₽</span>
            </div>
        `;
        cartItems.appendChild(discountInfo);
    }
    
    totalPrice.textContent = `${prices.total}₽`;
    saveToStorage();
}

// Обновляем функцию createOrder
function createOrder(orderData) {
    const orderId = 'MS' + Date.now().toString().slice(-6);
    const prices = calculateTotalPrice();
    const prepayment = Math.ceil(prices.total * 0.5);
    
    const order = {
        id: orderId,
        ...orderData,
        subtotal: prices.subtotal,
        discount: prices.discount,
        total: prices.total,
        prepayment: prepayment,
        status: 'new',
        date: new Date().toLocaleDateString('ru-RU'),
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        isReferralOrder: isReferralUser,
        userDiscount: userDiscount
    };
    
    orders.push(order);
    currentOrder = order;
    
    // Сбрасываем реферальную скидку после первого заказа
    if (isReferralUser) {
        isReferralUser = false;
        userDiscount = 0;
    }
    
    saveToStorage();
    showPaymentScreen(orderId, prepayment);
    showNotification('✅ Заказ создан! Перейдите к оплате.');
}
// Товары магазина
const products = [
    {
        id: 'shaft',
        name: 'Шахта для кальяна',
        price: 2000,
        description: 'Металлическая шахта с современным дизайном и защитной сеткой. Идеальная тяга и долговечность.',
        image: '🔩',
        colors: ['⚫️ Черный', '🔴 Красный', '🟢 Зеленый', '🔵 Синий', '⚪️ Серебристый'],
        specs: {
            'Материал': 'ABS пластик, Металл',
            'Высота': '24 см',
            'Диаметр': '6.7 см',
            'Вес': '300 г'
        }
    },
    {
        id: 'bowl',
        name: 'Колба для кальяна', 
        price: 1000,
        description: 'Стеклянная колба для полноценного использования. Отличная резьба и устойчивость.',
        image: '🔮',
        specs: {
            'Материал': 'ABS пластик',
            'Высота': '7.5 см'
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
        Telegram.WebApp.setHeaderColor('#2c5530');
        Telegram.WebApp.setBackgroundColor('#0f172a');
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
    showNotification('🎉 Добро пожаловать в MiniShisha!');
}

function rejectAge() {
    showNotification('🚫 Доступ запрещен для лиц младше 18 лет');
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
    console.log('Переход на экран:', screenId);
    
    // Скрываем все экраны
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Убираем активный класс со всех кнопок навигации
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Показываем выбранный экран
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
    
    // Активируем соответствующую кнопку навигации
    const navButton = document.querySelector(`.nav-item[data-screen="${screenId}"]`);
    if (navButton) {
        navButton.classList.add('active');
    }
    
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
    if (!productsList) return;
    
    productsList.innerHTML = '';

    products.forEach((product, index) => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        
        // Бейдж для первого товара
        const badge = index === 0 ? '<div class="product-badge">🔥 Хит продаж</div>' : '';
        
        // Характеристики
        const specsHTML = product.specs ? `
            <div class="product-specs">
                <div class="specs-grid">
                    ${Object.entries(product.specs).map(([key, value]) => `
                        <div class="spec-item">
                            <span>${key}:</span>
                            <span class="spec-value">${value}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : '';
        
        // Цвета
        const colorsHTML = product.colors ? `
            <div class="product-colors">
                ${product.colors.map(color => `
                    <span class="color-tag">${color}</span>
                `).join('')}
            </div>
        ` : '';

        productCard.innerHTML = `
            ${badge}
            <div class="product-header">
                <span class="product-icon">${product.image}</span>
                <h3>${product.name}</h3>
            </div>
            <p class="product-description">${product.description}</p>
            ${specsHTML}
            ${colorsHTML}
            <div class="product-footer">
                <div class="product-price">${product.price}₽</div>
                <button class="btn-add-to-cart" onclick="addToCart('${product.id}')">
                    <span class="btn-icon">➕</span>
                    В корзину
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
    
    if (!cartItems || !totalPrice || !cartCount) return;
    
    // Обновляем счетчик в навигации
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    
    // Очищаем список товаров
    cartItems.innerHTML = '';
    
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <div class="empty-cart-icon">🛒</div>
                <p>Ваша корзина пуста</p>
                <button onclick="showScreen('catalog')" class="btn-checkout" style="margin-top: 20px;">
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
            </div>
            <div class="cart-item-actions">
                <div class="quantity-controls">
                    <button class="quantity-btn" onclick="updateCartQuantity('${item.id}', -1)">-</button>
                    <span class="quantity">${item.quantity}</span>
                    <button class="quantity-btn" onclick="updateCartQuantity('${item.id}', 1)">+</button>
                </div>
                <div class="item-price">${itemTotal}₽</div>
                <button class="btn-remove" onclick="removeFromCart('${item.id}')">
                    🗑️
                </button>
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
    const prepayment = Math.ceil(orderData.total * 0.5);
    
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
    const orderIdElement = document.getElementById('orderId');
    const paymentAmountElement = document.getElementById('paymentAmount');
    
    if (orderIdElement) orderIdElement.textContent = orderId;
    if (paymentAmountElement) paymentAmountElement.textContent = `${amount}₽`;
    
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
        
        showNotification(`🎉 Спасибо! Заказ #${currentOrder.id} принят в обработку. Ожидайте подтверждения!`);
        
        // Очищаем корзину
        cart = [];
        updateCartUI();
        
        // Возвращаем в каталог
        showScreen('catalog');
    } else {
        showNotification('❌ Нет активного заказа для подтверждения');
    }
}

// Управление заказами
function loadOrdersUI() {
    const ordersList = document.getElementById('ordersList');
    if (!ordersList) return;
    
    ordersList.innerHTML = '';
    
    // Для демонстрации показываем все заказы
    const userOrders = orders;

    if (userOrders.length === 0) {
        ordersList.innerHTML = `
            <div class="empty-cart">
                <div class="empty-cart-icon">📋</div>
                <p>У вас пока нет заказов</p>
                <button onclick="showScreen('catalog')" class="btn-checkout" style="margin-top: 20px;">
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
        orderCard.className = 'order-card';
        orderCard.innerHTML = `
            <div class="order-header">
                <div class="order-title">Заказ #${order.id}</div>
                <div class="order-status status-${order.status}">${getStatusText(order.status)}</div>
            </div>
            <div class="order-details">
                <div class="order-detail">
                    <strong>📅 Дата:</strong>
                    <span>${order.date} ${order.time}</span>
                </div>
                <div class="order-detail">
                    <strong>💰 Сумма:</strong>
                    <span>${order.total}₽ (предоплата ${order.prepayment}₽)</span>
                </div>
                <div class="order-detail">
                    <strong>📦 Адрес:</strong>
                    <span>${order.address}</span>
                </div>
                <div class="order-detail">
                    <strong>📱 Контакт:</strong>
                    <span>${order.telegram}</span>
                </div>
                ${order.comment ? `
                <div class="order-detail">
                    <strong>💬 Комментарий:</strong>
                    <span>${order.comment}</span>
                </div>
                ` : ''}
            </div>
            <div class="order-items">
                <strong>🛒 Состав заказа:</strong>
                ${order.cart.map(item => `
                    <div class="order-item">
                        <span>${item.name}</span>
                        <span>${item.quantity}шт. × ${item.price}₽ = ${item.price * item.quantity}₽</span>
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
    const referralLinkElement = document.getElementById('referralLink');
    const referralCountElement = document.getElementById('referralCount');
    const discountPercentElement = document.getElementById('discountPercent');
    
    if (!referralLinkElement || !referralCountElement || !discountPercentElement) return;
    
    const userId = generateUserId();
    const referralLink = `${window.location.origin}${window.location.pathname}?ref=${userId}`;
    
    referralLinkElement.value = referralLink;
    
    // Обновляем статистику
    const userReferrals = referrals.filter(ref => ref.referrerId === userId);
    referralCountElement.textContent = userReferrals.length;
    
    // Рассчитываем скидку
    const discount = Math.min(10 + userReferrals.length * 5, 30);
    discountPercentElement.textContent = `${discount}%`;
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
    if (!linkInput) return;
    
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
        // Создаем красивый toast вместо alert
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--surface);
            color: var(--text-primary);
            padding: 12px 20px;
            border-radius: 10px;
            border: 1px solid var(--border);
            box-shadow: var(--shadow-lg);
            z-index: 1000;
            font-weight: 500;
            max-width: 300px;
            text-align: center;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('Страница загружена, инициализируем приложение...');
    initApp();
});

// Дебаг функции для проверки работы
function debugApp() {
    console.log('Cart:', cart);
    console.log('Orders:', orders);
    console.log('Referrals:', referrals);
    console.log('Current Order:', currentOrder);
}



