
//Visa korten.

function showCards(elementId, cards, totalSlots = null) {
  const div = document.getElementById(elementId);
  if (!div) return;

  const safeCards = Array.isArray(cards) ? cards : [];
  div.innerHTML = "";

  safeCards.forEach(card => {
    const img = document.createElement("img");
    img.src = card.img;
    div.appendChild(img);
  });

  if (Number.isFinite(totalSlots) && totalSlots > 0) {
    const missing = Math.max(0, Math.floor(totalSlots) - safeCards.length);
    for (let i = 0; i < missing; i++) {
      const slot = document.createElement("div");
      slot.className = "card-slot";
      div.appendChild(slot);
    }
  }
}

function getCurrentUser() {
  return JSON.parse(localStorage.getItem("currentUser")) || null;
}

function saveCurrentUser(user) {
  localStorage.setItem("currentUser", JSON.stringify(user));

  // Synka även mot "users" så saldot inte försvinner vid ny inloggning.
  const users = JSON.parse(localStorage.getItem("users")) || [];
  const idx = users.findIndex(u => u.username === user.username);
  if (idx !== -1) {
    users[idx] = { ...users[idx], ...user };
    localStorage.setItem("users", JSON.stringify(users));
  }
}

let uiInHand = false;

function positionResultAboveCommunity() {
  const communityArea = document.getElementById("communityArea");
  const result = document.getElementById("result");
  if (!communityArea || !result) return;

  const text = (result.innerText || "").trim();
  if (!text) {
    result.style.display = "none";
    return;
  }

  result.style.display = "block";
  result.style.position = "fixed";
  result.style.left = "50%";
  result.style.transform = "translateX(-50%)";
  result.style.zIndex = "6";

  const rect = communityArea.getBoundingClientRect();
  const gap = 10;

  const resultRect = result.getBoundingClientRect();
  let top = rect.top - gap - resultRect.height;
  top = Math.max(8, Math.round(top));
  result.style.top = `${top}px`;
}

function positionPotUnderCommunity() {
  const communityArea = document.getElementById("communityArea");
  const pot = document.getElementById("pot");
  if (!communityArea || !pot) return;

  const rect = communityArea.getBoundingClientRect();

  pot.style.position = "fixed";
  pot.style.left = "50%";
  pot.style.transform = "translateX(-50%)";
  pot.style.zIndex = "5";

  const gap = 10;
  let top = rect.bottom + gap;

  // Keep it on-screen if the viewport is short.
  const potRect = pot.getBoundingClientRect();
  const maxTop = window.innerHeight - potRect.height - 8;
  if (Number.isFinite(maxTop)) top = Math.min(top, maxTop);
  top = Math.max(8, top);

  pot.style.top = `${Math.round(top)}px`;
}

