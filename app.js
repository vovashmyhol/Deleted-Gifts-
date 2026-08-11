// Telegram Mini App Logic for Deleted Gifts Bot

// Target TON Wallet destination address
const RECEIVER_TON_ADDRESS = 'UQDyKNQLN_PqZgd_NXnVe80cezX9M5mCL0izNW3w2iQAXkp0'; 

// Gifts Catalog Data
const GIFTS_DATA = [
  { id: 1, name: 'Сердце', price: 0.6, image: 'Gifts/1.png' },
  { id: 2, name: 'Мишка', price: 0.6, image: 'Gifts/2.png' },
  { id: 3, name: 'Роза', price: 0.6, image: 'Gifts/3.png' },
  { id: 4, name: 'Подарок', price: 0.6, image: 'Gifts/4.png' },
  { id: 5, name: 'Торт', price: 0.6, image: 'Gifts/5.png' },
  { id: 6, name: 'Букет', price: 0.6, image: 'Gifts/6.png' },
  { id: 7, name: 'Ракета', price: 0.6, image: 'Gifts/7.png' },
  { id: 8, name: 'Шампанское', price: 0.6, image: 'Gifts/8.png' },
  { id: 9, name: 'Алмаз', price: 0.6, image: 'Gifts/9.png' },
  { id: 10, name: 'Кубок', price: 0.6, image: 'Gifts/10.png' }
];

// Initialize Telegram WebApp SDK
const tg = window.Telegram?.WebApp;

function applyThemeColor() {
  document.documentElement.style.backgroundColor = '#121418';
  if (document.body) document.body.style.backgroundColor = '#121418';
  if (tg) {
    try {
      if (tg.setHeaderColor) tg.setHeaderColor('#121418');
      if (tg.setBackgroundColor) tg.setBackgroundColor('#121418');
    } catch (e) {
      console.warn('Error setting Telegram header/bg color:', e);
    }
  }
}

if (tg) {
  tg.ready();
  tg.expand();
  if (tg.enableClosingConfirmation) {
    tg.enableClosingConfirmation();
  }
}
applyThemeColor();
setTimeout(applyThemeColor, 100);
setTimeout(applyThemeColor, 500);

function triggerHapticFeedback(type = 'impact', style = 'medium') {
  if (!tg || !tg.HapticFeedback) return;

  try {
    if (type === 'selection' && typeof tg.HapticFeedback.selectionChanged === 'function') {
      tg.HapticFeedback.selectionChanged();
    } else if (type === 'notification' && typeof tg.HapticFeedback.notificationOccurred === 'function') {
      tg.HapticFeedback.notificationOccurred(style === 'success' ? 'success' : 'warning');
    } else if (type === 'impact' && typeof tg.HapticFeedback.impactOccurred === 'function') {
      tg.HapticFeedback.impactOccurred(style);
    }
  } catch (e) {
    console.warn('Haptic feedback error:', e);
  }
}

function buildBotCommentPayload(action, details = {}) {
  const safeAction = String(action || 'unknown').trim();
  const safeRecipient = String(details.recipient || '').trim();
  const safeGiftId = String(details.giftId || '').trim();
  const safeQty = String(details.qty || '').trim();
  const safeSignature = String(details.signature || '').trim();
  const isAnonymous = details.anonymous ? 'anon' : '';

  const parts = [`send_to_vovnx_${safeAction}`];

  if (safeGiftId) parts.push(`g${safeGiftId}`);
  if (safeQty) parts.push(`q${safeQty}`);
  if (safeRecipient) parts.push(`u${safeRecipient}`);
  if (isAnonymous) parts.push(isAnonymous);
  if (safeSignature) parts.push(`c${safeSignature}`);

  return parts.join('_');
}

// App State
let selectedGift = GIFTS_DATA[0];
let luckyGift = GIFTS_DATA[0];
let currentQuantity = 1;
let tonConnectUI = null;
let isSpinning = false;

const LUCKY_DEFAULT_PROBABILITY = 60;
const LUCKY_HOUSE_PAYOUT_FACTOR = 0.8;

