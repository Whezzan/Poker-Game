const PokerUI = (() => {
  // Utilities
  function chipIconForBalance(balance) {
    const n = Number(balance);
    if (!Number.isFinite(n) || n <= 500) return "assets/chips/ChipstackS.png";
    if (n <= 1500) return "assets/chips/ChipstackM.png";
    return "assets/chips/ChipstackL.png";
  }

  // Elements
  const refs = {
    login: document.getElementById("login"),
    game: document.getElementById("game"),
    username: document.getElementById("username"),
    password: document.getElementById("password"),
    loginBtn: document.getElementById("loginBtn"),
    registerBtn: document.getElementById("registerBtn"),
    addMoneyBtn: document.getElementById("addMoneyBtn"),
    logoutBtn: document.getElementById("logoutBtn"),
    playAgainBtn: document.getElementById("playAgainBtn"),
    dealBtn: document.getElementById("dealBtn"),
    checkBtn: document.getElementById("checkBtn"),
    callBtn: document.getElementById("callBtn"),
    raiseBtn: document.getElementById("raiseBtn"),
    foldBtn: document.getElementById("foldBtn"),
    confirmRaiseBtn: document.getElementById("confirmRaiseBtn"),
    raisePanel: document.getElementById("raisePanel"),
    raiseSlider: document.getElementById("raiseSlider"),
    raiseValue: document.getElementById("raiseValue"),
    result: document.getElementById("result"),
    pot: document.getElementById("pot"),
    balance: document.getElementById("balance"),
    blindInfo: document.getElementById("blindInfo"),
    communityArea: document.getElementById("communityArea"),
    communityCards: document.getElementById("communityCards"),
    playerCardsHeader: document.getElementById("playerCardsHeader"),
    playerCards: document.getElementById("playerCards"),
    playerCardsRow: document.getElementById("playerCardsRow"),
    computerAreaLeft: document.getElementById("computerAreaLeft"),
    computerAreaTop: document.getElementById("computerAreaTop"),
    computerAreaRight: document.getElementById("computerAreaRight"),
    computerAreaBottomRight: document.getElementById("computerAreaBottomRight"),
    computerHeaderLeft: document.getElementById("computerHeaderLeft"),
    computerHeaderTop: document.getElementById("computerHeaderTop"),
    computerHeaderRight: document.getElementById("computerHeaderRight"),
    computerHeaderBottomRight: document.getElementById("computerHeaderBottomRight"),
    computerActionLeft: document.getElementById("computerActionLeft"),
    computerActionTop: document.getElementById("computerActionTop"),
    computerActionRight: document.getElementById("computerActionRight"),
    computerActionBottomRight: document.getElementById("computerActionBottomRight"),
    computerBalanceLeft: document.getElementById("computerBalanceLeft"),
    computerBalanceTop: document.getElementById("computerBalanceTop"),
    computerBalanceRight: document.getElementById("computerBalanceRight"),
    computerBalanceBottomRight: document.getElementById("computerBalanceBottomRight"),
    computerCardsLeft: document.getElementById("computerCardsLeft"),
    computerCardsTop: document.getElementById("computerCardsTop"),
    computerCardsRight: document.getElementById("computerCardsRight"),
    computerCardsBottomRight: document.getElementById("computerCardsBottomRight")
  };

  // Assets
  const blindChipAssets = {
    small: {
      src: "assets/chips/SmallBlind.png",
      alt: "Small Blind"
    },
    big: {
      src: "assets/chips/BigBlind.png",
      alt: "Big Blind"
    }
  };

  // State
  let currentState = null;
  let currentUsername = "You";
  let uiInHand = false;

  // Helpers
  function bindClick(element, handler) {
    if (!element || typeof handler !== "function") return;
    element.addEventListener("click", handler);
  }

  function safeAmount(value) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? Math.max(0, Math.floor(numericValue)) : 0;
  }

  function showCards(element, cards, totalSlots = null) {
    if (!element) return;

    const safeCards = Array.isArray(cards) ? cards : [];
    element.innerHTML = "";

    safeCards.forEach((card) => {
      const img = document.createElement("img");
      img.src = card.img;
      element.appendChild(img);
    });

    if (Number.isFinite(totalSlots) && totalSlots > 0) {
      const missing = Math.max(0, Math.floor(totalSlots) - safeCards.length);
      for (let i = 0; i < missing; i++) {
        const slot = document.createElement("div");
        slot.className = "card-slot";
        element.appendChild(slot);
      }
    }
  }

  function isElementVisible(element) {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) {
      return false;
    }
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  // Layout
  function positionResultAboveCommunity() {
    if (!refs.communityArea || !refs.result) return;

    const text = (refs.result.innerText || "").trim();
    if (!text) {
      refs.result.style.display = "none";
      return;
    }

    refs.result.style.display = "block";
    refs.result.style.position = "fixed";
    refs.result.style.left = "50%";
    refs.result.style.transform = "translateX(-50%)";
    refs.result.style.zIndex = "6";

    // Position above the pot.
    const potRect = refs.pot ? refs.pot.getBoundingClientRect() : refs.communityArea.getBoundingClientRect();
    const gap = 8;
    const resultRect = refs.result.getBoundingClientRect();
    const top = Math.max(8, Math.round(potRect.top - gap - resultRect.height));
    refs.result.style.top = `${top}px`;
  }

  function positionPotUnderCommunity() {
    if (!refs.communityArea || !refs.pot) return;

    const rect = refs.communityArea.getBoundingClientRect();
    refs.pot.style.position = "fixed";
    refs.pot.style.left = "50%";
    refs.pot.style.transform = "translateX(-50%)";
    refs.pot.style.zIndex = "5";

    const potRect = refs.pot.getBoundingClientRect();
    const gap = 8;
    const top = rect.top - potRect.height - gap;
    refs.pot.style.top = `${Math.round(Math.max(8, top))}px`;
  }

  function positionComputerAreasAroundCommunity() {
    if (!refs.communityArea || !refs.computerAreaLeft || !refs.computerAreaTop ||
        !refs.computerAreaRight || !refs.computerAreaBottomRight) {
      return;
    }

    const padding = 8;
    const inset = 180;
    const gap = 16;
    const header = document.querySelector("#game h2");
    const headerRect = header ? header.getBoundingClientRect() : null;
    const topY = Math.round(headerRect ? headerRect.bottom + gap : padding);

    const compact = window.innerWidth < 900;
    if (compact) {
      const areas = [refs.computerAreaTop, refs.computerAreaRight,
                     refs.computerAreaLeft, refs.computerAreaBottomRight].filter(isElementVisible);
      areas.forEach((area) => {
        area.style.left = "50%";
        area.style.transform = "translateX(-50%)";
      });
      let cursor = topY;
      for (const area of areas) {
        area.style.top = `${Math.round(cursor)}px`;
        cursor += area.getBoundingClientRect().height + 8;
      }
      return;
    }

    const playerHudEl = document.getElementById("playerHud");
    const playerHudRect = playerHudEl ? playerHudEl.getBoundingClientRect() : null;
    const playerHudTop = playerHudRect ? Math.round(playerHudRect.top) : window.innerHeight - 250;

    function indicatorOffset(area) {
      const ind = area.querySelector('.blind-card-indicator');
      return ind ? Math.round(ind.getBoundingClientRect().width / 2 + 6) : 0;
    }

    // Top-left: Computer 2
    refs.computerAreaTop.style.transform = "";
    refs.computerAreaTop.style.left = `${padding + inset - indicatorOffset(refs.computerAreaTop)}px`;
    refs.computerAreaTop.style.top = `${topY}px`;

    // Top-right: Computer 3
    refs.computerAreaRight.style.transform = "";
    const rightWidth = refs.computerAreaRight.getBoundingClientRect().width;
    refs.computerAreaRight.style.left = `${Math.round(window.innerWidth - rightWidth - padding - inset + indicatorOffset(refs.computerAreaRight))}px`;
    refs.computerAreaRight.style.top = `${topY}px`;

    // Bottom-left: Computer 1
    refs.computerAreaLeft.style.transform = "";
    refs.computerAreaLeft.style.left = `${padding + inset - indicatorOffset(refs.computerAreaLeft)}px`;
    refs.computerAreaLeft.style.top = `${playerHudTop}px`;

    // Bottom-right: Computer 4
    refs.computerAreaBottomRight.style.transform = "";
    const brWidth = refs.computerAreaBottomRight.getBoundingClientRect().width;
    refs.computerAreaBottomRight.style.left = `${Math.round(window.innerWidth - brWidth - padding - inset + indicatorOffset(refs.computerAreaBottomRight))}px`;
    refs.computerAreaBottomRight.style.top = `${playerHudTop}px`;
  }

  function repositionLayout() {
    if (!refs.game || refs.game.classList.contains("hidden")) return;

    const baseWidth = 1100;
    const baseHeight = 955;
    const viewportWidth = window.innerWidth || baseWidth;
    const viewportHeight = window.innerHeight || baseHeight;
    const scale = Math.min(1, viewportWidth / baseWidth, viewportHeight / baseHeight) * 1;

    document.documentElement.style.setProperty("--ui-scale", String(scale));

    requestAnimationFrame(() => {
      positionPotUnderCommunity();
      positionComputerAreasAroundCommunity();
      positionResultAboveCommunity();
    });
  }

  // Raise
  function hideRaisePanel() {
    if (refs.raisePanel) refs.raisePanel.classList.add("hidden");
    if (refs.confirmRaiseBtn) refs.confirmRaiseBtn.disabled = true;
    if (refs.raiseSlider) refs.raiseSlider.disabled = true;
  }

  function syncRaisePanel() {
    if (!refs.raiseSlider || !refs.raiseValue) return;

    const toCall = safeAmount(currentState?.toCall);
    const balance = safeAmount(currentState?.playerBalance);
    const maxRaise = Math.max(0, balance - toCall);

    refs.raiseSlider.min = "50";
    refs.raiseSlider.max = String(maxRaise);
    refs.raiseSlider.step = "1";

    let currentValue = Number(refs.raiseSlider.value);
    if (!Number.isFinite(currentValue)) currentValue = 50;
    if (maxRaise >= 50) currentValue = Math.min(Math.max(50, Math.floor(currentValue)), maxRaise);
    else currentValue = 50;
    refs.raiseSlider.value = String(currentValue);

    const prefix = toCall > 0 ? "Re-raise" : "Raise";
    const suffix = currentValue === maxRaise && maxRaise >= 50 ? " (All in)" : "";
    refs.raiseValue.innerText = `${prefix}: ${currentValue}${suffix}`;

    const enabled = uiInHand && maxRaise >= 50;
    refs.raiseSlider.disabled = !enabled;
    refs.confirmRaiseBtn.disabled = !enabled;

    if (!enabled) hideRaisePanel();
  }

  function getRaiseAmount() {
    if (!refs.raiseSlider) return 50;

    const toCall = safeAmount(currentState?.toCall);
    const balance = safeAmount(currentState?.playerBalance);
    const maxRaise = Math.max(0, balance - toCall);
    let raiseAmount = Number(refs.raiseSlider.value);

    if (!Number.isFinite(raiseAmount)) raiseAmount = 50;
    raiseAmount = Math.max(50, Math.floor(raiseAmount));
    if (maxRaise >= 50) raiseAmount = Math.min(raiseAmount, maxRaise);

    return raiseAmount;
  }

  function toggleRaisePanel() {
    if (!refs.raisePanel || refs.raiseBtn?.disabled) return;
    if (!uiInHand) return;

    const balance = safeAmount(currentState?.playerBalance);
    const toCall = safeAmount(currentState?.toCall);
    if ((balance - toCall) < 50) return;

    const visible = !refs.raisePanel.classList.contains("hidden");
    if (visible) {
      hideRaisePanel();
      return;
    }

    refs.raisePanel.classList.remove("hidden");
    syncRaisePanel();
  }

  // Messages
  function setResultMessage(message) {
    if (!refs.result) return;
    refs.result.innerText = message || "";
    positionResultAboveCommunity();
  }

  function setPlayAgainVisible(_visible) {
  }

  // Rendering
  function renderPot(state) {
    if (!refs.pot) return;
    const mainPot = safeAmount(state?.pot);
    const sidePot = safeAmount(state?.sidePot);
    if (sidePot > 0) {
      refs.pot.innerHTML = `Main Pot: ${mainPot} SEK &nbsp;|&nbsp; <span class="side-pot">Side Pot: ${sidePot} SEK</span>`;
    } else {
      refs.pot.innerText = `Pot: ${mainPot} SEK`;
    }
    positionPotUnderCommunity();
  }

  function renderBalance(balance) {
    if (!refs.balance || !refs.addMoneyBtn || !refs.logoutBtn) return;

    const safeBalance = safeAmount(balance);
    const icon = chipIconForBalance(safeBalance);
    refs.balance.innerHTML = `<img class="chip-icon" src="${icon}" alt="">Balance: ${safeBalance} SEK`;
    refs.addMoneyBtn.classList.toggle("hidden", safeBalance > 0 || uiInHand);
    refs.logoutBtn.classList.remove("hidden");
  }

  function getBlindTypeForSeat(seatIndex, state) {
    const smallBlindIndex = Number(state?.smallBlindIndex);
    const bigBlindIndex = Number(state?.bigBlindIndex);

    if (seatIndex === smallBlindIndex) return "small";
    if (seatIndex === bigBlindIndex) return "big";
    return null;
  }

  function getBlindAmountForType(type, state) {
    if (type === "small") return safeAmount(state?.smallBlind);
    if (type === "big") return safeAmount(state?.bigBlind);
    return 0;
  }

  function setCardsBlindIndicator(container, type, amount) {
    if (!container) return;

    const existing = container.querySelector(".blind-card-indicator");
    if (existing) existing.remove();
    if (!type) return;

    const chipConfig = blindChipAssets[type];
    const indicator = document.createElement("div");
    indicator.className = "blind-card-indicator";

    const img = document.createElement("img");
    img.className = "blind-seat-indicator";
    img.width = 60;
    img.height = 60;
    img.decoding = "async";
    img.src = chipConfig.src;
    img.alt = chipConfig.alt;

    const amountElement = document.createElement("span");
    amountElement.className = "blind-card-amount";
    amountElement.innerText = `${safeAmount(amount)} SEK`;

    indicator.append(img, amountElement);
    container.appendChild(indicator);
  }

  function renderBlindInfo(state) {
    if (!refs.blindInfo) return;
    refs.blindInfo.innerText = '';
  }

  function renderComputerActions(state) {
    const actions = Array.isArray(state?.computerLastActions) ? state.computerLastActions : [];
    const active = Array.isArray(state?.computerActive) ? state.computerActive : [];
    const inHand = Array.isArray(state?.computerInHand) ? state.computerInHand : [];

    const entries = [
      { action: refs.computerActionLeft, index: 0 },
      { action: refs.computerActionTop, index: 1 },
      { action: refs.computerActionRight, index: 2 },
      { action: refs.computerActionBottomRight, index: 3 }
    ];

    const isActive = (index) => active[index] !== false;
    const isFoldedThisHand = (index) => inHand[index] === false && isActive(index);
    const normalizedAction = (index) => String(actions[index] || "").toUpperCase();

    entries.forEach(({ action, index }) => {
      if (!action) return;
      if (!isActive(index)) {
        action.innerText = "OUT";
        return;
      }
      if (isFoldedThisHand(index)) {
        action.innerText = "FOLD";
        return;
      }

      const value = normalizedAction(index);
      action.innerText = value === "CHECK" || value === "CALL" || value === "RAISE" || value === "FOLD" || value === "ALL IN"
        ? value
        : "";
    });
  }

  function renderComputerBalances(state) {
    const balances = Array.isArray(state?.computerBalances) ? state.computerBalances : [];
    const active = Array.isArray(state?.computerActive) ? state.computerActive : [];
    const inHand = Array.isArray(state?.computerInHand) ? state.computerInHand : [];

    const entries = [
      { area: refs.computerAreaLeft, balance: refs.computerBalanceLeft, index: 0 },
      { area: refs.computerAreaTop, balance: refs.computerBalanceTop, index: 1 },
      { area: refs.computerAreaRight, balance: refs.computerBalanceRight, index: 2 },
      { area: refs.computerAreaBottomRight, balance: refs.computerBalanceBottomRight, index: 3 }
    ];

    const formatBalance = (value) => `Balance: ${safeAmount(value)} SEK`;
    const isActive = (index) => active[index] !== false;
    const isFoldedThisHand = (index) => inHand[index] === false && isActive(index);

    entries.forEach(({ area, balance, index }) => {
      if (balance) {
        const rawBal = isActive(index) ? balances[index] : 0;
        const icon = chipIconForBalance(rawBal);
        const label = isActive(index)
          ? `Balance: ${safeAmount(rawBal)} SEK`
          : `Balance: ${safeAmount(rawBal)} SEK (OUT)`;
        balance.innerHTML = `<img class="chip-icon" src="${icon}" alt="">${label}`;
      }

      if (area) {
        area.style.opacity = (isActive(index) && !isFoldedThisHand(index)) ? "1" : "0.6";
      }
    });
  }

  function renderBlindBadges(state) {
    const names = Array.isArray(state?.computerNames) ? state.computerNames : [];
    if (refs.playerCardsHeader) refs.playerCardsHeader.innerText = currentUsername;
    if (refs.computerHeaderLeft) refs.computerHeaderLeft.innerText = names[0] || "Computer 1";
    if (refs.computerHeaderTop) refs.computerHeaderTop.innerText = names[1] || "Computer 2";
    if (refs.computerHeaderRight) refs.computerHeaderRight.innerText = names[2] || "Computer 3";
    if (refs.computerHeaderBottomRight) refs.computerHeaderBottomRight.innerText = names[3] || "Computer 4";

    setCardsBlindIndicator(
      refs.playerCardsRow,
      getBlindTypeForSeat(0, state),
      getBlindAmountForType(getBlindTypeForSeat(0, state), state)
    );
    setCardsBlindIndicator(
      refs.computerCardsLeft,
      getBlindTypeForSeat(1, state),
      getBlindAmountForType(getBlindTypeForSeat(1, state), state)
    );
    setCardsBlindIndicator(
      refs.computerCardsTop,
      getBlindTypeForSeat(2, state),
      getBlindAmountForType(getBlindTypeForSeat(2, state), state)
    );
    setCardsBlindIndicator(
      refs.computerCardsRight,
      getBlindTypeForSeat(3, state),
      getBlindAmountForType(getBlindTypeForSeat(3, state), state)
    );
    setCardsBlindIndicator(
      refs.computerCardsBottomRight,
      getBlindTypeForSeat(4, state),
      getBlindAmountForType(getBlindTypeForSeat(4, state), state)
    );
  }

  // Controls
  function syncActionAvailability() {
    const inHand = !!currentState?.inHand;
    const toCall = safeAmount(currentState?.toCall);
    const balance = safeAmount(currentState?.playerBalance);
    const playerAllIn = !!currentState?.playerAllIn;
    const canRaise = (balance - toCall) >= 50;

    // Update Call button label to reflect all-in when player can't fully cover.
    if (refs.callBtn) {
      if (inHand && toCall > 0 && balance < toCall && balance > 0) {
        refs.callBtn.innerText = `Call (All-in: ${balance})`;
      } else {
        refs.callBtn.innerText = "Call";
      }
    }

    if (refs.checkBtn) refs.checkBtn.disabled = !inHand || (toCall > 0 && !playerAllIn);
    if (refs.callBtn) refs.callBtn.disabled = !inHand || toCall <= 0 || playerAllIn;
    if (refs.raiseBtn) refs.raiseBtn.disabled = !inHand || !canRaise || playerAllIn;
    if (refs.foldBtn) refs.foldBtn.disabled = !inHand || playerAllIn;
    if (refs.dealBtn) refs.dealBtn.disabled = inHand;

    if (!inHand || refs.raisePanel?.classList.contains("hidden")) {
      if (refs.confirmRaiseBtn) refs.confirmRaiseBtn.disabled = true;
      if (refs.raiseSlider) refs.raiseSlider.disabled = true;
      if (!inHand) hideRaisePanel();
      return;
    }

    syncRaisePanel();
  }

  function clearBoard() {
    showCards(refs.playerCards, []);
    showCards(refs.computerCardsLeft, [], 2);
    showCards(refs.computerCardsTop, [], 2);
    showCards(refs.computerCardsRight, [], 2);
    showCards(refs.computerCardsBottomRight, [], 2);
    showCards(refs.communityCards, [], 5);
  }

  function renderGame(state, { username } = {}) {
    currentState = state || null;
    uiInHand = !!state?.inHand;
    currentUsername = String(username || currentUsername || "You").trim() || "You";

    showGameView();

    showCards(refs.playerCards, state?.playerHand || []);
    const hands = Array.isArray(state?.computerHands) ? state.computerHands : [];
    showCards(refs.computerCardsLeft, hands[0] || [], 2);
    showCards(refs.computerCardsTop, hands[1] || [], 2);
    showCards(refs.computerCardsRight, hands[2] || [], 2);
    showCards(refs.computerCardsBottomRight, hands[3] || [], 2);
    showCards(refs.communityCards, state?.communityCards || [], 5);

    renderPot(state);
    renderBalance(state?.playerBalance || 0);
    renderBlindInfo(state);
    renderBlindBadges(state);
    renderComputerBalances(state);
    renderComputerActions(state);
    syncActionAvailability();
    repositionLayout();
  }

  // Views
  function showLoginView() {
    if (refs.login) refs.login.classList.remove("hidden");
    if (refs.game) refs.game.classList.add("hidden");
  }

  function showGameView() {
    if (refs.login) refs.login.classList.add("hidden");
    if (refs.game) refs.game.classList.remove("hidden");
  }

  function showLoggedOut() {
    currentState = null;
    currentUsername = "You";
    uiInHand = false;

    showLoginView();
    clearCredentials();
    clearBoard();
    renderBalance(0);
    if (refs.logoutBtn) refs.logoutBtn.classList.add("hidden");
    renderPot({ pot: 0, sidePot: 0 });
    renderBlindInfo({ smallBlind: 10, bigBlind: 20 });
    renderBlindBadges({});
    renderComputerBalances({});
    renderComputerActions({});
    setResultMessage("");
    setPlayAgainVisible(false);
    hideRaisePanel();
    syncActionAvailability();
  }

  // Credentials
  function getCredentials() {
    return {
      username: refs.username?.value || "",
      password: refs.password?.value || ""
    };
  }

  function clearCredentials() {
    if (refs.username) refs.username.value = "";
    if (refs.password) refs.password.value = "";
  }

  // Initialization
  function init(handlers = {}) {
    bindClick(refs.loginBtn, () => handlers.onLogin?.(getCredentials()));
    bindClick(refs.registerBtn, () => handlers.onRegister?.(getCredentials()));
    bindClick(refs.addMoneyBtn, () => handlers.onAddMoney?.());
    bindClick(refs.logoutBtn, () => handlers.onLogout?.());
    bindClick(refs.playAgainBtn, () => handlers.onPlayAgain?.());
    bindClick(refs.dealBtn, () => handlers.onDeal?.());
    bindClick(refs.checkBtn, () => handlers.onCheck?.());
    bindClick(refs.callBtn, () => handlers.onCall?.());
    bindClick(refs.raiseBtn, () => handlers.onRaiseToggle?.());
    bindClick(refs.confirmRaiseBtn, () => handlers.onRaiseConfirm?.(getRaiseAmount()));
    bindClick(refs.foldBtn, () => handlers.onFold?.());

    if (refs.raiseSlider) {
      refs.raiseSlider.addEventListener("input", () => syncRaisePanel());
    }

    if (refs.password) {
      refs.password.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        handlers.onLogin?.(getCredentials());
      });
    }

    window.addEventListener("resize", repositionLayout);
    showLoggedOut();
    repositionLayout();
  }

  // Exports
  return {
    getRaiseAmount,
    hideRaisePanel,
    init,
    clearCredentials,
    renderGame,
    setPlayAgainVisible,
    setResultMessage,
    showLoggedOut,
    toggleRaisePanel
  };
})();

window.PokerUI = PokerUI;
