const PokerAuth = (() => {
  const STORAGE_KEYS = {
    users: "users",
    currentUser: "currentUser"
  };
  const DEFAULT_BALANCE = 1000;
  const defaultUsers = [
    { username: "admin", password: "1234", balance: DEFAULT_BALANCE }
  ];

  // Utilities
  function safeParse(value, fallback) {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function normalizeBalance(balance) {
    const numericBalance = Number(balance);
    if (!Number.isFinite(numericBalance)) return DEFAULT_BALANCE;
    return Math.max(0, Math.floor(numericBalance));
  }

  function sanitizeUser(user) {
    if (!user || typeof user !== "object") return null;

    const username = String(user.username || "").trim();
    const password = String(user.password || "");
    if (!username || !password) return null;

    return {
      username,
      password,
      balance: normalizeBalance(user.balance)
    };
  }

  // Storage
  function readUsers() {
    const parsed = safeParse(localStorage.getItem(STORAGE_KEYS.users), []);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(sanitizeUser).filter(Boolean);
  }

  function writeUsers(users) {
    const safeUsers = Array.isArray(users)
      ? users.map(sanitizeUser).filter(Boolean)
      : [];
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(safeUsers));
    return safeUsers;
  }

  function seedDefaultUsers() {
    if (!localStorage.getItem(STORAGE_KEYS.users)) {
      writeUsers(defaultUsers);
    }
  }

  // Session
  function findUserIndex(users, username) {
    return users.findIndex((user) => user.username.toLowerCase() === username.toLowerCase());
  }

  function getCurrentUser() {
    return sanitizeUser(safeParse(localStorage.getItem(STORAGE_KEYS.currentUser), null));
  }

  function saveCurrentUser(user) {
    const safeUser = sanitizeUser(user);
    if (!safeUser) return null;

    localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(safeUser));

    const users = readUsers();
    const userIndex = findUserIndex(users, safeUser.username);
    if (userIndex === -1) {
      users.push(safeUser);
    } else {
      users[userIndex] = { ...users[userIndex], ...safeUser };
    }
    writeUsers(users);

    return safeUser;
  }

  function clearCurrentUser() {
    localStorage.removeItem(STORAGE_KEYS.currentUser);
  }

  function logout() {
    clearCurrentUser();
    return { ok: true };
  }

  function hasActiveSession() {
    return !!getCurrentUser();
  }

  // Authentication
  function login({ username, password }) {
    const trimmedUsername = String(username || "").trim();
    const rawPassword = String(password || "");

    if (!trimmedUsername || !rawPassword) {
      return { ok: false, error: "Enter both a username and a password." };
    }

    const users = readUsers();
    const user = users.find(
      (candidate) => candidate.username === trimmedUsername && candidate.password === rawPassword
    );

    if (!user) {
      return { ok: false, error: "Incorrect username or password" };
    }

    return { ok: true, user: saveCurrentUser(user) };
  }

  function register({ username, password }) {
    const trimmedUsername = String(username || "").trim();
    const rawPassword = String(password || "");

    if (!trimmedUsername || !rawPassword) {
      return { ok: false, error: "Enter both a username and a password." };
    }

    const users = readUsers();
    if (findUserIndex(users, trimmedUsername) !== -1) {
      return { ok: false, error: "That username is already taken. Please choose another." };
    }

    const user = sanitizeUser({
      username: trimmedUsername,
      password: rawPassword,
      balance: DEFAULT_BALANCE
    });

    users.push(user);
    writeUsers(users);

    return { ok: true, user: saveCurrentUser(user) };
  }

  // Balance
  function updateCurrentUserBalance(balance) {
    const currentUser = getCurrentUser();
    if (!currentUser) return null;

    currentUser.balance = normalizeBalance(balance);
    return saveCurrentUser(currentUser);
  }

  function addMoney(amount = DEFAULT_BALANCE) {
    const currentUser = getCurrentUser();
    if (!currentUser) return null;

    currentUser.balance = normalizeBalance(currentUser.balance + normalizeBalance(amount));
    return saveCurrentUser(currentUser);
  }

  function resetCurrentUserBalance() {
    return updateCurrentUserBalance(DEFAULT_BALANCE);
  }

  // Bootstrap
  seedDefaultUsers();

  // Exports
  return {
    DEFAULT_BALANCE,
    addMoney,
    clearCurrentUser,
    getCurrentUser,
    hasActiveSession,
    login,
    logout,
    register,
    saveCurrentUser,
    updateCurrentUserBalance,
    resetCurrentUserBalance
  };
})();

window.PokerAuth = PokerAuth;