function positionComputerAreasAroundCommunity() {
  const communityArea = document.getElementById("communityArea");
  if (!communityArea) return;

  // Default layout: Computer 1 = Left, Computer 2 = Top, Computer 3 = Right.
  const topArea = document.getElementById("computerAreaTop");
  const leftArea = document.getElementById("computerAreaLeft");
  const rightArea = document.getElementById("computerAreaRight");
  if (!topArea || !leftArea || !rightArea) return;

  // Compact mode: keep all computer areas centered horizontally.
  // (Matches the baseline layout size we scale from: 1100x955.)
  const compact = window.innerWidth < 1100 || window.innerHeight < 955;

  const rect = communityArea.getBoundingClientRect();
  const gapTop = 16;
  const gapSide = 32;
  const padding = 8;

  const getTargetCardCenterY = () => {
    const communityCards = document.getElementById("communityCards");
    if (isElementVisible(communityCards)) {
      const r = communityCards.getBoundingClientRect();
      return r.top + (r.height / 2);
    }
    return rect.top + (rect.height / 2);
  };

  const desiredAreaTopForCardCenter = (areaEl) => {
    if (!isElementVisible(areaEl)) return null;
    const cardsEl = areaEl.querySelector(".computerCards");
    if (!isElementVisible(cardsEl)) return null;

    const areaRect = areaEl.getBoundingClientRect();
    const cardsRect = cardsEl.getBoundingClientRect();
    const centerInsideArea = (cardsRect.top - areaRect.top) + (cardsRect.height / 2);
    return getTargetCardCenterY() - centerInsideArea;
  };

  if (compact) {
    const header = document.querySelector("#game h2");
    const headerRect = header ? header.getBoundingClientRect() : null;

    const areas = [topArea, leftArea, rightArea].filter(isElementVisible);
    for (const a of areas) {
      a.style.left = "50%";
      a.style.transform = "translateX(-50%)";
    }

    const gap = 12;
    const heights = areas.map(a => a.getBoundingClientRect().height);
    const totalHeight = heights.reduce((sum, h) => sum + h, 0) + Math.max(0, areas.length - 1) * gap;

    const topFromHeader = headerRect ? (headerRect.bottom + gapTop) : padding;
    const bottomLimit = rect.top - gapTop;
    let startTop = bottomLimit - totalHeight;
    startTop = Math.max(padding, Math.round(Math.min(startTop, topFromHeader)));

    let y = startTop;
    for (let i = 0; i < areas.length; i++) {
      areas[i].style.top = `${Math.round(y)}px`;
      y += heights[i] + gap;
    }

    return;
  }

  // TOP
  topArea.style.left = "50%";
  topArea.style.transform = "translateX(-50%)";
  const topAreaHeight = topArea.getBoundingClientRect().height;
  const header = document.querySelector("#game h2");
  const headerRect = header ? header.getBoundingClientRect() : null;

  const topFromHeader = headerRect ? (headerRect.bottom + gapTop) : padding;
  const topAboveCommunity = rect.top - gapTop - topAreaHeight;

  // TOP Computer2, Below header.
  let topTop;
  if (topFromHeader <= topAboveCommunity) topTop = topFromHeader;
  else topTop = topAboveCommunity;

  topTop = Math.max(padding, Math.round(topTop));
  topArea.style.top = `${topTop}px`;

  // LEFT Computer1
  leftArea.style.transform = "";
  let leftLeft = rect.left - gapSide - leftArea.getBoundingClientRect().width;
  leftLeft = Math.max(padding, Math.round(leftLeft));
  let leftTop = desiredAreaTopForCardCenter(leftArea);
  if (!Number.isFinite(leftTop)) {
    leftTop = rect.top + (rect.height / 2) - (leftArea.getBoundingClientRect().height / 2);
  }
  leftTop = Math.max(padding, Math.round(leftTop));
  const leftMaxTop = window.innerHeight - leftArea.getBoundingClientRect().height - padding;
  leftTop = Math.min(leftTop, leftMaxTop);
  leftArea.style.left = `${leftLeft}px`;
  leftArea.style.top = `${leftTop}px`;

  // RIGHT Computer3
  rightArea.style.transform = "";
  let rightLeft = rect.right + gapSide;
  const rightWidth = rightArea.getBoundingClientRect().width;
  const rightMaxLeft = window.innerWidth - rightWidth - padding;
  rightLeft = Math.min(Math.round(rightLeft), rightMaxLeft);
  rightLeft = Math.max(padding, rightLeft);
  let rightTop = desiredAreaTopForCardCenter(rightArea);
  if (!Number.isFinite(rightTop)) {
    rightTop = rect.top + (rect.height / 2) - (rightArea.getBoundingClientRect().height / 2);
  }
  rightTop = Math.max(padding, Math.round(rightTop));
  const rightMaxTop = window.innerHeight - rightArea.getBoundingClientRect().height - padding;
  rightTop = Math.min(rightTop, rightMaxTop);
  rightArea.style.left = `${rightLeft}px`;
  rightArea.style.top = `${rightTop}px`;
}