// DOM Elements
const appContainer = document.querySelector('.app-container');
const giftsGrid = document.getElementById('gifts-grid');
const bannerCarousel = document.getElementById('banner-carousel');
const bannerTrack = document.getElementById('banner-track');
const profileEntry = document.getElementById('profile-entry');
const headerUserAvatar = document.getElementById('header-user-avatar');
const headerUserName = document.getElementById('header-user-name');
const headerUserSubtitle = document.querySelector('.profile-entry .bot-status');
const profileScreen = document.getElementById('profile-screen');
const profileBackBtn = document.getElementById('profile-back-btn');
const profileUserAvatar = document.getElementById('profile-user-avatar');
const profileUserName = document.getElementById('profile-user-name');
const profileUsername = document.getElementById('profile-username');
const profileUserId = document.getElementById('profile-user-id');
const profileSpentTon = document.getElementById('profile-spent-ton');
const profileTabs = document.querySelectorAll('.profile-tab');
const modalBackdrop = document.getElementById('modal-backdrop');
const purchaseSheet = document.getElementById('purchase-sheet');
const sheetGiftImg = document.getElementById('sheet-gift-img');
const senderAvatar = document.getElementById('sender-avatar');
const senderName = document.getElementById('sender-name');
const giftCommentInput = document.getElementById('gift-comment');
const recipientHandleInput = document.getElementById('recipient-handle');
const clearRecipientBtn = document.getElementById('clear-recipient-btn');
const qtyMinusBtn = document.getElementById('qty-minus');
const qtyPlusBtn = document.getElementById('qty-plus');
const qtyCountSpan = document.getElementById('qty-count');
const anonToggle = document.getElementById('anon-toggle');
const buyBtn = document.getElementById('buy-btn');
const buyPriceSpan = document.getElementById('buy-price');

// Lucky Buy Modal DOM Elements
const luckyModalBackdrop = document.getElementById('lucky-modal-backdrop');
const luckySheet = document.getElementById('lucky-sheet');
const closeLuckyBtn = document.getElementById('close-lucky-btn');
const luckyGiftBasePrice = document.getElementById('lucky-gift-base-price');
const luckyProbSlider = document.getElementById('lucky-prob-slider');
const luckyProbBadge = document.getElementById('lucky-prob-badge');
const luckySkipToggle = document.getElementById('lucky-skip-toggle');
const luckyMultiplier = document.getElementById('lucky-multiplier');
const luckyWinAmount = document.getElementById('lucky-win-amount');
const luckySpinBtn = document.getElementById('lucky-spin-btn');
const luckyBtnPrice = document.getElementById('lucky-btn-price');
const luckyRouletteTrack = document.getElementById('lucky-roulette-track');
const luckyMainForm = document.getElementById('lucky-main-form');
const luckyResultScreen = document.getElementById('lucky-result-screen');
const luckyResultLose = document.getElementById('lucky-result-lose');
const luckyResultWin = document.getElementById('lucky-result-win');
const luckyWonGiftName = document.getElementById('lucky-won-gift-name');
const luckyWonGiftImg = document.getElementById('lucky-won-gift-img');
const luckyRetryBtn = document.getElementById('lucky-retry-btn');
const luckyWithdrawBtn = document.getElementById('lucky-withdraw-btn');
const luckyWithdrawRecipient = document.getElementById('lucky-withdraw-recipient');
const clearLuckyRecipientBtn = document.getElementById('clear-lucky-recipient-btn');
const luckyClaimCommentInput = document.getElementById('lucky-claim-comment');
const luckyRouletteContainer = document.getElementById('lucky-roulette-container');
const luckyBasePriceRow = document.getElementById('lucky-base-price-row');

// TON Confirm Overlay Elements
const tonConfirmOverlay = document.getElementById('ton-confirm-overlay');
const confirmAmount = document.getElementById('confirm-amount');
const confirmComment = document.getElementById('confirm-comment');
const cancelTxBtn = document.getElementById('cancel-tx-btn');

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  applyThemeColor();
  initLoadingScreen();
  initTelegramUserData();
  updateProfileSpentDisplay();
  initTonConnect();
  initBannerCarousel();
  renderCatalog();
  setupEventListeners();
});

