// Основные данные приложения
let cart = [];
let currentOrder = null;
let orders = [];
let referrals = [];
let userDiscount = 0;
let isReferralUser = false;
let userId = '';

// Настройки бота
const BOT_CONFIG = {
    token: '8490335749:AAEKfRAaNKbnGNuEIN2M4rNVGb_BwH07nXk',
    adminChatId: '922569313',
    managerUsername: '@minishishaaa'
};

// Товары магазина
const products = [
    {
        id: 'shaft',
        name: 'Шахта для кальяна',
        price: 2000,
        description: 'Металлическая шахта с современным дизайном и защитной сеткой. Идеальная тяга и долговечность.',
        image: 'images/black.jpg',
        fallbackIcon: '🔩',
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
        image: 'images/kolb.jpg',
        fallbackIcon: '🔮',
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
    loadReferralUI();
    
    // Восстанавливаем текущий заказ если он есть
    if (orders.length > 0) {
        currentOrder = orders[orders.length - 1];
    }
}

// Работа с localStorage
function saveToStorage() {
    localStorage.setItem('minishisha_cart', JSON.stringify(cart));
    localStorage.setItem('minishisha_orders', JSON.stringify(orders));
    localStorage.setItem('minishisha_referrals', JSON.stringify(referrals));
    localStorage.setItem('minishisha_userDiscount', userDiscount.toString());
    localStorage.setItem('minishisha_isReferralUser', isReferralUser.toString());
    localStorage.setItem('minishisha_userId', userId);
}

function loadFromStorage() {
    try {
        cart = JSON.parse(localStorage.getItem('minishisha_cart') || '[]');
        orders = JSON.parse(localStorage.getItem('minishisha_orders') || '[]');
        referrals = JSON.parse(localStorage.getItem('minishisha_referrals') || '[]');
        userDiscount = parseInt(localStorage.getItem('minishisha_userDiscount') || '0');
        isReferralUser = localStorage.getItem('minishisha_isReferralUser') === 'true';
        userId = localStorage.getItem('minishisha_userId') || generateUserId();
    } catch (e) {
        console.error('Ошибка загрузки данных:', e);
        cart = [];
        orders = [];
        referrals = [];
        userDiscount = 0;
        isReferralUser = false;
        userId = generateUserId();
    }
}

// Генерация ID пользователя
function generateUserId() {
    return 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
}

// Проверка возраста
function isAgeConfirmed() {
    return localStorage.getItem('minishisha_ageConfirmed') === 'true';
}

function confirmAge() {
    localStorage.setItem('minishisha_ageConfirmed', 'true');
    showMainApp();
    showNotification('🎉 Добро пожаловать в MiniShisha!', 'success');
}

function rejectAge() {
    showNotification('🚫 Доступ запрещен для лиц младше 18 лет', 'error');
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
                <img src="${product.image}" alt="${product.name}" class="product-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='block'">
                <span class="product-icon" style="display: none;">${product.fallbackIcon}</span>
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
    showNotification(`✅ "${product.name}" добавлен в корзину`, 'success');
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartUI();
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

// Расчет стоимости с учетом скидок
function calculateTotalPrice() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    if (isReferralUser && userDiscount > 0) {
        const discountAmount = Math.round((subtotal * userDiscount) / 100);
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
    const prices = calculateTotalPrice();
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <div class="item-price-single">${item.price}₽ × ${item.quantity}</div>
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
                <span>🎁 Реферальная скидка ${userDiscount}%:</span>
                <span class="discount-amount">-${prices.discount}₽</span>
            </div>
        `;
        cartItems.appendChild(discountInfo);
    }
    
    totalPrice.textContent = `${prices.total}₽`;
    saveToStorage();
}

// Оформление заказа
function checkout() {
    if (cart.length === 0) {
        showNotification('❌ Корзина пуста!', 'error');
        return;
    }
    
    // Показываем/скрываем выбор цвета шахты в зависимости от товаров в корзине
    const hasShaft = cart.some(item => item.id === 'shaft');
    const shaftColorGroup = document.getElementById('shaftColorGroup');
    
    if (hasShaft) {
        shaftColorGroup.style.display = 'block';
        // Делаем выбор цвета обязательным только если шахта в корзине
        document.querySelectorAll('input[name="shaftColor"]').forEach(input => {
            input.required = true;
        });
    } else {
        shaftColorGroup.style.display = 'none';
        document.querySelectorAll('input[name="shaftColor"]').forEach(input => {
            input.required = false;
        });
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
        shaftColor: formData.get('shaftColor') || 'Не выбран',
        comment: formData.get('comment').trim(),
        cart: [...cart],
        timestamp: Date.now(),
        referrerId: getReferrerIdFromStorage()
    };
    
    // Валидация
    if (!orderData.name || !orderData.telegram || !orderData.phone || !orderData.address) {
        showNotification('❌ Заполните все обязательные поля!', 'error');
        return;
    }
    
    if (!orderData.telegram.startsWith('@')) {
        orderData.telegram = '@' + orderData.telegram;
    }
    
    createOrder(orderData);
}

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
        userDiscount: userDiscount,
        userId: userId
    };
    
    orders.push(order);
    currentOrder = order;
    
    // Если это реферальный заказ, начисляем бонус рефереру
    if (orderData.referrerId && orderData.referrerId !== userId) {
        applyReferrerBonus(orderData.referrerId);
    }
    
    saveToStorage();
    showPaymentScreen(orderId, prepayment);
    showNotification('✅ Заказ создан! Перейдите к оплате.', 'success');
}

function showPaymentScreen(orderId, amount) {
    const orderIdElement = document.getElementById('orderId');
    const paymentAmountElement = document.getElementById('paymentAmount');
    const prepaymentAmountElement = document.getElementById('prepaymentAmount');
    
    if (orderIdElement) orderIdElement.textContent = orderId;
    if (paymentAmountElement) paymentAmountElement.textContent = `${amount}₽`;
    if (prepaymentAmountElement) prepaymentAmountElement.textContent = `${amount}₽`;
    
    showScreen('payment');
}

// Функция для обновления статуса заказа
function updateOrderStatus(orderId, status) {
    const order = orders.find(o => o.id === orderId);
    if (order) {
        order.status = status;
        order.updatedAt = new Date().toISOString();
        saveToStorage();
        
        // Обновляем UI если находимся на экране заказов
        if (document.getElementById('orders').classList.contains('active')) {
            loadOrdersUI();
        }
        
        return true;
    }
    return false;
}

// ОСНОВНАЯ ФУНКЦИЯ - ОТПРАВКА ЧЕКА МЕНЕДЖЕРУ
async function sendReceiptToManager() {
    if (!currentOrder) {
        showNotification('❌ Нет активного заказа', 'error');
        return;
    }
    
    const sendBtn = document.querySelector('.btn-payment-confirm');
    const originalText = sendBtn.innerHTML;
    
    // Блокируем кнопку и показываем загрузку
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<span class="btn-icon">⏳</span> Отправляем...';
    sendBtn.style.opacity = '0.7';
    
    try {
        // Отправляем заказ администратору
        const sendResult = await sendOrderToAdmin(currentOrder);
        
        if (sendResult) {
            // Обновляем статус заказа на "активный"
            updateOrderStatus(currentOrder.id, 'active');
            
            // Показываем успешное сообщение
            showSuccessMessage();
            
            // Очищаем корзину
            cart = [];
            
            // Сбрасываем реферальную скидку после первого заказа
            if (isReferralUser) {
                isReferralUser = false;
                userDiscount = 0;
                saveToStorage();
            }
            
            // Обновляем интерфейс
            updateCartUI();
            
        } else {
            throw new Error('Не удалось отправить заказ');
        }
    } catch (error) {
        // Восстанавливаем кнопку при ошибке
        sendBtn.disabled = false;
        sendBtn.innerHTML = originalText;
        sendBtn.style.opacity = '1';
        
        showNotification('❌ Ошибка отправки заказа: ' + error.message, 'error');
    }
}

// Сообщение об успешной отправке
function showSuccessMessage() {
    const paymentScreen = document.getElementById('payment');
    
    if (paymentScreen) {
        paymentScreen.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <div style="font-size: 80px; margin-bottom: 20px;">✅</div>
                <h2 style="margin-bottom: 15px; color: var(--text-primary);">Заказ отправлен менеджеру!</h2>
                <p style="color: var(--text-secondary); margin-bottom: 25px; font-size: 16px;">
                    Заказ #${currentOrder.id} успешно создан и отправлен менеджеру.
                </p>
                
                <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 20px; margin: 25px 0;">
                    <h3 style="color: var(--success); margin-bottom: 15px;">📋 Что дальше?</h3>
                    <div style="text-align: left;">
                        <p style="margin: 10px 0;">💬 <strong>Отправьте скриншот оплаты</strong> менеджеру в Telegram</p>
                        <p style="margin: 10px 0;">🕒 <strong>Менеджер свяжется с вами</strong> в течение 15 минут</p>
                        <p style="margin: 10px 0;">🚚 <strong>Доставка займет 1-3 дня</strong> через СДЭК</p>
                        <p style="margin: 10px 0;">📱 <strong>Статус заказа:</strong> Активный</p>
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 30px;">
                    <button onclick="openManagerChat(true)" class="btn-checkout" style="background: var(--success);">
                        <span class="btn-icon">📤</span>
                        Отправить скриншот менеджеру
                    </button>
                    
                    <button onclick="showScreen('orders')" class="btn-checkout" style="background: var(--primary-light);">
                        <span class="btn-icon">📋</span>
                        Посмотреть мои заказы
                    </button>
                    
                    <button onclick="showScreen('catalog')" class="btn-checkout" style="background: var(--surface-light); color: var(--text-primary);">
                        <span class="btn-icon">🛍️</span>
                        Продолжить покупки
                    </button>
                </div>
                
                <div style="margin-top: 25px; padding: 15px; background: rgba(59, 130, 246, 0.1); border-radius: 10px; border: 1px solid rgba(59, 130, 246, 0.3);">
                    <p style="margin: 0; color: var(--text-secondary); font-size: 14px;">
                        💡 <strong>Важно:</strong> Не забудьте отправить скриншот оплаты менеджеру для подтверждения заказа
                    </p>
                </div>
            </div>
        `;
    }
}

// Функция связи с менеджером
function openManagerChat(withPayment = false) {
    let message;
    
    if (withPayment && currentOrder) {
        message = `Здравствуйте! По заказу #${currentOrder.id}. Прикладываю скриншот оплаты. Сумма: ${currentOrder.prepayment}₽`;
    } else if (currentOrder) {
        message = `Здравствуйте! У меня вопрос по заказу #${currentOrder.id}`;
    } else {
        message = `Здравствуйте! У меня вопрос по заказу из MiniShisha`;
    }
    
    const telegramUrl = `https://t.me/${BOT_CONFIG.managerUsername.replace('@', '')}?text=${encodeURIComponent(message)}`;
    window.open(telegramUrl, '_blank');
}

// ОТПРАВКА ЗАКАЗА АДМИНИСТРАТОРУ
async function sendOrderToAdmin(orderData) {
    const referrerInfo = orderData.referrerId ? `\n🎯 <b>Реферальный заказ от пользователя:</b> ${orderData.referrerId}` : '';
    
    const message = `
🆕 <b>НОВЫЙ ЗАКАЗ #${orderData.id}</b>

👤 <b>Клиент:</b> ${orderData.name}
📱 <b>Telegram:</b> ${orderData.telegram}
📞 <b>Телефон:</b> ${orderData.phone}
📍 <b>Адрес доставки:</b> ${orderData.address}
🎨 <b>Цвет шахты:</b> ${orderData.shaftColor}

💰 <b>Сумма заказа:</b> ${orderData.total}₽
💳 <b>Предоплата:</b> ${orderData.prepayment}₽
🎁 <b>Скидка:</b> ${orderData.discount}₽

📦 <b>Состав заказа:</b>
${orderData.cart.map(item => 
    `• ${item.name} × ${item.quantity} = ${item.price * item.quantity}₽`
).join('\n')}

${orderData.comment ? `💬 <b>Комментарий клиента:</b>\n${orderData.comment}` : ''}

${orderData.isReferralOrder ? `🎯 <b>Реферальный заказ</b> (скидка ${orderData.userDiscount}%)` : ''}
${referrerInfo}

⏰ <b>Время заказа:</b> ${orderData.date} ${orderData.time}
👤 <b>ID пользователя:</b> ${orderData.userId}

💬 <b>Клиент должен отправить скриншот оплаты в личные сообщения!</b>
    `.trim();

    try {
        const response = await fetch(`https://api.telegram.org/bot${BOT_CONFIG.token}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: BOT_CONFIG.adminChatId,
                text: message,
                parse_mode: 'HTML'
            })
        });
        
        const result = await response.json();
        console.log('Order sent to admin:', result);
        
        return true;
        
    } catch (error) {
        console.error('Error sending order to admin:', error);
        return false;
    }
}

// Управление заказами
function loadOrdersUI() {
    const ordersList = document.getElementById('ordersList');
    if (!ordersList) return;
    
    ordersList.innerHTML = '';
    
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
    
    userOrders.sort((a, b) => b.timestamp - a.timestamp);
    
    userOrders.forEach(order => {
        const orderCard = document.createElement('div');
        orderCard.className = 'order-card';
        
        const discountInfo = order.discount > 0 ? `
            <div class="order-detail">
                <strong>🎁 Скидка:</strong>
                <span class="discount-amount">-${order.discount}₽</span>
            </div>
        ` : '';
        
        orderCard.innerHTML = `
            <div class="order-header">
                <div class="order-title">
                    Заказ #${order.id}
                    ${order.isReferralOrder ? '<span class="referral-badge">Реферальная скидка</span>' : ''}
                </div>
                <div class="order-status status-${order.status}">${getStatusText(order.status)}</div>
            </div>
            <div class="order-details">
                <div class="order-detail">
                    <strong>📅 Дата:</strong>
                    <span>${order.date} ${order.time}</span>
                </div>
                <div class="order-detail">
                    <strong>🎨 Цвет шахты:</strong>
                    <span>${order.shaftColor}</span>
                </div>
                ${order.subtotal > order.total ? `
                <div class="order-detail">
                    <strong>💰 Итого без скидки:</strong>
                    <span style="text-decoration: line-through; color: var(--text-muted);">${order.subtotal}₽</span>
                </div>
                ` : ''}
                ${discountInfo}
                <div class="order-detail">
                    <strong>💳 К оплате:</strong>
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
        'new': '🆕 Новый',
        'active': '✅ Активный',
        'completed': '🚚 Отправлен',
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
    
    const referralLink = `${window.location.origin}${window.location.pathname}?ref=${userId}`;
    referralLinkElement.value = referralLink;
    
    const userReferrals = getSuccessfulReferrals();
    referralCountElement.textContent = userReferrals.length;
    
    const discount = calculateUserDiscount();
    discountPercentElement.textContent = `${discount}%`;
    
    userDiscount = discount;
    saveToStorage();
}

function getSuccessfulReferrals() {
    return referrals.filter(ref => 
        ref.referrerId === userId && ref.bonusApplied === true
    );
}

function calculateUserDiscount() {
    const successfulReferrals = getSuccessfulReferrals();
    return Math.min(10 + successfulReferrals.length * 5, 30);
}

function copyReferralLink() {
    const linkInput = document.getElementById('referralLink');
    if (!linkInput) return;
    
    linkInput.select();
    linkInput.setSelectionRange(0, 99999);
    
    navigator.clipboard.writeText(linkInput.value).then(() => {
        showNotification('✅ Ссылка скопирована! Делитесь с друзьями!', 'success');
    }).catch(() => {
        linkInput.select();
        document.execCommand('copy');
        showNotification('✅ Ссылка скопирована!', 'success');
    });
}

function handleReferralParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref');
    
    if (refParam && refParam !== userId) {
        saveReferrerId(refParam);
        
        const existingReferral = referrals.find(ref => 
            ref.referredId === userId && ref.referrerId === refParam
        );
        
        if (!existingReferral) {
            const referral = {
                id: Date.now(),
                referrerId: refParam,
                referredId: userId,
                date: new Date().toISOString(),
                bonusApplied: false
            };
            
            referrals.push(referral);
            isReferralUser = true;
            userDiscount = 10;
            
            saveToStorage();
            showNotification('🎉 Вы перешли по реферальной ссылке! Получите скидку 10% на первый заказ!', 'success');
        }
    }
}

function saveReferrerId(referrerId) {
    localStorage.setItem('minishisha_referrerId', referrerId);
}

function getReferrerIdFromStorage() {
    return localStorage.getItem('minishisha_referrerId');
}

function applyReferrerBonus(referrerId) {
    const referral = referrals.find(ref => 
        ref.referrerId === referrerId && ref.referredId === userId && !ref.bonusApplied
    );
    
    if (referral) {
        referral.bonusApplied = true;
        referral.bonusAppliedAt = new Date().toISOString();
        saveToStorage();
        
        if (userId === referrerId) {
            showNotification('🎉 Ваш друг совершил заказ! Ваша скидка увеличена!', 'success');
            loadReferralUI();
        }
    }
}

// Уведомления
function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: '💡'
    };
    
    notification.innerHTML = `
        <span class="notification-icon">${icons[type] || icons.info}</span>
        <span class="notification-content">${message}</span>
    `;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }, 3000);
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('Страница загружена, инициализируем приложение...');
    initApp();
});