function isElementVisible(el) {
  if (!el) return false;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function onResize() {
  const game = document.getElementById("game");
  const inGame = game && !game.classList.contains("hidden");
  if (!inGame) return;

  // Baseline layout size (matches the screenshot layout).
  const baseW = 1100;
  const baseH = 955;

  const vw = window.innerWidth || baseW;
  const vh = window.innerHeight || baseH;

  const scale = Math.min(1, vw / baseW, vh / baseH);
  document.documentElement.style.setProperty("--ui-scale", String(scale));

  requestAnimationFrame(() => {
    positionPotUnderCommunity();
    positionComputerAreasAroundCommunity();
    positionResultAboveCommunity();
  });
}

function initResizeHandling() {
  window.addEventListener("resize", onResize);
  onResize();
}

function hideRaisePanel() {
  const panel = document.getElementById("raisePanel");
  if (panel) panel.classList.add("hidden");
}

function syncRaisePanel() {
  const user = getCurrentUser();
  const slider = document.getElementById("raiseSlider");
  const valueEl = document.getElementById("raiseValue");
  if (!slider || !valueEl) return;

  const game = window.pokerGame;
  const state = game && typeof game.getPublicState === "function" ? game.getPublicState({ revealComputer: false }) : null;
  const toCall = Number(state?.toCall) || 0;

  const balance = Number(user?.balance);
  const max = Number.isFinite(balance)
    ? Math.max(0, Math.floor(balance) - Math.max(0, Math.floor(toCall)))
    : 0;

  slider.min = "50";
  slider.max = String(max);
  slider.step = "1";

  let current = Number(slider.value);
  if (!Number.isFinite(current)) current = 50;
  if (max >= 50) current = Math.min(Math.max(50, Math.floor(current)), max);
  else current = 50;
  slider.value = String(current);

  const prefix = toCall > 0 ? "Re-raise" : "Raise";
  valueEl.innerText = current === max && max >= 50 ? `${prefix}: ${current} (All in)` : `${prefix}: ${current}`;
}

function updateBalance() {
  const user = getCurrentUser();
  const el = document.getElementById("balance");
  const addMoneyBtn = document.getElementById("addMoneyBtn");
  if (!user) {
    el.innerText = "Balance: 0 SEK";
    if (addMoneyBtn) addMoneyBtn.classList.add("hidden");
    return;
  }

  const balance = Number(user.balance);
  const safeBalance = Number.isFinite(balance) ? balance : 0;

  el.innerText = `Balance: ${safeBalance} SEK`;
  if (addMoneyBtn) {
    if (safeBalance <= 0 && !uiInHand) addMoneyBtn.classList.remove("hidden");
    else addMoneyBtn.classList.add("hidden");
  }
}

function updatePot(potValue) {
  const value = typeof potValue === "number" ? potValue : 0;
  document.getElementById("pot").innerText = `Pot: ${value} SEK`;
  positionPotUnderCommunity();
}

function updateBlindInfo(state) {
  const el = document.getElementById("blindInfo");
  if (!el) return;

  const sbIndex = Number(state?.smallBlindIndex);
  const bbIndex = Number(state?.bigBlindIndex);
  const smallBlind = Number(state?.smallBlind);
  const bigBlind = Number(state?.bigBlind);

  const sbValue = Number.isFinite(smallBlind) ? smallBlind : 0;
  const bbValue = Number.isFinite(bigBlind) ? bigBlind : 0;

  if (sbIndex === 0) {
    el.innerText = `Small Blind: ${sbValue} SEK`;
    return;
  }

  if (bbIndex === 0) {
    el.innerText = `Big Blind: ${bbValue} SEK`;
    return;
  }

  el.innerText = "";
}

function setActionsEnabled(enabled) {
  const checkBtn = document.getElementById("checkBtn");
  if (checkBtn) checkBtn.disabled = !enabled;
  document.getElementById("callBtn").disabled = !enabled;
  document.getElementById("raiseBtn").disabled = !enabled;
  document.getElementById("foldBtn").disabled = !enabled;
  const nextRoundBtn = document.getElementById("nextRoundBtn");
  if (nextRoundBtn) nextRoundBtn.disabled = !enabled;

  const confirmRaiseBtn = document.getElementById("confirmRaiseBtn");
  const raiseSlider = document.getElementById("raiseSlider");
  if (confirmRaiseBtn) confirmRaiseBtn.disabled = !enabled;
  if (raiseSlider) raiseSlider.disabled = !enabled;
  if (!enabled) hideRaisePanel();
}

//Add money to Player balance.

document.getElementById("addMoneyBtn").addEventListener("click", () => {
  let user = getCurrentUser();
  if (!user) return;
  if (uiInHand) return;
  user.balance += 1000;
  saveCurrentUser(user);
  updateBalance();
});

// Play again, Game hard reset.

document.getElementById("playAgainBtn").addEventListener("click", () => {
  hideRaisePanel();
  document.getElementById("result").innerText = "";
  positionResultAboveCommunity();
  document.getElementById("playAgainBtn").classList.add("hidden");

  const user = getCurrentUser();
  if (user) {
    user.balance = 1000;
    saveCurrentUser(user);
    updateBalance();
  }

  if (window.pokerGame) {
    window.pokerGame.resetTable();
    renderGame(window.pokerGame.getPublicState());
  }
});

function applyBalanceDelta(delta) {
  if (!delta) return;
  const user = getCurrentUser();
  if (!user) return;
  user.balance += delta;
  saveCurrentUser(user);
  updateBalance();
}

function renderGame(state) {
  if (!state) return;

  uiInHand = !!state.inHand;

  showCards("playerCards", state.playerHand || []);
  const hands = Array.isArray(state.computerHands) ? state.computerHands : null;
  if (hands && hands.length) {
    showCards("computerCardsLeft", hands[0] || [], 2);
    showCards("computerCardsTop", hands[1] || [], 2);
    showCards("computerCardsRight", hands[2] || [], 2);
  } else {
    showCards("computerCardsLeft", state.computerHand || [], 2);
    showCards("computerCardsTop", [], 2);
    showCards("computerCardsRight", [], 2);
  }
  showCards("communityCards", state.communityCards || [], 5);
  updatePot(state.pot || 0);

  updateBlindBadges(state);
  updateBlindInfo(state);
  updateComputerBalances(state);
  updateComputerActions(state);

  // After DOM updates settle, ensure pot is placed correctly.
  requestAnimationFrame(positionPotUnderCommunity);
  requestAnimationFrame(positionComputerAreasAroundCommunity);
  requestAnimationFrame(positionResultAboveCommunity);

  setActionsEnabled(!!state.inHand);
  syncActionAvailability(state);
  updateBalance();
}

function syncActionAvailability(state) {
  const inHand = !!state?.inHand;
  const toCall = Number(state?.toCall) || 0;

  const checkBtn = document.getElementById("checkBtn");
  const callBtn = document.getElementById("callBtn");
  const raiseBtn = document.getElementById("raiseBtn");
  const foldBtn = document.getElementById("foldBtn");
  const nextRoundBtn = document.getElementById("nextRoundBtn");

  if (!inHand) {
    if (checkBtn) checkBtn.disabled = true;
    if (callBtn) callBtn.disabled = true;
    if (raiseBtn) raiseBtn.disabled = true;
    if (foldBtn) foldBtn.disabled = true;
    if (nextRoundBtn) nextRoundBtn.disabled = true;
    return;
  }

  // Only allow Call when a computer has raised.
  if (toCall > 0) {
    if (checkBtn) checkBtn.disabled = true;
    if (callBtn) callBtn.disabled = false;
    // Allow re-raise if player can afford at least the minimum raise.
    const user = getCurrentUser();
    const balance = Number(user?.balance);
    const safeBalance = Number.isFinite(balance) ? Math.floor(balance) : 0;
    const canReraise = (safeBalance - toCall) >= 50;
    if (raiseBtn) raiseBtn.disabled = !canReraise;
    if (nextRoundBtn) nextRoundBtn.disabled = true;
    return;
  }

  if (checkBtn) checkBtn.disabled = false;
  if (callBtn) callBtn.disabled = true;
  if (raiseBtn) raiseBtn.disabled = false;
  if (nextRoundBtn) nextRoundBtn.disabled = false;
}

function updateComputerActions(state) {
  const actions = Array.isArray(state?.computerLastActions) ? state.computerLastActions : [];
  const active = Array.isArray(state?.computerActive) ? state.computerActive : [];
  const inHand = Array.isArray(state?.computerInHand) ? state.computerInHand : [];

  const top = document.getElementById("computerActionTop");
  const left = document.getElementById("computerActionLeft");
  const right = document.getElementById("computerActionRight");

  const isActive = (i) => active[i] !== false;
  const isFoldedThisHand = (i) => inHand[i] === false && isActive(i);
  const get = (i) => String(actions[i] || "").toUpperCase();

  const label = (i) => {
    if (!isActive(i)) return "OUT";
    if (isFoldedThisHand(i)) return "FOLD";
    const a = get(i);
    return a === "CHECK" || a === "CALL" || a === "RAISE" || a === "FOLD" ? a : "";
  };

  if (left) left.innerText = label(0);
  if (top) top.innerText = label(1);
  if (right) right.innerText = label(2);
}

function updateComputerBalances(state) {
  const balances = Array.isArray(state?.computerBalances) ? state.computerBalances : [];
  const active = Array.isArray(state?.computerActive) ? state.computerActive : [];
  const inHand = Array.isArray(state?.computerInHand) ? state.computerInHand : [];

  const top = document.getElementById("computerBalanceTop");
  const left = document.getElementById("computerBalanceLeft");
  const right = document.getElementById("computerBalanceRight");

  const topArea = document.getElementById("computerAreaTop");
  const leftArea = document.getElementById("computerAreaLeft");
  const rightArea = document.getElementById("computerAreaRight");

  const fmt = (value) => {
    const n = Number(value);
    const safe = Number.isFinite(n) ? Math.floor(n) : 0;
    return `Balance: ${safe} SEK`;
  };

  const isActive = (i) => active[i] !== false;
  const isFoldedThisHand = (i) => inHand[i] === false && isActive(i);

  if (left) left.innerText = isActive(0) ? fmt(balances[0]) : `${fmt(balances[0])} (OUT)`;
  if (top) top.innerText = isActive(1) ? fmt(balances[1]) : `${fmt(balances[1])} (OUT)`;
  if (right) right.innerText = isActive(2) ? fmt(balances[2]) : `${fmt(balances[2])} (OUT)`;

  if (leftArea) leftArea.style.opacity = (isActive(0) && !isFoldedThisHand(0)) ? "1" : "0.6";
  if (topArea) topArea.style.opacity = (isActive(1) && !isFoldedThisHand(1)) ? "1" : "0.6";
  if (rightArea) rightArea.style.opacity = (isActive(2) && !isFoldedThisHand(2)) ? "1" : "0.6";
}

function updateBlindBadges(state) {
  const user = getCurrentUser();
  const username = (user?.username || "You").trim() || "You";

  const sb = Number(state?.smallBlindIndex);
  const bb = Number(state?.bigBlindIndex);

  const badge = (idx) => {
    if (idx === sb) return " [sB]";
    if (idx === bb) return " [BB]";
    return "";
  };

  const playerHeader = document.getElementById("playerCardsHeader");
  const topHeader = document.getElementById("computerHeaderTop");
  const leftHeader = document.getElementById("computerHeaderLeft");
  const rightHeader = document.getElementById("computerHeaderRight");

  if (playerHeader) playerHeader.innerText = `${username}${badge(0)}`;
  if (leftHeader) leftHeader.innerText = `Computer 1${badge(1)}`;
  if (topHeader) topHeader.innerText = `Computer 2${badge(2)}`;
  if (rightHeader) rightHeader.innerText = `Computer 3${badge(3)}`;
}

function runEngineAction(action) {
  if (!action) return;
  if (action.ok === false) {
    alert(action.error || "Something went wrong.");

    // If the game is over because all computers are eliminated, show Play Again.
    const err = String(action.error || "").toLowerCase();
    const isAllComputersOutError = err.includes("all computers") && err.includes("out");

    const game = window.pokerGame;
    const state = game && typeof game.getPublicState === "function"
      ? game.getPublicState({ revealComputer: false })
      : null;
    const isAllComputersOutState = Number(state?.activeComputerCount) <= 0;

    if (state) renderGame(state);
    if (isAllComputersOutError || isAllComputersOutState) {
      const btn = document.getElementById("playAgainBtn");
      if (btn) btn.classList.remove("hidden");
    }
    return;
  }

  applyBalanceDelta(action.balanceDelta || 0);

  if (action.message) {
    document.getElementById("result").innerText = action.message;
    requestAnimationFrame(positionResultAboveCommunity);
  }

  renderGame(action.state);

  if (action.state && !action.state.inHand) {
    document.getElementById("playAgainBtn").classList.remove("hidden");
  }
}

// Start hand.
document.getElementById("dealBtn").addEventListener("click", () => {
  hideRaisePanel();
  const game = window.pokerGame;
  if (!game) return;

  const user = getCurrentUser();
  if (!user) {
    alert("You must log in first.");
    return;
  }

  const currentState = game.getPublicState ? game.getPublicState({ revealComputer: false }) : null;

  // Require enough balance to post whatever blind the player owes this hand.
  const sbIndex = Number(currentState?.smallBlindIndex);
  const bbIndex = Number(currentState?.bigBlindIndex);
  const smallBlind = Number(currentState?.smallBlind);
  const bigBlind = Number(currentState?.bigBlind);

  let required = 0;
  if (sbIndex === 0 && Number.isFinite(smallBlind)) required = smallBlind;
  if (bbIndex === 0 && Number.isFinite(bigBlind)) required = bigBlind;

  if (user.balance < required) {
    alert("You don't have enough money to post the blind.");
    return;
  }

  document.getElementById("result").innerText = "";
  document.getElementById("playAgainBtn").classList.add("hidden");

  runEngineAction(game.startHand());
});

// Next round.
const nextRoundBtn = document.getElementById("nextRoundBtn");
if (nextRoundBtn) {
  nextRoundBtn.addEventListener("click", () => {
    hideRaisePanel();
    const game = window.pokerGame;
    if (!game) return;
    runEngineAction(game.nextRound());
  });
}

// Call, raise, fold.
document.getElementById("checkBtn").addEventListener("click", () => {
  hideRaisePanel();
  const game = window.pokerGame;
  if (!game) return;
  runEngineAction(typeof game.check === "function" ? game.check() : game.call());
});

document.getElementById("callBtn").addEventListener("click", () => {
  hideRaisePanel();
  const game = window.pokerGame;
  if (!game) return;
  runEngineAction(game.call());
});

document.getElementById("raiseSlider").addEventListener("input", () => {
  syncRaisePanel();
});

document.getElementById("raiseBtn").addEventListener("click", () => {
  const game = window.pokerGame;
  if (!game) return;

  const user = getCurrentUser();
  if (!user) return;

  const balance = Number(user.balance);
  if (!Number.isFinite(balance) || balance < 50) {
    alert("You don't have enough money");
    return;
  }

  const panel = document.getElementById("raisePanel");
  if (!panel) return;

  if (!panel.classList.contains("hidden")) {
    hideRaisePanel();
    return;
  }

  panel.classList.remove("hidden");
  syncRaisePanel();
});

document.getElementById("confirmRaiseBtn").addEventListener("click", () => {
  const game = window.pokerGame;
  if (!game) return;

  const user = getCurrentUser();
  if (!user) return;

  const slider = document.getElementById("raiseSlider");
  if (!slider) return;

  const balance = Number(user.balance);
  const max = Number.isFinite(balance) ? Math.floor(balance) : 0;

  let raiseAmount = Number(slider.value);
  if (!Number.isFinite(raiseAmount)) raiseAmount = 50;
  raiseAmount = Math.max(50, Math.floor(raiseAmount));
  if (max >= 50) raiseAmount = Math.min(raiseAmount, max);

  hideRaisePanel();
  runEngineAction(game.raise(raiseAmount));
});

document.getElementById("foldBtn").addEventListener("click", () => {
  hideRaisePanel();
  const game = window.pokerGame;
  if (!game) return;
  runEngineAction(game.fold());
});

// Secure initial UI state.
setActionsEnabled(false);
updateBalance();
updatePot(0);

initResizeHandling();

if (window.pokerGame) {
  renderGame(window.pokerGame.getPublicState());
}