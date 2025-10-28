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
        referrerId: getReferrerIdFromStorage() // Добавляем ID реферера в заказ
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
        userId: userId // Добавляем ID пользователя
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
    
    // НЕ отправляем уведомление администратору здесь!
    // Уведомление будет отправлено только при подтверждении оплаты
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

// ОБНОВЛЕННАЯ ФУНКЦИЯ ОПЛАТЫ С ВИЗУАЛЬНЫМ ПОДТВЕРЖДЕНИЕМ
async function confirmPayment() {
    const confirmBtn = document.querySelector('.btn-payment-confirm');
    const originalText = confirmBtn.innerHTML;
    
    // Блокируем кнопку и показываем загрузку
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="btn-icon">⏳</span> Подтверждаем...';
    confirmBtn.style.opacity = '0.7';
    
    try {
        if (currentOrder) {
            // Отправляем заказ администратору (способ подтверждения: кнопка)
            const sendResult = await sendOrderToAdmin(currentOrder, 'button');
            
            if (sendResult) {
                // Обновляем статус заказа
                updateOrderStatus(currentOrder.id, 'pending_confirmation');
                
                // Показываем анимацию успеха
                showPaymentSuccessAnimation();
                
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
                throw new Error('Не удалось отправить заказ администратору');
            }
        } else {
            throw new Error('Нет активного заказа');
        }
    } catch (error) {
        // Восстанавливаем кнопку при ошибке
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalText;
        confirmBtn.style.opacity = '1';
        
        showNotification('❌ Ошибка подтверждения оплаты: ' + error.message, 'error');
    }
}

// Улучшенная функция подтверждения оплаты через менеджера
async function confirmPaymentViaManager() {
    if (!currentOrder) {
        showNotification('❌ Нет активного заказа', 'error');
        return;
    }
    
    // Сразу отправляем заказ администратору
    const sendResult = await sendOrderToAdmin(currentOrder, 'screenshot');
    
    if (sendResult) {
        // Обновляем статус заказа
        updateOrderStatus(currentOrder.id, 'pending_confirmation');
        
        // Показываем инструкции
        showPaymentInstructions();
        
        // Открываем чат с менеджером
        openManagerChat(true);
        
        showNotification('📤 Заказ отправлен менеджеру! Ожидайте подтверждения.', 'success');
    } else {
        showNotification('❌ Ошибка отправки заказа. Свяжитесь с менеджером напрямую.', 'error');
        openManagerChat(true);
    }
}

// АНИМАЦИЯ УСПЕШНОЙ ОПЛАТЫ
function showPaymentSuccessAnimation() {
    const paymentScreen = document.getElementById('payment');
    
    // Создаем элемент для анимации
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
    
    // Добавляем стили для анимации
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
    
    // Добавляем hover эффект для кнопки
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
            
            // Добавляем анимацию успеха на главном экране
            document.querySelector('.app-main').classList.add('success-animation');
            setTimeout(() => {
                document.querySelector('.app-main').classList.remove('success-animation');
            }, 1000);
        }, 500);
    }
}

// Улучшенная функция связи с менеджером
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
    
    // Открываем в новом окне
    window.open(telegramUrl, '_blank');
}

// Функция для показа инструкций после отправки скриншота
function showPaymentInstructions() {
    const instructions = `
        <div style="text-align: center; padding: 20px;">
            <div style="font-size: 48px; margin-bottom: 15px;">📤</div>
            <h3 style="margin-bottom: 10px; color: var(--text-primary);">Скриншот отправлен!</h3>
            <p style="color: var(--text-secondary); margin-bottom: 15px;">
                Менеджер проверит оплату в течение 15 минут и обновит статус заказа.
            </p>
            <div style="background: rgba(59, 130, 246, 0.1); padding: 15px; border-radius: 10px; margin: 15px 0; border: 1px solid rgba(59, 130, 246, 0.3);">
                <p style="margin: 5px 0; font-size: 14px;">🕒 <strong>Статус заказа:</strong> Ожидает подтверждения</p>
                <p style="margin: 5px 0; font-size: 14px;">💬 <strong>Вы получите уведомление</strong> когда менеджер подтвердит оплату</p>
                <p style="margin: 5px 0; font-size: 14px;">📱 <strong>Можете закрыть эту страницу</strong> - статус сохранится</p>
            </div>
            <button onclick="showScreen('orders')" style="
                background: var(--gradient);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 10px;
                font-weight: bold;
                cursor: pointer;
                font-size: 14px;
                margin: 5px;
            ">
                📋 Посмотреть заказы
            </button>
            <button onclick="showScreen('catalog')" style="
                background: var(--surface-light);
                color: var(--text-primary);
                border: 1px solid var(--border);
                padding: 12px 24px;
                border-radius: 10px;
                font-weight: bold;
                cursor: pointer;
                font-size: 14px;
                margin: 5px;
            ">
                🛍️ Продолжить покупки
            </button>
        </div>
    `;
    
    // Заменяем содержимое экрана оплаты
    const paymentScreen = document.getElementById('payment');
    if (paymentScreen) {
        paymentScreen.innerHTML = instructions;
    }
}