function initBannerCarousel() {
  if (!bannerCarousel || !bannerTrack) return;

  const slides = Array.from(bannerTrack.children);
  if (slides.length < 2) return;

  let currentIndex = 0;
  let autoRotateTimer = null;
  let touchStartX = 0;
  let touchEndX = 0;

  const dotsContainer = document.createElement('div');
  dotsContainer.className = 'banner-dots';

  slides.forEach((_, index) => {
    const dot = document.createElement('span');
    dot.className = `banner-dot${index === 0 ? ' active' : ''}`;
    dotsContainer.appendChild(dot);
  });

  bannerCarousel.appendChild(dotsContainer);

  function updateDots() {
    const dots = dotsContainer.querySelectorAll('.banner-dot');
    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle('active', dotIndex === currentIndex);
    });
  }

  function goToSlide(index) {
    currentIndex = (index + slides.length) % slides.length;
    bannerTrack.style.transform = `translateX(-${currentIndex * 100}%)`;
    updateDots();
  }

  function startAutoRotate() {
    if (autoRotateTimer) clearInterval(autoRotateTimer);
    autoRotateTimer = setInterval(() => {
      goToSlide(currentIndex + 1);
    }, 3000);
  }

  goToSlide(0);
  startAutoRotate();

  dotsContainer.querySelectorAll('.banner-dot').forEach((dot, index) => {
    dot.addEventListener('click', () => {
      goToSlide(index);
      startAutoRotate();
    });
  });

  bannerCarousel.addEventListener('touchstart', (event) => {
    touchStartX = event.changedTouches[0].clientX;
  }, { passive: true });

  bannerCarousel.addEventListener('touchend', (event) => {
    touchEndX = event.changedTouches[0].clientX;
    const delta = touchEndX - touchStartX;

    if (Math.abs(delta) < 50) return;

    if (delta < 0) {
      goToSlide(currentIndex + 1);
    } else {
      goToSlide(currentIndex - 1);
    }
    startAutoRotate();
  }, { passive: true });
}

// Initialize and play Lottie loading animation, then hide screen
function initLoadingScreen() {
  const loadingScreen = document.getElementById('loading-screen');
  const lottieContainer = document.getElementById('lottie-loader');

  // Play Lottie animation
  const anim = lottie.loadAnimation({
    container: lottieContainer,
    renderer: 'svg',
    loop: true,
    autoplay: true,
    path: 'https://raw.githubusercontent.com/vovashmyhol/Deleted-Gifts-/refs/heads/main/load.json'
  });

  // Preload all gift images
  const imagePromises = GIFTS_DATA.map(gift => {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = resolve; // resolve even on error so we don't hang
      img.src = gift.image;
    });
  });

  // Minimum 1.5s display + wait for images to load
  const minDelay = new Promise(resolve => setTimeout(resolve, 1500));

  Promise.all([minDelay, ...imagePromises]).then(() => {
    anim.destroy();
    loadingScreen.classList.add('hidden');
  });
}



function getProfileSpentTon() {
  try {
    const value = Number(localStorage.getItem('profileSpentTon') || '0');
    return Number.isFinite(value) ? value : 0;
  } catch (e) {
    return 0;
  }
}

function updateProfileSpentDisplay() {
  if (profileSpentTon) profileSpentTon.textContent = getProfileSpentTon().toFixed(2);
}

function recordSpentTon(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return;
  try {
    localStorage.setItem('profileSpentTon', (getProfileSpentTon() + value).toFixed(2));
    updateProfileSpentDisplay();
  } catch (e) {
    console.warn('Could not save spent TON:', e);
  }
}

function applyProfileUser(userData) {
  const fallbackName = 'User';
  const name = userData?.name || fallbackName;
  const username = userData?.username || '@user';
  const userId = userData?.id ? `ID: ${userData.id}` : 'ID: -';
  const photoUrl = userData?.photoUrl || 'Bot avatar.jpg';

  if (headerUserName) headerUserName.textContent = name;
  if (headerUserSubtitle) headerUserSubtitle.textContent = 'Профиль';
  if (headerUserAvatar) headerUserAvatar.src = photoUrl;
  if (profileUserName) profileUserName.textContent = name;
  if (profileUsername) profileUsername.textContent = username;
  if (profileUserId) profileUserId.textContent = userId;
  if (profileUserAvatar) profileUserAvatar.src = photoUrl;
}

function openProfileScreen() {
  if (!appContainer || !profileScreen) return;
  appContainer.classList.add('profile-active');
  profileScreen.hidden = false;
}

function closeProfileScreen() {
  if (!appContainer || !profileScreen) return;
  appContainer.classList.remove('profile-active');
  profileScreen.hidden = true;
}

function switchProfileTab(tabName) {
  profileTabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.profileTab === tabName);
  });

  document.querySelectorAll('.profile-tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `profile-tab-${tabName}`);
  });
}

