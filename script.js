// Основные данные приложения
let cart = [];
let currentOrder = null;
let orders = [];
let referrals = [];
let userDiscount = 0;
let isReferralUser = false;

// Slot Machine System
const slotPrizes = [
    { type: 'discount', value: 5, text: '5% СКИДКА', chance: 25 },
    { type: 'discount', value: 3, text: '3% СКИДКА', chance: 35 },
    { type: 'discount', value: 1, text: '1% СКИДКА', chance: 30 },
    { type: 'spin', value: 1, text: 'ДОП. СПИН', chance: 8 },
    { type: 'nothing', value: 0, text: 'ПОВЕЗЕТ В СЛЕДУЮЩИЙ РАЗ', chance: 2 }
];

let userSpins = 1;
let currentDiscount = 0;
let userInvitations = [];

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
    initSlotMachine();
    
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

// Slot Machine Functions
function initSlotMachine() {
    if (!localStorage.getItem('minishisha_slotShown')) {
        setTimeout(showSlotMachine, 1500);
        localStorage.setItem('minishisha_slotShown', 'true');
    }
    loadInvitationsFromStorage();
}

function loadInvitationsFromStorage() {
    const saved = localStorage.getItem('minishisha_invitations');
    if (saved) userInvitations = JSON.parse(saved);
}

function saveInvitationsToStorage() {
    localStorage.setItem('minishisha_invitations', JSON.stringify(userInvitations));
}

function canInviteMore() {
    const today = new Date().toDateString();
    const todayInvites = userInvitations.filter(inv => 
        new Date(inv.date).toDateString() === today
    ).length;
    
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weekInvites = userInvitations.filter(inv => 
        new Date(inv.date) > weekAgo
    ).length;
    
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const monthInvites = userInvitations.filter(inv => 
        new Date(inv.date) > monthAgo
    ).length;
    
    return {
        canInvite: todayInvites < 2 && weekInvites < 5 && monthInvites < 15,
        today: todayInvites,
        todayLeft: 2 - todayInvites,
        week: weekInvites,
        weekLeft: 5 - weekInvites,
        month: monthInvites,
        monthLeft: 15 - monthInvites
    };
}

function addInvitation(friendId) {
    const inviteCheck = canInviteMore();
    
    if (!inviteCheck.canInvite) {
        return { success: false, reason: 'limit_reached' };
    }
    
    const alreadyInvited = userInvitations.some(inv => inv.friendId === friendId);
    if (alreadyInvited) {
        return { success: false, reason: 'already_invited' };
    }
    
    userInvitations.push({
        friendId,
        date: new Date().toISOString()
    });
    
    userSpins += 2;
    updateSpinsDisplay();
    saveInvitationsToStorage();
    
    return { success: true, spins: 2, limits: inviteCheck };
}

function updateSpinsDisplay() {
    const spinCount = document.getElementById('spinCount');
    if (spinCount) spinCount.textContent = userSpins;
    
    const spinBtn = document.getElementById('spinButton');
    if (spinBtn) {
        spinBtn.disabled = userSpins <= 0;
        spinBtn.textContent = userSpins > 0 ? 
            `🎯 КРУТИТЬ (${userSpins})` : '❌ НЕТ СПИНОВ';
    }
}

function showSlotMachine() {
    document.getElementById('slotPopup').classList.remove('hidden');
    updateSpinsDisplay();
    updateLimitsDisplay();
}

function closeSlotMachine() {
    document.getElementById('slotPopup').classList.add('hidden');
}

function updateLimitsDisplay() {
    const limits = canInviteMore();
    const limitsElement = document.getElementById('inviteLimits');
    if (limitsElement) {
        limitsElement.innerHTML = `
            <div>📅 Сегодня: ${limits.today}/2</div>
            <div>📅 Неделя: ${limits.week}/5</div>
            <div>📅 Месяц: ${limits.month}/15</div>
        `;
    }
}

