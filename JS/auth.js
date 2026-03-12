
// Skapa en array med användare och spara i localStorage (seedar bara om den saknas).

const defaultUsers = [
  { username: "admin", password: "1234", balance: 1000 }
];

if (!localStorage.getItem("users")) {
  localStorage.setItem("users", JSON.stringify(defaultUsers));
}

function enterGameAs(user) {
  localStorage.setItem("currentUser", JSON.stringify(user));
  document.getElementById("login").classList.add("hidden");
  document.getElementById("game").classList.remove("hidden");

  // Position fixed play-area panels after #game is visible.
  requestAnimationFrame(() => {
    if (typeof positionComputerAreasAroundCommunity === "function") {
      positionComputerAreasAroundCommunity();
    }
    if (typeof positionPotUnderCommunity === "function") {
      positionPotUnderCommunity();
    }
    if (typeof positionResultAboveCommunity === "function") {
      positionResultAboveCommunity();
    }
  });

  if (typeof setActionsEnabled === "function") {
    setActionsEnabled(false);
  }
  if (typeof updatePot === "function") {
    updatePot(0);
  }
  if (typeof showCards === "function") {
    showCards("playerCards", []);
    showCards("computerCardsTop", [], 2);
    showCards("computerCardsLeft", [], 2);
    showCards("computerCardsRight", [], 2);
    showCards("communityCards", [], 5);
  }

  if (window.pokerGame && typeof updateBlindBadges === "function") {
    const state = window.pokerGame.getPublicState({ revealComputer: false });
    updateBlindBadges(state);
    if (typeof updateBlindInfo === "function") updateBlindInfo(state);
    if (typeof updateComputerBalances === "function") updateComputerBalances(state);
    if (typeof updateComputerActions === "function") updateComputerActions(state);
  }
  document.getElementById("result").innerText = "";
  document.getElementById("playAgainBtn").classList.add("hidden");

  if (typeof updateBalance === "function") {
    updateBalance();
  }
}

// Inloggningsfunktion

document.getElementById("loginBtn").addEventListener("click", () => {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const storedUsers = JSON.parse(localStorage.getItem("users")) || [];
  const user = storedUsers.find(u => u.username === username && u.password === password);

  if (user) {
    enterGameAs(user);
  } else {
    alert("Incorrect username or password");
  }
});

// Logga in med Enter i lösenordsfältet
document.getElementById("password").addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  e.preventDefault();
  document.getElementById("loginBtn").click();
});

// Skapa konto
document.getElementById("registerBtn").addEventListener("click", () => {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  if (!username || !password) {
    alert("Enter both a username and a password.");
    return;
  }

  const storedUsers = JSON.parse(localStorage.getItem("users")) || [];
  const exists = storedUsers.some(u => (u.username || "").toLowerCase() === username.toLowerCase());
  if (exists) {
    alert("That username is already taken. Please choose another.");
    return;
  }

  const newUser = { username, password, balance: 1000 };
  storedUsers.push(newUser);
  localStorage.setItem("users", JSON.stringify(storedUsers));

  enterGameAs(newUser);
});