// Setup User Info from Telegram or fallback to Volodymyr & auto-set username
function initTelegramUserData() {
  let profileData = {
    name: 'User',
    username: '@user',
    id: '',
    photoUrl: 'Bot avatar.jpg'
  };

  if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
    const user = tg.initDataUnsafe.user;
    const name = user.first_name + (user.last_name ? ` ${user.last_name}` : '');
    const telegramUsername = user.username ? `@${user.username}` : '@user';

    profileData = {
      name: name || 'User',
      username: telegramUsername,
      id: user.id || '',
      photoUrl: user.photo_url || 'Bot avatar.jpg'
    };

    senderName.textContent = name || 'Volodymyr';
    if (user.photo_url) {
      senderAvatar.src = user.photo_url;
    }

    // Auto-set current Telegram user's username for recipient field
    if (user.username) {
      recipientHandleInput.value = telegramUsername;
      if (luckyWithdrawRecipient) {
        luckyWithdrawRecipient.value = telegramUsername;
      }
    }
  }

  applyProfileUser(profileData);
}

// Initialize TON Connect UI
function initTonConnect() {
  try {
    const manifestUrl = 'https://vovashmyhol.github.io/RuletkaDepPro/tonconnect-manifest.json';

    tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
      manifestUrl: manifestUrl,
      buttonRootId: 'ton-connect-btn',
      uiPreferences: {
        theme: TON_CONNECT_UI.THEME.DARK,
        colorsSet: {
          [TON_CONNECT_UI.THEME.DARK]: {
            connectButton: {
              background: '#1a1e25'
            }
          }
        }
      }
    });
  } catch (err) {
    console.warn('TonConnect UI init warning:', err);
  }
}

// Render Catalog Grid
function renderCatalog() {
  giftsGrid.innerHTML = '';
  
  GIFTS_DATA.forEach(gift => {
    const card = document.createElement('div');
    card.className = `gift-card ${gift.id === selectedGift.id ? 'selected' : ''}`;
    card.setAttribute('data-id', gift.id);
    
    // Formatting price (e.g. 0.6)
    const formattedPrice = Number.isInteger(gift.price) ? gift.price : gift.price.toFixed(1);
    
    card.innerHTML = `
      <button type="button" class="gift-card-lucky-btn" title="Испытать удачу">
        <img src="LuckyBuyIcon3.png" alt="Lucky Buy" class="lucky-btn-clover-img">
      </button>
      <div class="gift-img-wrapper">
        <img src="${gift.image}" alt="${gift.name}" class="gift-img">
      </div>
      <div class="gift-price">
        <span>${formattedPrice}</span>
        <img src="Ton.png" alt="TON" class="gift-price-icon">
      </div>
    `;

    // Click on Lucky Icon opens Lucky Buy modal
    const luckyBtn = card.querySelector('.gift-card-lucky-btn');
    luckyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openLuckyModal(gift);
    });

    // Click on main card opens regular purchase sheet
    card.addEventListener('click', () => {
      openPurchaseSheet(gift);
    });

    giftsGrid.appendChild(card);
  });
}

// Open Purchase Sheet Modal
function openPurchaseSheet(gift) {
  selectedGift = gift;
  currentQuantity = 1;
  qtyCountSpan.textContent = currentQuantity;
  
  // Highlight selected item in grid
  document.querySelectorAll('.gift-card').forEach(card => {
    card.classList.toggle('selected', parseInt(card.getAttribute('data-id')) === gift.id);
  });

  // Update Modal Content
  sheetGiftImg.src = gift.image;
  updateTotalPrice();
  
  // Show Sheet
  modalBackdrop.classList.add('active');
}

// Close Purchase Sheet
function closePurchaseSheet() {
  modalBackdrop.classList.remove('active');
}

// Update Calculated Total Price
function updateTotalPrice() {
  const total = (selectedGift.price * currentQuantity);
  const formattedTotal = Number.isInteger(total) ? total : total.toFixed(2);
  buyPriceSpan.textContent = formattedTotal;
}

const ITEM_WIDTH = 82;
const ITEM_GAP = 10;
const ITEM_STRIDE = ITEM_WIDTH + ITEM_GAP; // 92px per item
const START_INDEX = 5; // Initial centered index when modal opens (shows LuckyBuyIcon2 cards on left!)
const WIN_INDEX = 38; // Target reel index for spin stopping

// Check if app is running locally or outside Telegram initData (Test Mode)
function isLocalOrTestEnv() {
  const isLocalHost = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1' || 
                      window.location.hostname === '' ||
                      window.location.protocol === 'file:';
  const hasTgInitData = !!(tg && tg.initData && tg.initData.length > 0);
  return isLocalHost || !hasTgInitData;
}

