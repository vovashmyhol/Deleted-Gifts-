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

// App State
let selectedGift = GIFTS_DATA[0];
let currentQuantity = 1;
let tonConnectUI = null;

// Initialize Telegram WebApp SDK
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  if (tg.enableClosingConfirmation) {
    tg.enableClosingConfirmation();
  }
}

// DOM Elements
const giftsGrid = document.getElementById('gifts-grid');
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

// TON Confirm Overlay Elements
const tonConfirmOverlay = document.getElementById('ton-confirm-overlay');
const confirmAmount = document.getElementById('confirm-amount');
const confirmComment = document.getElementById('confirm-comment');
const cancelTxBtn = document.getElementById('cancel-tx-btn');

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initLoadingScreen();
  initTelegramUserData();
  initTonConnect();
  renderCatalog();
  setupEventListeners();
});

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



// Setup User Info from Telegram or fallback to Volodymyr & auto-set username
function initTelegramUserData() {
  if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
    const user = tg.initDataUnsafe.user;
    const name = user.first_name + (user.last_name ? ` ${user.last_name}` : '');
    senderName.textContent = name || 'Volodymyr';
    if (user.photo_url) {
      senderAvatar.src = user.photo_url;
    }
    // Auto-set current Telegram user's username for recipient field
    if (user.username) {
      recipientHandleInput.value = `@${user.username}`;
    }
  }
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
      <div class="gift-img-wrapper">
        <img src="${gift.image}" alt="${gift.name}" class="gift-img">
      </div>
      <div class="gift-price">
        <span>${formattedPrice}</span>
        <img src="Ton.png" alt="TON" class="gift-price-icon">
      </div>
    `;

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

// Event Listeners
function setupEventListeners() {
  // Backdrop click closes sheet
  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) {
      closePurchaseSheet();
    }
  });

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

  // Build comment payload text: Example "To @vovnx gift #2 Anonim"
  const recipient = recipientHandleInput.value.trim() || '@vovnx';
  const isAnonymous = anonToggle.checked;
  const commentText = `To ${recipient} gift #${selectedGift.id}${isAnonymous ? ' Anonim' : ''}`;
  
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