function spinSlotMachine() {
    if (userSpins <= 0) {
        showNotification('❌ Нет спинов! Пригласите друга или сделайте заказ');
        return;
    }
    
    userSpins--;
    updateSpinsDisplay();
    
    const reels = document.querySelectorAll('.reel');
    reels.forEach(reel => {
        reel.style.animation = 'spin 0.5s ease-in-out';
    });
    
    setTimeout(() => {
        const prize = getRandomPrize();
        showPrizeResult(prize);
        
        reels.forEach(reel => {
            reel.style.animation = '';
        });
    }, 1500);
}

function getRandomPrize() {
    const random = Math.random() * 100;
    let accumulatedChance = 0;
    
    for (const prize of slotPrizes) {
        accumulatedChance += prize.chance;
        if (random <= accumulatedChance) {
            return prize;
        }
    }
    return slotPrizes[0];
}

function showPrizeResult(prize) {
    if (prize.type === 'discount') {
        currentDiscount = prize.value;
        showNotification(`🎉 Вы выиграли ${prize.value}% скидку!`);
        applyDiscount(prize.value);
    } else if (prize.type === 'spin') {
        userSpins += prize.value;
        updateSpinsDisplay();
        showNotification(`🎁 +${prize.value} дополнительный спин!`);
    } else {
        showNotification('😔 Повезет в следующий раз!');
    }
}

function applyDiscount(discount) {
    userDiscount = discount;
    isReferralUser = true;
    saveToStorage();
    
    const discountElement = document.getElementById('currentDiscount');
    if (discountElement) {
        discountElement.textContent = `${discount}%`;
        discountElement.style.display = 'block';
    }
}

function shareForSpin() {
    userSpins += 1;
    updateSpinsDisplay();
    showNotification('📤 Поделились! +1 спин');
}

function inviteFriend() {
    const friendId = 'friend_' + Date.now();
    const result = addInvitation(friendId);
    
    if (result.success) {
        showNotification(`👥 Пригласили друга! +2 спина`);
        updateLimitsDisplay();
    } else {
        showNotification('❌ Лимит приглашений исчерпан');
    }
}

function orderForSpins() {
    userSpins += 2;
    updateSpinsDisplay();
    showNotification('🛒 Заказ оформлен! +2 спина');
    closeSlotMachine();
    showScreen('catalog');
}

// Работа с localStorage
function saveToStorage() {
    localStorage.setItem('minishisha_cart', JSON.stringify(cart));
    localStorage.setItem('minishisha_orders', JSON.stringify(orders));
    localStorage.setItem('minishisha_referrals', JSON.stringify(referrals));
    localStorage.setItem('minishisha_userDiscount', userDiscount.toString());
    localStorage.setItem('minishisha_isReferralUser', isReferralUser.toString());
}