// Build horizontal roulette tape DOM
function buildRouletteTrack(targetGift, landingWon = false) {
  if (!luckyRouletteTrack) return;
  luckyRouletteTrack.innerHTML = '';
  
  const totalItems = 50;

  for (let i = 0; i < totalItems; i++) {
    let type = 'lucky';
    let imgSrc = 'LuckyBuyIcon2.png';
    let altName = 'Lucky Buy';

    if (i === START_INDEX) {
      // Center item in initial view before spin
      type = 'gift';
      imgSrc = targetGift.image;
      altName = targetGift.name;
    } else if (i === WIN_INDEX) {
      // Landing item when spin completes
      if (landingWon) {
        type = 'gift';
        imgSrc = targetGift.image;
        altName = targetGift.name;
      } else {
        type = 'lucky';
        imgSrc = 'LuckyBuyIcon2.png';
        altName = 'Lucky Buy';
      }
    } else {
      // On filler slots: only show the selected targetGift or LuckyBuyIcon2.png (no other catalog gifts!)
      if (i > START_INDEX && i % 4 === 0) {
        type = 'gift';
        imgSrc = targetGift.image;
        altName = targetGift.name;
      } else {
        type = 'lucky';
        imgSrc = 'LuckyBuyIcon2.png';
        altName = 'Lucky Buy';
      }
    }

    const itemDiv = document.createElement('div');
    itemDiv.className = `roulette-item ${type === 'gift' ? 'gift-card-item' : 'lucky-card'}`;
    itemDiv.innerHTML = `<img src="${imgSrc}" alt="${altName}" class="roulette-item-img">`;
    luckyRouletteTrack.appendChild(itemDiv);
  }
}

// Reset roulette track to initial centered view (item START_INDEX centered)
function resetRouletteTrack() {
  if (!luckyRouletteTrack) return;
  luckyRouletteTrack.style.transition = 'none';
  // Center START_INDEX (half item width = 41px offset)
  const initialOffset = - (START_INDEX * ITEM_STRIDE + 41);
  luckyRouletteTrack.style.transform = `translateX(${initialOffset}px)`;
}

function updateLuckyWonGiftPreview(gift) {
  if (!gift || !luckyWonGiftImg) return;
  if (luckyWonGiftName) luckyWonGiftName.textContent = gift.name;
  luckyWonGiftImg.src = gift.image;
  luckyWonGiftImg.alt = gift.name;
}

// Open Lucky Buy Modal
function openLuckyModal(gift) {
  luckyGift = gift;
  luckyGiftBasePrice.textContent = gift.price;
  updateLuckyWonGiftPreview(gift);
  luckyProbSlider.value = LUCKY_DEFAULT_PROBABILITY;
  updateLuckyMath();
  
  buildRouletteTrack(gift, false);
  resetRouletteTrack();

  if (luckyClaimCommentInput) luckyClaimCommentInput.value = '';
  if (luckyRouletteContainer) luckyRouletteContainer.style.display = '';
  if (luckyBasePriceRow) luckyBasePriceRow.style.display = '';

  // Always reset to main spin form, hide result screen
  luckyMainForm.style.display = '';
  luckyResultScreen.style.display = 'none';

  luckyModalBackdrop.classList.add('active');
}

// Close Lucky Buy Modal
function closeLuckyModal() {
  luckyModalBackdrop.classList.remove('active');
}

// Show Result Screen inside Lucky Modal (win or lose)
function showLuckyResult(won, wonGift = luckyGift) {
  // Hide main form, show result
  luckyMainForm.style.display = 'none';
  luckyResultScreen.style.display = '';

  if (luckyRouletteContainer) luckyRouletteContainer.style.display = 'none';
  if (luckyBasePriceRow) luckyBasePriceRow.style.display = 'none';

  if (won) {
    luckyResultLose.style.display = 'none';
    luckyResultWin.style.display = '';
    updateLuckyWonGiftPreview(wonGift);

    if (luckyClaimCommentInput) luckyClaimCommentInput.value = '';

    const defaultRecipient = (tg?.initDataUnsafe?.user?.username ? `@${tg.initDataUnsafe.user.username}` : recipientHandleInput.value.trim() || '@vovnx');
    if (luckyWithdrawRecipient && !luckyWithdrawRecipient.value.trim()) {
      luckyWithdrawRecipient.value = defaultRecipient;
    }
  } else {
    luckyResultWin.style.display = 'none';
    luckyResultLose.style.display = '';
  }
}

function calculateLuckySpinCost(giftPrice, probDecimal) {
  return giftPrice * probDecimal / LUCKY_HOUSE_PAYOUT_FACTOR;
}

