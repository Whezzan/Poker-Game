(() => {
  const Auth = window.PokerAuth;
  const UI = window.PokerUI;
  const GameEngine = window.PokerGameEngine;

  if (!Auth || !UI || !GameEngine) {
    throw new Error("Poker app failed to initialize.");
  }

  // Setup
  const game = new GameEngine(Math.random, { computerCount: 4 });
  window.pokerGame = game;

  // Persistence
  function getCurrentUser() {
    return Auth.getCurrentUser();
  }

  function getComputerBalancesKey() {
    const user = getCurrentUser();
    return user ? `pokerComputerBalances_${user.username}` : null;
  }

  function saveComputerBalances(balances) {
    const key = getComputerBalancesKey();
    if (!key || !Array.isArray(balances)) return;
    localStorage.setItem(key, JSON.stringify(balances));
  }

  function loadComputerBalances() {
    const key = getComputerBalancesKey();
    if (!key) return null;
    try {
      const parsed = JSON.parse(localStorage.getItem(key));
      return Array.isArray(parsed) ? parsed : null;
    } catch { return null; }
  }

  // Bootstrap
  function persistBalanceFromState(state) {
    if (!state) return null;
    saveComputerBalances(state.computerBalances);
    return Auth.updateCurrentUserBalance(state.playerBalance);
  }

  function renderCurrentState(state, user = getCurrentUser()) {
    UI.renderGame(state, { username: user?.username || "You" });
  }

  function bootstrapGameForUser(user) {
    const safeUser = Auth.saveCurrentUser(user);
    if (!safeUser) return;

    const savedComputerBalances = loadComputerBalances();
    game.resetTable({ playerBalance: safeUser.balance, computerBalances: savedComputerBalances });
    UI.clearCredentials();
    UI.setResultMessage("");
    renderCurrentState(game.getPublicState({ revealComputer: false }), safeUser);
  }

  function handleAuthResult(result) {
    if (!result?.ok) {
      alert(result?.error || "Something went wrong.");
      return;
    }

    bootstrapGameForUser(result.user);
  }

  // Actions
  function runGameAction(action) {
    if (!action) return;

    if (action.ok === false) {
      alert(action.error || "Something went wrong.");
      const state = game.getPublicState({ revealComputer: false });
      persistBalanceFromState(state);
      renderCurrentState(state);
      if (Number(state?.activeComputerCount) <= 0) {
        UI.setPlayAgainVisible(true);
      }
      return;
    }

    const syncedUser = persistBalanceFromState(action.state);
    UI.setResultMessage(action.message || "");
    UI.setPlayAgainVisible(!action.state?.inHand);
    renderCurrentState(action.state, syncedUser || getCurrentUser());
  }

  // Authentication
  function handleLogin(credentials) {
    handleAuthResult(Auth.login(credentials));
  }

  function handleRegister(credentials) {
    handleAuthResult(Auth.register(credentials));
  }

  // Management
  function handleAddMoney() {
    const currentState = game.getPublicState({ revealComputer: false });
    if (currentState.inHand) return;

    const updatedUser = Auth.addMoney();
    if (!updatedUser) return;

    game.setPlayerBalance(updatedUser.balance);
    renderCurrentState(game.getPublicState({ revealComputer: false }), updatedUser);
  }

  function handleLogout() {
    persistBalanceFromState(game.getPublicState({ revealComputer: false }));
    Auth.logout();
    game.resetTable({ playerBalance: Auth.DEFAULT_BALANCE });
    UI.showLoggedOut();
  }

  function handlePlayAgain() {
    const resetUser = Auth.resetCurrentUserBalance();
    if (!resetUser) return;

    const key = getComputerBalancesKey();
    if (key) localStorage.removeItem(key);

    game.resetTable({ playerBalance: resetUser.balance });
    UI.setResultMessage("");
    renderCurrentState(game.getPublicState({ revealComputer: false }), resetUser);
  }

  // Game
  function handleDeal() {
    const user = getCurrentUser();
    if (!user) {
      alert("You must log in first.");
      return;
    }

    game.setPlayerBalance(user.balance);
    UI.hideRaisePanel();
    UI.setResultMessage("");
    UI.setPlayAgainVisible(false);
    runGameAction(game.startHand());
  }

  function handleCheck() {
    UI.hideRaisePanel();
    runGameAction(game.check());
  }

  function handleCall() {
    UI.hideRaisePanel();
    runGameAction(game.call());
  }

  function handleRaiseToggle() {
    UI.toggleRaisePanel();
  }

  function handleRaiseConfirm(raiseAmount) {
    UI.hideRaisePanel();
    runGameAction(game.raise(raiseAmount));
  }

  function handleFold() {
    UI.hideRaisePanel();
    runGameAction(game.fold());
  }

  // Binding
  UI.init({
    onLogin: handleLogin,
    onRegister: handleRegister,
    onAddMoney: handleAddMoney,
    onLogout: handleLogout,
    onPlayAgain: handlePlayAgain,
    onDeal: handleDeal,
    onCheck: handleCheck,
    onCall: handleCall,
    onRaiseToggle: handleRaiseToggle,
    onRaiseConfirm: handleRaiseConfirm,
    onFold: handleFold
  });

  // Startup
  Auth.logout();
  UI.showLoggedOut();
})();