function loadFromStorage() {
    try {
        cart = JSON.parse(localStorage.getItem('minishisha_cart') || '[]');
        orders = JSON.parse(localStorage.getItem('minishisha_orders') || '[]');
        referrals = JSON.parse(localStorage.getItem('minishisha_referrals') || '[]');
        userDiscount = parseInt(localStorage.getItem('minishisha_userDiscount') || '0');
        isReferralUser = localStorage.getItem('minishisha_isReferralUser') === 'true';
    } catch (e) {
        console.error('Ошибка загрузки данных:', e);
        cart = [];
        orders = [];
        referrals = [];
        userDiscount = 0;
        isReferralUser = false;
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
    
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
    
    const navButton = document.querySelector(`.nav-item[data-screen="${screenId}"]`);
    if (navButton) {
        navButton.classList.add('active');
    }
    
    switch(screenId) {
        case 'cart':
            updateCartUI();
            break;
        case 'orders':
            loadOrdersUI();
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
        
        const badge = index === 0 ? '<div class="product-badge">🔥 Хит продаж</div>' : '';
        
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
    
    if (prices.discount > 0) {
        const discountInfo = document.createElement('div');
        discountInfo.className = 'discount-info';
        discountInfo.innerHTML = `
            <div class="discount-line">
                <span>Реферальная скидка ${userDiscount}%:</span>
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
        showNotification('❌ Корзина пуста!');
        return;
    }
    
    const hasShaft = cart.some(item => item.id === 'shaft');
    const hasBowl = cart.some(item => item.id === 'bowl');
    
    if (!hasShaft || !hasBowl) {
        showNotification('⚠️ Для работы кальяна нужны и шахта и колба!');
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
        shaftColor: formData.get('shaftColor'),
        comment: formData.get('comment').trim(),
        cart: [...cart],
        timestamp: Date.now()
    };
    
    if (!orderData.name || !orderData.telegram || !orderData.phone || !orderData.address || !orderData.shaftColor) {
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
    
    saveToStorage();
    showPaymentScreen(orderId, prepayment);
    showNotification('✅ Заказ создан! Перейдите к оплате.');
    
    // Даем спины за заказ
    orderForSpins();
}

function showPaymentScreen(orderId, amount) {
    const orderIdElement = document.getElementById('orderId');
    const paymentAmountElement = document.getElementById('paymentAmount');
    
    if (orderIdElement) orderIdElement.textContent = orderId;
    if (paymentAmountElement) paymentAmountElement.textContent = `${amount}₽`;
    
    showScreen('payment');
}

// ОБНОВЛЕННАЯ ФУНКЦИЯ ОПЛАТЫ
async function confirmPayment() {
    const confirmBtn = document.querySelector('.btn-payment-confirm');
    const originalText = confirmBtn.innerHTML;
    
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="btn-icon">⏳</span> Подтверждаем...';
    confirmBtn.style.opacity = '0.7';
    
    try {
        if (currentOrder) {
            const order = orders.find(o => o.id === currentOrder.id);
            if (order) {
                order.status = 'paid';
                saveToStorage();
            }
            
            const sendResult = await sendOrderToAdmin(currentOrder);
            
            showPaymentSuccessAnimation();
            
            cart = [];
            
            if (isReferralUser) {
                isReferralUser = false;
                userDiscount = 0;
                saveToStorage();
            }
            
            updateCartUI();
            
        } else {
            throw new Error('Нет активного заказа');
        }
    } catch (error) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalText;
        confirmBtn.style.opacity = '1';
        
        showNotification('❌ Ошибка подтверждения оплаты: ' + error.message);
    }
}

// АНИМАЦИЯ УСПЕШНОЙ ОПЛАТЫ
function showPaymentSuccessAnimation() {
    const paymentScreen = document.getElementById('payment');
    
    const successOverlay = document.createElement('div');
    successOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(16, 185, 129, 0.95);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        color: white;
        text-align: center;
        padding: 20px;
        animation: fadeIn 0.5s ease;
    `;
    
    successOverlay.innerHTML = `
        <div style="font-size: 80px; margin-bottom: 20px; animation: bounce 1s ease infinite;">🎉</div>
        <h2 style="font-size: 24px; margin-bottom: 10px; color: white; font-weight: bold;">Оплата подтверждена!</h2>
        <p style="margin-bottom: 20px; font-size: 16px; opacity: 0.9;">Заказ #${currentOrder.id} успешно оформлен</p>
        <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 10px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.3);">
            <p style="margin: 5px 0;">📞 <strong>С вами свяжется менеджер</strong> в течение 15 минут</p>
            <p style="margin: 5px 0;">💬 <strong>Не забудьте отправить скриншот оплаты менеджеру</strong></p>
            <p style="margin: 5px 0;">🚚 <strong>Доставка:</strong> 1-3 дня через СДЭК</p>
        </div>
        <button onclick="closeSuccessAnimation()" style="
            background: white; 
            color: #10b981; 
            border: none; 
            padding: 12px 24px; 
            border-radius: 10px; 
            font-weight: bold;
            cursor: pointer;
            font-size: 16px;
            transition: transform 0.2s ease;
        ">
            👍 Понятно
        </button>
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(successOverlay);
    
    const button = successOverlay.querySelector('button');
    button.addEventListener('mouseover', function() {
        this.style.transform = 'scale(1.05)';
    });
    button.addEventListener('mouseout', function() {
        this.style.transform = 'scale(1)';
    });
}

function closeSuccessAnimation() {
    const overlay = document.querySelector('div[style*="rgba(16, 185, 129"]');
    if (overlay) {
        overlay.style.animation = 'fadeIn 0.5s ease reverse';
        setTimeout(() => {
            overlay.remove();
            showScreen('catalog');
            
            document.querySelector('.app-main').classList.add('success-animation');
            setTimeout(() => {
                document.querySelector('.app-main').classList.remove('success-animation');
            }, 1000);
        }, 500);
    }
}

// ОТПРАВКА ЗАКАЗА АДМИНИСТРАТОРУ
async function sendOrderToAdmin(orderData) {
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

⏰ <b>Время заказа:</b> ${orderData.date} ${orderData.time}

💬 <b>Клиент должен отправить скриншот оплаты!</b>
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
        return true;
    }
}

// СВЯЗЬ С МЕНЕДЖЕРОМ
function openManagerChat() {
    const defaultMessage = `Здравствуйте! У меня вопрос по заказу из MiniShisha`;
    const telegramUrl = `https://t.me/${BOT_CONFIG.managerUsername.replace('@', '')}?text=${encodeURIComponent(defaultMessage)}`;
    
    window.open(telegramUrl, '_blank');
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
        'new': '🆕 Ожидает оплаты',
        'paid': '💳 Оплачен',
        'accepted': '✅ Принят',
        'completed': '🚚 Отправлен',
        'cancelled': '❌ Отменен'
    };
    return statusMap[status] || status;
}

// РЕФЕРАЛЬНАЯ СИСТЕМА
function loadReferralUI() {
    const referralLinkElement = document.getElementById('referralLink');
    const referralCountElement = document.getElementById('referralCount');
    const discountPercentElement = document.getElementById('discountPercent');
    
    if (!referralLinkElement || !referralCountElement || !discountPercentElement) return;
    
    const userId = generateUserId();
    const referralLink = `${window.location.origin}${window.location.pathname}?ref=${userId}`;
    
    referralLinkElement.value = referralLink;
    
    const userReferrals = referrals.filter(ref => ref.referrerId === userId);
    referralCountElement.textContent = userReferrals.length;
    
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
        linkInput.select();
        document.execCommand('copy');
        showNotification('✅ Ссылка скопирована!');
    });
}

function handleReferralParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref');
    
    console.log('🔍 Проверка реферальных параметров:', refParam);
    
    if (refParam) {
        const currentUserId = generateUserId();
        
        if (refParam === currentUserId) {
            console.log('⚠️ Пользователь перешел по своей же ссылке');
            return;
        }
        
        const existingReferral = referrals.find(ref => 
            ref.referredId === currentUserId
        );
        
        if (!existingReferral) {
            console.log('🎯 Новый реферал обнаружен!');
            
            const referral = {
                id: Date.now(),
                referrerId: refParam,
                referredId: currentUserId,
                date: new Date().toISOString(),
                bonusApplied: false
            };
            
            referrals.push(referral);
            
            isReferralUser = true;
            userDiscount = 10;
            
            saveToStorage();
            
            showNotification('🎉 Вы перешли по реферальной ссылке! Получите скидку 10% на первый заказ!');
        } else {
            console.log('⚠️ Бонус уже был применен ранее');
        }
    }
}

// Вспомогательные функции
function showNotification(message, duration = 3000) {
    if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
        Telegram.WebApp.showAlert(message);
    } else {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--surface);
            color: var(--text-primary);
            padding: 16px 20px;
            border-radius: 12px;
            border: 1px solid var(--border);
            box-shadow: var(--shadow-lg);
            z-index: 1000;
            font-weight: 500;
            max-width: 320px;
            text-align: center;
            line-height: 1.4;
            animation: slideDown 0.3s ease;
        `;
        toast.innerHTML = message.replace(/\n/g, '<br>');
        document.body.appendChild(toast);
        
        if (!document.querySelector('#toast-styles')) {
            const style = document.createElement('style');
            style.id = 'toast-styles';
            style.textContent = `
                @keyframes slideDown {
                    from { transform: translate(-50%, -100%); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        setTimeout(() => {
            toast.style.animation = 'slideDown 0.3s ease reverse';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, duration);
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
    console.log('User Discount:', userDiscount);
    console.log('Is Referral User:', isReferralUser);
    console.log('User Spins:', userSpins);
    console.log('User Invitations:', userInvitations);
}