// Update Lucky Buy Math & Multiplier
function updateLuckyMath() {
  if (!luckyGift) return;
  const prob = parseInt(luckyProbSlider.value, 10);
  const probDecimal = prob / 100;
  luckyProbBadge.textContent = `${prob}%`;

  const spinCostNumber = calculateLuckySpinCost(luckyGift.price, probDecimal);
  const spinCost = spinCostNumber.toFixed(2);
  const mult = (luckyGift.price / spinCostNumber).toFixed(2);
  const winAmount = luckyGift.price.toFixed(2);

  luckyMultiplier.textContent = `(x${mult})`;
  luckyWinAmount.textContent = winAmount;
  luckyBtnPrice.textContent = spinCost;
}

// Handle Lucky Spin Action
async function handleLuckySpin() {
  if (isSpinning) return;

  const isTestMode = isLocalOrTestEnv();
  const spinGift = luckyGift;

  // In production Telegram environment, require TON Connect wallet
  if (!isTestMode) {
    if (!tonConnectUI || !tonConnectUI.connected) {
      if (tonConnectUI) {
        try {
          await tonConnectUI.openModal();
        } catch (e) {
          console.error('Error opening TonConnect modal:', e);
        }
      } else {
        alert('Пожалуйста, подключите TON кошелек!');
      }
      return;
    }
  }

  const prob = parseInt(luckyProbSlider.value, 10);
  const probDecimal = prob / 100;
  const spinCost = calculateLuckySpinCost(spinGift.price, probDecimal).toFixed(2);
  const commentText = buildBotCommentPayload('lucky_spin', {
    giftId: spinGift.id,
    qty: 1,
    signature: `p${prob}`
  });
  
  const nanoAmount = Math.round(spinCost * 1e9).toString();
  const bocPayload = buildTonCommentPayload(commentText);

  const transaction = {
    validUntil: Math.floor(Date.now() / 1000) + 600,
    messages: [
      {
        address: RECEIVER_TON_ADDRESS,
        amount: nanoAmount,
        payload: bocPayload
      }
    ]
  };

  try {
    const isSkipAnimation = luckySkipToggle.checked;
    
    // Pre-calculate RNG win outcome before trigger
    const won = Math.random() < probDecimal;
    
    // Re-build track with exact landing item at index WIN_INDEX
    buildRouletteTrack(spinGift, won);
    resetRouletteTrack();

    if (!isSkipAnimation) {
      isSpinning = true;
      luckySpinBtn.disabled = true;
      luckySpinBtn.style.opacity = '0.6';
      triggerHapticFeedback('impact', 'medium');
    }

    // Only send real TON transaction in live Telegram environment
    if (!isTestMode && tonConnectUI && tonConnectUI.connected) {
      const result = await tonConnectUI.sendTransaction(transaction);
      console.log('Lucky spin tx success:', result);
    }
    recordSpentTon(Number(spinCost));

    if (!isSkipAnimation) {
      // Small random offset inside the center highlight window (-20px to +20px)
      const randomOffset = Math.floor(Math.random() * 40) - 20;
      const targetScroll = - (WIN_INDEX * ITEM_STRIDE + 41) + randomOffset;

      // Force layout repaint before triggering CSS transition
      luckyRouletteTrack.getBoundingClientRect();
      luckyRouletteTrack.style.transition = 'transform 4.2s cubic-bezier(0.12, 0.8, 0.2, 1)';
      luckyRouletteTrack.style.transform = `translateX(${targetScroll}px)`;

      await new Promise(r => setTimeout(r, 4300));
      luckySpinBtn.disabled = false;
      luckySpinBtn.style.opacity = '1';
      isSpinning = false;
    } else {
      // Instant skip position
      const targetScroll = - (WIN_INDEX * ITEM_STRIDE + 41);
      luckyRouletteTrack.style.transition = 'none';
      luckyRouletteTrack.style.transform = `translateX(${targetScroll}px)`;
    }

    triggerHapticFeedback('notification', won ? 'success' : 'warning');

    // Show result screen inside the modal instead of closing
    showLuckyResult(won, spinGift);

  } catch (err) {
    console.warn('Lucky spin cancelled or failed:', err);
    luckySpinBtn.disabled = false;
    luckySpinBtn.style.opacity = '1';
    isSpinning = false;
    resetRouletteTrack();
  }
}