// ОТПРАВКА ЗАКАЗА АДМИНИСТРАТОРУ С КНОПКАМИ УПРАВЛЕНИЯ
async function sendOrderToAdmin(orderData, confirmationMethod = 'button') {
    const referrerInfo = orderData.referrerId ? `\n🎯 <b>Реферальный заказ от пользователя:</b> ${orderData.referrerId}` : '';
    
    // Определяем способ подтверждения
    const confirmationText = confirmationMethod === 'button' 
        ? '🟢 <b>Подтверждение:</b> Через кнопку "Я оплатил"'
        : '📤 <b>Подтверждение:</b> Через отправку скриншота менеджеру';
    
    const message = `
🆕 <b>НОВЫЙ ЗАКАЗ #${orderData.id}</b>

${confirmationText}

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
        'new': '🆕 Ожидает оплаты',
        'pending_confirmation': '📞 Ожидает подтверждения',
        'paid': '💳 Оплачен',
        'accepted': '✅ Принят',
        'completed': '🚚 Отправлен',
        'cancelled': '❌ Отменен'
    };
    return statusMap[status] || status;
}

// ОБНОВЛЕННАЯ РЕФЕРАЛЬНАЯ СИСТЕМА
function loadReferralUI() {
    const referralLinkElement = document.getElementById('referralLink');
    const referralCountElement = document.getElementById('referralCount');
    const discountPercentElement = document.getElementById('discountPercent');
    
    if (!referralLinkElement || !referralCountElement || !discountPercentElement) return;
    
    const referralLink = `${window.location.origin}${window.location.pathname}?ref=${userId}`;
    
    referralLinkElement.value = referralLink;
    
    // Обновляем статистику
    const userReferrals = getSuccessfulReferrals();
    referralCountElement.textContent = userReferrals.length;
    
    // Рассчитываем скидку на основе успешных рефералов
    const discount = calculateUserDiscount();
    discountPercentElement.textContent = `${discount}%`;
    
    // Обновляем скидку пользователя
    userDiscount = discount;
    saveToStorage();
}

// Получение успешных рефералов (тех, кто совершил заказ)
function getSuccessfulReferrals() {
    return referrals.filter(ref => 
        ref.referrerId === userId && ref.bonusApplied === true
    );
}

// Расчет скидки пользователя
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
        // Fallback для старых браузеров
        linkInput.select();
        document.execCommand('copy');
        showNotification('✅ Ссылка скопирована!', 'success');
    });
}

// Обработка реферальных параметров
function handleReferralParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref');
    
    if (refParam && refParam !== userId) {
        // Сохраняем ID реферера
        saveReferrerId(refParam);
        
        // Проверяем, не был ли уже применен бонус
        const existingReferral = referrals.find(ref => 
            ref.referredId === userId && ref.referrerId === refParam
        );
        
        if (!existingReferral) {
            // Сохраняем реферала
            const referral = {
                id: Date.now(),
                referrerId: refParam,
                referredId: userId,
                date: new Date().toISOString(),
                bonusApplied: false
            };
            
            referrals.push(referral);
            
            // Даем скидку новому пользователю
            isReferralUser = true;
            userDiscount = 10; // 10% скидка
            
            saveToStorage();
            
            showNotification('🎉 Вы перешли по реферальной ссылке! Получите скидку 10% на первый заказ!', 'success');
        }
    }
}

// Сохранение ID реферера
function saveReferrerId(referrerId) {
    localStorage.setItem('minishisha_referrerId', referrerId);
}

// Получение ID реферера из хранилища
function getReferrerIdFromStorage() {
    return localStorage.getItem('minishisha_referrerId');
}

// Функция для начисления бонуса рефереру
function applyReferrerBonus(referrerId) {
    // Находим реферала в списке
    const referral = referrals.find(ref => 
        ref.referrerId === referrerId && ref.referredId === userId && !ref.bonusApplied
    );
    
    if (referral) {
        // Отмечаем, что бонус применен
        referral.bonusApplied = true;
        referral.bonusAppliedAt = new Date().toISOString();
        
        saveToStorage();
        
        // Показываем уведомление пользователю, если это он
        if (userId === referrerId) {
            showNotification('🎉 Ваш друг совершил заказ! Ваша скидка увеличена!', 'success');
            // Обновляем UI реферальной системы
            loadReferralUI();
        }
        
        console.log(`Бонус применен для реферера: ${referrerId}`);
    }
}

// УЛУЧШЕННАЯ СИСТЕМА УВЕДОМЛЕНИЙ
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
    
    // Автоматическое удаление через 3 секунды
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

// Дебаг функции для проверки работы
function debugApp() {
    console.log('Cart:', cart);
    console.log('Orders:', orders);
    console.log('Referrals:', referrals);
    console.log('Current Order:', currentOrder);
    console.log('User Discount:', userDiscount);
    console.log('Is Referral User:', isReferralUser);
    console.log('User ID:', userId);
    console.log('Referrer ID:', getReferrerIdFromStorage());
}