// Event Listeners
function setupEventListeners() {
  if (profileEntry) {
    profileEntry.addEventListener('click', openProfileScreen);
  }

  if (profileBackBtn) {
    profileBackBtn.addEventListener('click', closeProfileScreen);
  }

  profileTabs.forEach(tab => {
    tab.addEventListener('click', () => switchProfileTab(tab.dataset.profileTab));
  });

  // Backdrop click closes purchase sheet
  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) {
      closePurchaseSheet();
    }
  });

  // Lucky Modal close handlers
  luckyModalBackdrop.addEventListener('click', (e) => {
    if (e.target === luckyModalBackdrop) {
      closeLuckyModal();
    }
  });

  if (closeLuckyBtn) {
    closeLuckyBtn.addEventListener('click', closeLuckyModal);
  }

  // Lucky Probability Slider input event
  if (luckyProbSlider) {
    luckyProbSlider.addEventListener('input', updateLuckyMath);
  }

  // Lucky Spin Button click
  if (luckySpinBtn) {
    luckySpinBtn.addEventListener('click', handleLuckySpin);
  }

  // Lucky Retry Button — go back to spin form
  if (luckyRetryBtn) {
    luckyRetryBtn.addEventListener('click', () => {
      luckyResultScreen.style.display = 'none';
      luckyMainForm.style.display = '';
      if (luckyRouletteContainer) luckyRouletteContainer.style.display = '';
      if (luckyBasePriceRow) luckyBasePriceRow.style.display = '';
      buildRouletteTrack(luckyGift, false);
      resetRouletteTrack();
    });
  }

  // Clear Withdraw Recipient Input
  if (clearLuckyRecipientBtn) {
    clearLuckyRecipientBtn.addEventListener('click', () => {
      luckyWithdrawRecipient.value = '';
      luckyWithdrawRecipient.focus();
    });
  }

  // Lucky Withdraw Button — send 0.05 TON withdrawal fee
  if (luckyWithdrawBtn) {
    luckyWithdrawBtn.addEventListener('click', async () => {
      const isTestMode = isLocalOrTestEnv();
      const recipient = luckyWithdrawRecipient.value.trim() || '@user';
      const signature = luckyClaimCommentInput?.value.trim() || '';
      const commentText = buildBotCommentPayload('claim', {
        giftId: luckyGift.id,
        qty: 1,
        recipient,
        signature
      });
      const WITHDRAW_FEE = 0.05;
      const nanoAmount = Math.round(WITHDRAW_FEE * 1e9).toString();
      const bocPayload = buildTonCommentPayload(commentText);

      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [{ address: RECEIVER_TON_ADDRESS, amount: nanoAmount, payload: bocPayload }]
      };

      if (!isTestMode) {
        if (!tonConnectUI || !tonConnectUI.connected) {
          if (tonConnectUI) { try { await tonConnectUI.openModal(); } catch (e) {} }
          return;
        }
        try {
          await tonConnectUI.sendTransaction(transaction);
          recordSpentTon(0.05);
          closeLuckyModal();
          const msg = `✅ Отлично! Подарок «${luckyGift.name}» будет доставлен ${recipient}!`;
          if (tg && tg.showAlert) tg.showAlert(msg); else alert(msg);
        } catch (err) {
          console.warn('Withdraw tx failed:', err);
        }
      } else {
        // Test mode: simulate withdrawal
        closeLuckyModal();
        alert(`✅ [Тест] Подарок «${luckyGift.name}» будет доставлен ${recipient}!`);
      }
    });
  }

  // Quantity Minus
  qtyMinusBtn.addEventListener('click', () => {
    if (currentQuantity > 1) {
      currentQuantity--;
      qtyCountSpan.textContent = currentQuantity;
      updateTotalPrice();
    }
  });

  // Quantity Plus
  qtyPlusBtn.addEventListener('click', () => {
    if (currentQuantity < 99) {
      currentQuantity++;
      qtyCountSpan.textContent = currentQuantity;
      updateTotalPrice();
    }
  });

  // Clear Recipient Input Button
  if (clearRecipientBtn) {
    clearRecipientBtn.addEventListener('click', () => {
      recipientHandleInput.value = '';
      recipientHandleInput.focus();
    });
  }

  // Buy Button Click
  buyBtn.addEventListener('click', handleBuyAction);

  // Cancel Transaction Modal
  cancelTxBtn.addEventListener('click', () => {
    tonConfirmOverlay.classList.remove('active');
  });
}

// Handle Buy Action and TON Transaction
async function handleBuyAction() {
  // Check if wallet is connected
  if (!tonConnectUI || !tonConnectUI.connected) {
    if (tonConnectUI) {
      try {
        await tonConnectUI.openModal();
      } catch (e) {
        console.error('Error opening TonConnect modal:', e);
      }
    } else {
      alert('Пожалуйста, подключите TON кошелек сверху справа!');
    }
    return;
  }

  // Build structured comment payload for the bot
  const recipient = recipientHandleInput.value.trim() || '@vovnx';
  const isAnonymous = anonToggle.checked;
  const commentText = buildBotCommentPayload('buy', {
    giftId: selectedGift.id,
    qty: currentQuantity,
    recipient,
    anonymous: isAnonymous,
    signature: isAnonymous ? 'anon' : 'public'
  });
  
  const totalPrice = (selectedGift.price * currentQuantity);
  const formattedTotal = Number.isInteger(totalPrice) ? totalPrice : totalPrice.toFixed(2);
  
  // Show TONkeeper confirmation window overlay
  confirmAmount.textContent = `${formattedTotal} TON`;
  confirmComment.textContent = commentText;
  tonConfirmOverlay.classList.add('active');

  // Convert TON to NanoTONs (1 TON = 1,000,000,000 nanoTONs)
  const nanoAmount = Math.round(totalPrice * 1e9).toString();

  // Encode comment text into valid TON Cell BOC Base64 payload
  const bocPayload = buildTonCommentPayload(commentText);

  // Create TON Connect transaction payload
  const transaction = {
    validUntil: Math.floor(Date.now() / 1000) + 600, // 10 minutes
    messages: [
      {
        address: RECEIVER_TON_ADDRESS,
        amount: nanoAmount,
        payload: bocPayload
      }
    ]
  };

  try {
    const result = await tonConnectUI.sendTransaction(transaction);
    console.log('Transaction success:', result);
    recordSpentTon(totalPrice);
    
    // Hide modal and confirmation
    tonConfirmOverlay.classList.remove('active');
    closePurchaseSheet();
    
    if (tg && tg.showAlert) {
      tg.showAlert('Транзакция успешно отправлена!');
    } else {
      alert('Транзакция успешно отправлена!');
    }
  } catch (err) {
    console.warn('Transaction cancelled or failed:', err);
    tonConfirmOverlay.classList.remove('active');
  }
}

// Encode text comment into a valid TON Cell BOC Base64 string for Tonkeeper
function buildTonCommentPayload(text) {
  if (!text) return undefined;
  
  const encoder = new TextEncoder();
  const textBytes = encoder.encode(text);
  const dataLen = 4 + textBytes.length; // 4 zero bytes prefix + UTF-8 string bytes
  
  // Single cell layout (without refs)
  const cellData = new Uint8Array(2 + dataLen);
  cellData[0] = 0; // d1: refs info (0 refs)
  cellData[1] = dataLen * 2; // d2: data length in bits / 4 (byte-aligned)
  cellData[2] = 0; // Op-code for text comment: 0x00000000 (4 zero bytes)
  cellData[3] = 0;
  cellData[4] = 0;
  cellData[5] = 0;
  cellData.set(textBytes, 6);
  
  const cellLen = cellData.length;
  
  // TON BOC Header
  const boc = new Uint8Array(11 + cellLen + 4);
  boc[0] = 0xb5; boc[1] = 0xee; boc[2] = 0x9c; boc[3] = 0x72; // Magic: 0xb5ee9c72
  boc[4] = 0x01; // flags (has_idx=0, hash_crc32=1, off_bytes=1)
  boc[5] = 0x01; // off_bytes
  boc[6] = 0x01; // cells_num
  boc[7] = 0x01; // roots_num
  boc[8] = 0x00; // absent_num
  boc[9] = cellLen; // tot_cells_size
  boc[10] = 0x00; // root_index
  
  boc.set(cellData, 11);
  
  // CRC32-C (Castagnoli)
  const crc = crc32c(boc.subarray(0, 11 + cellLen));
  const offset = 11 + cellLen;
  boc[offset] = crc & 0xff;
  boc[offset + 1] = (crc >> 8) & 0xff;
  boc[offset + 2] = (crc >> 16) & 0xff;
  boc[offset + 3] = (crc >> 24) & 0xff;
  
  // Base64 encode
  let binary = '';
  for (let i = 0; i < boc.length; i++) {
    binary += String.fromCharCode(boc[i]);
  }
  return btoa(binary);
}

// CRC32-C Castagnoli calculation algorithm for TON BOC
function crc32c(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0x82f63b78;
      } else {
        crc = crc >>> 1;
      }
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
