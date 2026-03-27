
// Pokermotor //

// Dependencies
const HandEvaluator = window.PokerHandEvaluator;
if (!HandEvaluator) {
  throw new Error("Poker hand evaluator failed to initialize.");
}

const { compareHands, evaluateHand, getAllCards, handRankName } = HandEvaluator;

// Constants
const suits = ["H", "D", "C", "S"];
const values = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const valueMap = {
  "2": 2, "3": 3, "4": 4, "5": 5,
  "6": 6, "7": 7, "8": 8, "9": 9,
  "10": 10, "J": 11, "Q": 12, "K": 13, "A": 14
};

// Deck
function createDeck() {
  const deck = [];
  for (const suit of suits) {
    for (const value of values) {
      deck.push({
        value,
        suit,
        rank: valueMap[value],
        img: `assets/cards/${value}${suit}.png`
      });
    }
  }
  return deck;
}
// Fisher-Yates shuffle
function shuffleDeck(deck, rng) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// Engine
class PokerGameEngine {
  constructor(rng = Math.random, { computerCount = 3 } = {}) {
    this.rng = rng;
    this.computerCount = Number.isFinite(computerCount) ? Math.max(1, Math.floor(computerCount)) : 3;
    this.playerCount = 1 + this.computerCount;
    this.startingBalance = 1000;
    this.computerNames = Array.from({ length: this.computerCount }, (_, i) => `Computer ${i + 1}`);
    this.resetTable();
  }

  getComputerName(index) {
    return this.computerNames?.[index] || `Computer ${index + 1}`;
  }

  // Tracking per-hand participation and last action (for UI).
  resetHandTracking() {
    
    this.computerInHand = Array.from({ length: this.computerCount }, (_, i) => !!this.computerActive?.[i]);
    this.computerLastActions = Array.from({ length: this.computerCount }, () => "");
    this.computerPotContributions = Array.from({ length: this.computerCount }, () => 0);
  }

  // Balances
  normalizeChipAmount(amount, fallback = 0) {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount)) return fallback;
    return Math.max(0, Math.floor(numericAmount));
  }

  setPlayerBalance(balance) {
    this.playerBalance = this.normalizeChipAmount(balance, this.startingBalance);
    return this.playerBalance;
  }

  adjustPlayerBalance(delta) {
    this.playerBalance = this.normalizeChipAmount(this.playerBalance + delta);
    return this.playerBalance;
  }

  canPlayerAfford(amount) {
    return this.normalizeChipAmount(this.playerBalance) >= this.normalizeChipAmount(amount);
  }

  // Queries
  getActiveComputerIndexesInHand() {
    const indexes = [];
    for (let i = 0; i < this.computerCount; i++) {
      if (!this.computerActive?.[i]) continue;
      if (this.computerInHand?.[i] === false) continue;
      if (!this.computerHands?.[i] || this.computerHands[i].length < 2) continue;
      indexes.push(i);
    }
    return indexes;
  }

  getWinningComputerIndexes(communityCards = this.communityCards) {
    const contestants = this.getActiveComputerIndexesInHand();
    if (!contestants.length) return [];

    const winners = [contestants[0]];
    for (let i = 1; i < contestants.length; i++) {
      const seatIndex = contestants[i];
      const comparison = compareHands(
        this.computerHands[seatIndex],
        this.computerHands[winners[0]],
        communityCards
      );

      if (comparison > 0) {
        winners.length = 0;
        winners.push(seatIndex);
        continue;
      }

      if (comparison === 0) {
        winners.push(seatIndex);
      }
    }

    return winners;
  }

  // Payouts
  distributePot(totalAmount, winningSeatIndexes) {
    const safeTotal = this.normalizeChipAmount(totalAmount);
    const winners = Array.isArray(winningSeatIndexes)
      ? [...winningSeatIndexes].filter((seatIndex) => Number.isInteger(seatIndex) && seatIndex >= 0)
      : [];

    if (!winners.length || safeTotal <= 0) return;

    winners.sort((a, b) => a - b);
    const baseShare = Math.floor(safeTotal / winners.length);
    let remainder = safeTotal % winners.length;

    winners.forEach((seatIndex) => {
      const share = baseShare + (remainder > 0 ? 1 : 0);
      remainder = Math.max(0, remainder - 1);
      if (seatIndex === 0) {
        this.adjustPlayerBalance(share);
        return;
      }

      const computerIndex = seatIndex - 1;
      if (computerIndex >= 0 && computerIndex < this.computerBalances.length) {
        this.computerBalances[computerIndex] += share;
      }
    });
  }

  // Helper
  formatComputerList(computerIndexes) {
    const labels = computerIndexes.map((index) => this.getComputerName(index));
    if (!labels.length) return "";
    if (labels.length === 1) return labels[0];
    if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
    return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
  }

  isSeatActive(idx) {
    if (idx === 0) return true;
    const ci = idx - 1;
    return !!this.computerActive?.[ci];
  }

  getActiveComputerCount() {
    return (this.computerActive || []).filter(Boolean).length;
  }

  getActivePlayerCount() {
    return 1 + this.getActiveComputerCount();
  }

  // Navigation
  nextActiveIndex(fromIdx) {
    const max = this.playerCount;
    if (max <= 1) return 0;
    let idx = fromIdx;
    for (let i = 0; i < max; i++) {
      idx = (idx + 1) % max;
      if (this.isSeatActive(idx)) return idx;
    }
    return 0;
  }

  prevActiveIndex(fromIdx) {
    const max = this.playerCount;
    if (max <= 1) return 0;
    let idx = fromIdx;
    for (let i = 0; i < max; i++) {
      idx = (idx - 1 + max) % max;
      if (this.isSeatActive(idx)) return idx;
    }
    return 0;
  }

  ensureBigBlindActive() {
    if (!this.isSeatActive(this.bigBlindIndex)) {
      this.bigBlindIndex = this.prevActiveIndex(this.bigBlindIndex);
    }
  }

  // Elimination
  eliminateComputerBySeat(seatIdx) {
    if (!Number.isFinite(seatIdx) || seatIdx <= 0) return;
    const ci = seatIdx - 1;
    if (!this.computerActive?.[ci]) return;
    this.computerActive[ci] = false;
    if (Array.isArray(this.computerInHand) && ci < this.computerInHand.length) {
      this.computerInHand[ci] = false;
    }
    if (Array.isArray(this.computerLastActions) && ci < this.computerLastActions.length) {
      this.computerLastActions[ci] = "";
    }
    if (Array.isArray(this.computerBalances) && ci < this.computerBalances.length) {
      this.computerBalances[ci] = 0;
    }
    if (Array.isArray(this.computerHands) && ci < this.computerHands.length) {
      this.computerHands[ci] = [];
    }
  }

  pruneBrokeComputers() {
    if (!Array.isArray(this.computerBalances)) return;
    if (!Array.isArray(this.computerActive)) return;

    for (let i = 0; i < this.computerCount; i++) {
      const bal = Number(this.computerBalances[i]);
      const safe = Number.isFinite(bal) ? bal : 0;
      if (this.computerActive[i] && safe <= 0) {
        this.computerActive[i] = false;
        if (Array.isArray(this.computerInHand) && i < this.computerInHand.length) this.computerInHand[i] = false;
        if (Array.isArray(this.computerLastActions) && i < this.computerLastActions.length) this.computerLastActions[i] = "";
        this.computerBalances[i] = 0;
        if (Array.isArray(this.computerHands) && i < this.computerHands.length) this.computerHands[i] = [];
      }
    }
  }

  // Blinds
  getSmallBlindIndex() {
    return (this.bigBlindIndex + 1) % this.playerCount;
  }

  doubleBlindsIfOrbitComplete() {
    this.handsSinceBlindIncrease += 1;
    if (this.handsSinceBlindIncrease >= this.getActivePlayerCount()) {
      this.handsSinceBlindIncrease = 0;
      this.smallBlind = this.smallBlind * 2;
      this.bigBlind = this.bigBlind * 2;
    }
  }

  advanceBlinds() {
    this.handNumber += 1;
    this.ensureBigBlindActive();
    this.bigBlindIndex = this.nextActiveIndex(this.bigBlindIndex);
    this.doubleBlindsIfOrbitComplete();
  }

  // Initialization
  resetTable({ playerBalance, computerBalances } = {}) {
    this.deck = [];
    this.playerHand = [];
    this.computerHands = Array.from({ length: this.computerCount }, () => []);
    this.communityCards = [];
    this.round = 0;
    this.pot = 0;
    this.inHand = false;

    // when > 0, player must Call or Fold before advancing.
    this.toCall = 0;
    this.lastComputerRaiserIndex = -1;
    this.lastComputerRaiseAmount = 0;
    this.raiseStage = -1;

    // Side pot tracking (created when player goes all-in).
    this.playerAllIn = false;
    this.sidePot = 0;
    this.sidePotSeats = []; // seat indexes eligible to win the side pot...

    // Balances 
    this.playerBalance = this.normalizeChipAmount(playerBalance, this.startingBalance);
    if (Array.isArray(computerBalances) && computerBalances.length === this.computerCount) {
      this.computerBalances = computerBalances.map(b => this.normalizeChipAmount(b));
      this.computerActive = this.computerBalances.map(b => b > 0);
    } else {
      this.computerBalances = Array.from({ length: this.computerCount }, () => this.startingBalance);
      this.computerActive = Array.from({ length: this.computerCount }, () => true);
    }

    this.resetHandTracking();

    // Blinds
    this.handNumber = 0;
    this.handsSinceBlindIncrease = 0;
    this.smallBlind = 10;
    this.bigBlind = 20;
    this.bigBlindIndex = this.playerCount > 1 ? (this.playerCount - 1) : 0;
  }

  // State
  getPublicState({ revealComputer = false } = {}) {
    const hands = Array.isArray(this.computerHands) ? this.computerHands : [];
    const safeHands = hands.length
      ? hands
      : Array.from({ length: this.computerCount }, () => []);

    const smallBlindIndex = this.getSmallBlindIndex();

    return {
      inHand: this.inHand,
      round: this.round,
      pot: this.pot,
      toCall: Number.isFinite(this.toCall) ? Math.max(0, Math.floor(this.toCall)) : 0,
      lastComputerRaiseAmount: Number.isFinite(this.lastComputerRaiseAmount) ? Math.max(0, Math.floor(this.lastComputerRaiseAmount)) : 0,
      lastComputerRaiser: Number.isFinite(this.lastComputerRaiserIndex) && this.lastComputerRaiserIndex >= 0
        ? (this.lastComputerRaiserIndex + 1)
        : null,
      handNumber: this.handNumber,
      smallBlind: this.smallBlind,
      bigBlind: this.bigBlind,
      smallBlindIndex,
      bigBlindIndex: this.bigBlindIndex,
      playerCount: this.playerCount,
      playerBalance: this.playerBalance,
      computerBalances: Array.isArray(this.computerBalances) ? [...this.computerBalances] : [],
      computerActive: Array.isArray(this.computerActive) ? [...this.computerActive] : [],
      computerInHand: Array.isArray(this.computerInHand) ? [...this.computerInHand] : [],
      computerLastActions: Array.isArray(this.computerLastActions) ? [...this.computerLastActions] : [],
      activeComputerCount: this.getActiveComputerCount(),
      activePlayerCount: this.getActivePlayerCount(),
      playerHand: [...this.playerHand],
      computerHand: revealComputer ? [...(safeHands[0] || [])] : [],
      computerHands: revealComputer ? safeHands.map(h => [...h]) : safeHands.map(() => []),
      computerNames: [...this.computerNames],
      communityCards: [...this.communityCards],
      revealComputer,
      playerAllIn: !!this.playerAllIn,
      sidePot: Number.isFinite(this.sidePot) ? Math.max(0, Math.floor(this.sidePot)) : 0,
      sidePotSeats: Array.isArray(this.sidePotSeats) ? [...this.sidePotSeats] : []
    };
  }

  // Dealing
  startHand() {
    if (this.inHand) return { ok: false, error: "Hand already in progress." };

    this.toCall = 0;
    this.lastComputerRaiserIndex = -1;
    this.lastComputerRaiseAmount = 0;
    this.raiseStage = -1;
    this.playerAllIn = false;
    this.sidePot = 0;
    this.sidePotSeats = [];

    this.resetHandTracking();
    if (Array.isArray(this.computerLastActions)) {
      for (let i = 0; i < this.computerCount; i++) {
        if (this.computerActive?.[i]) this.computerLastActions[i] = "CHECK";
      }
    }


    this.pruneBrokeComputers();
    this.ensureBigBlindActive();
    if (this.getActiveComputerCount() <= 0) {
      return { ok: false, error: "Game over. All computers are out." };
    }


    let guard = 0;
    while (guard++ < 20 && this.getActiveComputerCount() > 0) {
      const sbIdx = this.getSmallBlindIndex();
      const bbIdx = this.bigBlindIndex;

      let eliminated = false;
      if (sbIdx > 0) {
        const ci = sbIdx - 1;
        const bal = Number(this.computerBalances?.[ci]);
        const safe = Number.isFinite(bal) ? bal : 0;
        if (safe < this.smallBlind) {
          this.eliminateComputerBySeat(sbIdx);
          this.pruneBrokeComputers();
          this.ensureBigBlindActive();
          eliminated = true;
        }
      }

      if (!eliminated && bbIdx > 0) {
        const ci = bbIdx - 1;
        const bal = Number(this.computerBalances?.[ci]);
        const safe = Number.isFinite(bal) ? bal : 0;
        if (safe < this.bigBlind) {
          this.eliminateComputerBySeat(bbIdx);
          this.pruneBrokeComputers();
          this.ensureBigBlindActive();
          eliminated = true;
        }
      }

      if (!eliminated) break;
    }

    if (this.getActiveComputerCount() <= 0) {
      return { ok: false, error: "Game over. All computers are out." };
    }

    const smallBlindIndex = this.getSmallBlindIndex();
    const bigBlindIndex = this.bigBlindIndex;
    let playerBlind = 0;

    if (smallBlindIndex === 0) playerBlind += this.smallBlind;
    if (bigBlindIndex === 0) playerBlind += this.bigBlind;

    if (!this.canPlayerAfford(playerBlind)) {
      return { ok: false, error: "You don't have enough money to post the blind." };
    }

    this.deck = shuffleDeck(createDeck(), this.rng); // Fisher-Yates shuffle.
    this.playerHand = [this.deck.pop(), this.deck.pop()];
    this.computerHands = Array.from({ length: this.computerCount }, (_, i) => {
      if (!this.computerActive?.[i]) return [];
      return [this.deck.pop(), this.deck.pop()];
    });
    this.communityCards = [];
    this.round = 0;

    // Post blinds.
    this.pot = 0;
    this.inHand = true;

    if (smallBlindIndex === 0) {
      this.adjustPlayerBalance(-this.smallBlind);
      this.pot += this.smallBlind;
    } else {
      const ci = smallBlindIndex - 1;
      if (this.computerActive?.[ci]) {
        this.computerBalances[ci] -= this.smallBlind;
        this.pot += this.smallBlind;
        this.computerPotContributions[ci] += this.smallBlind;
        if (Array.isArray(this.computerLastActions) && ci < this.computerLastActions.length) {
          this.computerLastActions[ci] = "CALL";
        }
      }
    }

    if (bigBlindIndex === 0) {
      this.adjustPlayerBalance(-this.bigBlind);
      this.pot += this.bigBlind;
    } else {
      const ci = bigBlindIndex - 1;
      if (this.computerActive?.[ci]) {
        this.computerBalances[ci] -= this.bigBlind;
        this.pot += this.bigBlind;
        this.computerPotContributions[ci] += this.bigBlind;
        if (Array.isArray(this.computerLastActions) && ci < this.computerLastActions.length) {
          this.computerLastActions[ci] = "CALL";
        }
      }
    }

    return {
      ok: true,
      balanceDelta: -playerBlind,
      message: "",
      state: this.getPublicState({ revealComputer: false })
    };
  }

  // AI
  shouldComputerAllIn(computerIndex) {
    const hand = this.computerHands?.[computerIndex] || [];
    const allCards = getAllCards(hand, this.communityCards || []);
    const score = allCards.length >= 2 ? evaluateHand(allCards) : 0;

    const bal = Number(this.computerBalances?.[computerIndex]) || 0;
    const contributed = Number(this.computerPotContributions?.[computerIndex]) || 0;

    if (this.rng() < 0.7) {
      // Hand-strength based
      const allInChance = score >= 6 ? 0.9 : score >= 4 ? 0.5 : score >= 2 ? 0.2 : score >= 1 ? 0.1 : 0.03;
      return this.rng() < allInChance;
    } else {
      // Pot-commitment based
      const totalInvested = contributed + bal;
      const commitmentRatio = totalInvested > 0 ? contributed / totalInvested : 0;
      const allInChance = commitmentRatio > 0.6 ? 0.8 : commitmentRatio > 0.4 ? 0.5 : commitmentRatio > 0.2 ? 0.25 : 0.05;
      return this.rng() < allInChance;
    }
  }


  computeRaiseAmount(computerIndex, minRaise) {
    const bal = Number(this.computerBalances?.[computerIndex]);
    const balance = Number.isFinite(bal) ? Math.floor(bal) : 0;
    const minAmt = Math.max(minRaise, 50);
    const hand = this.computerHands?.[computerIndex] || [];
    const allCards = getAllCards(hand, this.communityCards || []);
    const score = allCards.length >= 2 ? evaluateHand(allCards) : 0; // 0 (high card) to 8 (straight flush)

    let amount;
    if (this.rng() < 0.5) {
      const cap = Math.min(balance, minAmt * 3);
      amount = cap <= minAmt ? minAmt : minAmt + Math.floor(this.rng() * (cap - minAmt));
    } else {
      const multiplier = 1 + (score / 8) * 5;
      amount = Math.floor(minAmt * multiplier);
    }

    return Math.min(Math.max(amount, minAmt), balance);
  }

  maybeComputerRaise() {
    if (!this.inHand) return null;
    if ((Number(this.toCall) || 0) > 0) return null;
    if (this.round >= 3) return null; 
    if (this.raiseStage === this.round) return null; 
    if (this.rng() >= 0.25) return null;

    const minRaise = Math.max(50, Number(this.bigBlind) || 0);
    const raisers = [];
    for (let i = 0; i < this.computerCount; i++) {
      if (!this.computerActive?.[i]) continue;
      if (this.computerInHand?.[i] === false) continue;
      const bal = Number(this.computerBalances?.[i]);
      const safe = Number.isFinite(bal) ? Math.floor(bal) : 0;
      if (safe >= minRaise) raisers.push(i);
    }
    if (!raisers.length) return null;

    const idx = raisers[Math.floor(this.rng() * raisers.length)];
    const goAllIn = this.shouldComputerAllIn(idx);
    const bal = Number(this.computerBalances?.[idx]) || 0;
    const amount = goAllIn ? bal : this.computeRaiseAmount(idx, minRaise);

    this.computerBalances[idx] -= amount;
    this.pot += amount;
    this.computerPotContributions[idx] += amount;
    this.toCall = amount;
    this.lastComputerRaiserIndex = idx;
    this.lastComputerRaiseAmount = amount;
    this.raiseStage = this.round;


    if (Array.isArray(this.computerLastActions)) {
      for (let i = 0; i < this.computerCount; i++) {
        if (i === idx) continue;
        if (!this.computerActive?.[i]) continue;
        if (this.computerInHand?.[i] === false) continue;
        this.computerLastActions[i] = "CHECK";
      }
    }

    if (Array.isArray(this.computerLastActions) && idx < this.computerLastActions.length) {
      this.computerLastActions[idx] = goAllIn ? "ALL IN" : "RAISE";
    }

    return { idx, amount, allIn: goAllIn };
  }

  maybeComputerSidePotRaise() {
    if (!this.inHand) return null;
    if (this.round >= 3) return null;
    if (this.raiseStage === this.round) return null;
    if (this.rng() >= 0.25) return null;

    const minRaise = Math.max(50, Number(this.bigBlind) || 0);
    const raisers = [];
    for (let i = 0; i < this.computerCount; i++) {
      if (!this.computerActive?.[i]) continue;
      if (this.computerInHand?.[i] === false) continue;
      const bal = Number(this.computerBalances?.[i]);
      const safe = Number.isFinite(bal) ? Math.floor(bal) : 0;
      if (safe >= minRaise) raisers.push(i);
    }
    if (!raisers.length) return null;

    const idx = raisers[Math.floor(this.rng() * raisers.length)];
    const goAllIn = this.shouldComputerAllIn(idx);
    const idxBal = Number(this.computerBalances?.[idx]) || 0;
    const amount = goAllIn ? idxBal : this.computeRaiseAmount(idx, minRaise);

    this.computerBalances[idx] -= amount;
    this.sidePot += amount;
    this.computerPotContributions[idx] += amount;
    this.raiseStage = this.round;
    if (!this.sidePotSeats.includes(idx + 1)) this.sidePotSeats.push(idx + 1);

    if (Array.isArray(this.computerLastActions) && idx < this.computerLastActions.length) {
      this.computerLastActions[idx] = goAllIn ? "ALL IN" : "RAISE";
    }

    let sidePotCallers = 0;
    for (let i = 0; i < this.computerCount; i++) {
      if (i === idx) continue;
      if (!this.computerActive?.[i]) continue;
      if (this.computerInHand?.[i] === false) continue;
      const bal = Number(this.computerBalances?.[i]);
      const safe = Number.isFinite(bal) ? Math.floor(bal) : 0;
      if (safe >= amount && this.rng() < 0.7) {
        const respAllIn = this.shouldComputerAllIn(i);
        const respAmount = respAllIn ? safe : amount;
        this.computerBalances[i] -= respAmount;
        this.sidePot += respAmount;
        this.computerPotContributions[i] += respAmount;
        if (!this.sidePotSeats.includes(i + 1)) this.sidePotSeats.push(i + 1);
        if (Array.isArray(this.computerLastActions) && i < this.computerLastActions.length) {
          this.computerLastActions[i] = respAllIn ? "ALL IN" : "CALL";
        }
        sidePotCallers++;
      } else {
        if (Array.isArray(this.computerInHand) && i < this.computerInHand.length) this.computerInHand[i] = false;
        if (Array.isArray(this.computerLastActions) && i < this.computerLastActions.length) {
          this.computerLastActions[i] = "FOLD";
        }
      }
    }

    return { idx, amount, sidePotCallers, allIn: goAllIn };
  }

  // Sidepot
  distributeSidePot() {
    const eligible = (this.sidePotSeats || []).filter((seat) => {
      if (seat <= 0) return false;
      const ci = seat - 1;
      return this.computerActive?.[ci] && this.computerInHand?.[ci] !== false;
    });

    if (!eligible.length || this.sidePot <= 0) {
      // Return unclaimed side pot to the pot (edge case).
      this.pot += this.sidePot;
      this.sidePot = 0;
      return { winners: [], message: "" };
    }

    if (eligible.length === 1) {
      const ci = eligible[0] - 1;
      this.computerBalances[ci] += this.sidePot;
      const amount = this.sidePot;
      this.sidePot = 0;
      return { winners: eligible, message: `${this.getComputerName(ci)} takes back the side pot (${amount} SEK, uncalled).` };
    }

    const computerIndexes = eligible.map((seat) => seat - 1);
    const winners = [computerIndexes[0]];
    for (let i = 1; i < computerIndexes.length; i++) {
      const ci = computerIndexes[i];
      const cmp = compareHands(
        this.computerHands[ci],
        this.computerHands[winners[0]],
        this.communityCards
      );
      if (cmp > 0) { winners.length = 0; winners.push(ci); }
      else if (cmp === 0) { winners.push(ci); }
    }

    const winningSeatIndexes = winners.map((ci) => ci + 1);
    this.distributePot(this.sidePot, winningSeatIndexes);
    const amount = this.sidePot;
    this.sidePot = 0;

    const bestScore = evaluateHand(getAllCards(this.computerHands[winners[0]], this.communityCards));
    const handName = handRankName(bestScore);
    const msg = winners.length === 1
      ? `${this.getComputerName(winners[0])} wins the side pot (${amount} SEK) with ${handName}!`
      : `${this.formatComputerList(winners)} split the side pot (${amount} SEK) with ${handName}!`;

    return { winners: winningSeatIndexes, message: msg };
  }

  // Actions
  check() {
    if (!this.inHand) return { ok: false, error: "No active hand." };
    if ((Number(this.toCall) || 0) > 0) return { ok: false, error: "You must call or fold." };
    return this.nextRound();
  }

  call() {
    if (!this.inHand) return { ok: false, error: "No active hand." };

    const amount = Number(this.toCall) || 0;
    if (amount <= 0) {
      // No bet to call; treat as check
      return this.check();
    }

    const raiserWho = (() => {
      const ci = this.lastComputerRaiserIndex;
      return Number.isFinite(ci) && ci >= 0 ? this.getComputerName(ci) : "Computer";
    })();

    if (!this.canPlayerAfford(amount)) {
      // Allow partial call: player goes all-in with whatever they have left.
      const allInAmount = this.playerBalance;
      if (allInAmount <= 0) {
        return { ok: false, error: "You don't have enough money to call." };
      }
      const excess = amount - allInAmount; // portion player couldn't cover
      this.adjustPlayerBalance(-allInAmount);
      this.pot += allInAmount;
      this.playerAllIn = true;
      this.toCall = 0;

     
      if (excess > 0) {
        const raiserSeat = this.lastComputerRaiserIndex >= 0 ? this.lastComputerRaiserIndex + 1 : null;
        this.pot -= excess;
        this.sidePot += excess;
        if (raiserSeat !== null && !this.sidePotSeats.includes(raiserSeat)) {
          this.sidePotSeats.push(raiserSeat);
        }
        // Other computers in the hand decide whether to call the side pot excess or fold.
        for (let i = 0; i < this.computerCount; i++) {
          if (!this.computerActive?.[i]) continue;
          if (this.computerInHand?.[i] === false) continue;
          if (i + 1 === raiserSeat) continue; // raiser already counted
          const bal = Number(this.computerBalances?.[i]);
          const safe = Number.isFinite(bal) ? Math.floor(bal) : 0;
          if (safe >= excess && this.rng() < 0.7) {
            const respAllIn = this.shouldComputerAllIn(i);
            const respAmount = respAllIn ? safe : excess;
            this.computerBalances[i] -= respAmount;
            this.sidePot += respAmount;
            this.computerPotContributions[i] += respAmount;
            if (!this.sidePotSeats.includes(i + 1)) this.sidePotSeats.push(i + 1);
            if (Array.isArray(this.computerLastActions) && i < this.computerLastActions.length) {
              this.computerLastActions[i] = respAllIn ? "ALL IN" : "CALL";
            }
          } else {
            if (Array.isArray(this.computerInHand) && i < this.computerInHand.length) this.computerInHand[i] = false;
            if (Array.isArray(this.computerLastActions) && i < this.computerLastActions.length) {
              this.computerLastActions[i] = "FOLD";
            }
          }
        }
      }

      const res = this.nextRound(false);
      if (res && res.ok !== false) {
        const sidePotNote = excess > 0 ? ` ${raiserWho}'s extra ${excess} SEK created a side pot.` : "";
        res.message = `You called all-in (${allInAmount} SEK).${sidePotNote}`;
      }
      return res;
    }

    this.adjustPlayerBalance(-amount);
    this.pot += amount;
    if (this.playerBalance === 0) this.playerAllIn = true;
    this.toCall = 0;

    const res = this.nextRound(false);
    if (res && res.ok !== false) {
      if (!res.message) {
        res.message = `You called ${raiserWho}'s raise (${amount} SEK).`;
      }
    }
    return res;
  }

  fold() {
    if (!this.inHand) return { ok: false, error: "No active hand." };

    // For clarity, run out the remaining community cards and show a full showdown
    // between the remaining computers when player has folded.
    while ((this.communityCards?.length || 0) < 5 && Array.isArray(this.deck) && this.deck.length) {
      this.communityCards.push(this.deck.pop());
    }

    // Merge any side pot into the main pot when player folds — computers compete for everything.
    this.pot += this.sidePot;
    this.sidePot = 0;
    this.sidePotSeats = [];

    const winningComputerIndexes = this.getWinningComputerIndexes(this.communityCards);

    let message = "You folded.";
    if (winningComputerIndexes.length) {
      const bestComputerHand = this.computerHands[winningComputerIndexes[0]] || [];
      const bestComputerScore = evaluateHand(getAllCards(bestComputerHand, this.communityCards));
      const winHandName = handRankName(bestComputerScore);
      this.distributePot(this.pot, winningComputerIndexes.map((index) => index + 1));
      message = winningComputerIndexes.length === 1
        ? `You folded. ${this.getComputerName(winningComputerIndexes[0])} would have won with ${winHandName}!`
        : `You folded. ${this.formatComputerList(winningComputerIndexes)} would have split the pot with ${winHandName}!`;
    }

    this.pot = 0;
    this.toCall = 0;
    this.playerAllIn = false;
    this.inHand = false;
    this.pruneBrokeComputers();
    this.advanceBlinds();
    return {
      ok: true,
      balanceDelta: 0,
      message,
      state: this.getPublicState({ revealComputer: true })
    };
  }

  raise(raiseAmount = 50) {
    if (!this.inHand) return { ok: false, error: "No active hand." };
    if (!Number.isFinite(raiseAmount) || raiseAmount <= 0) {
      return { ok: false, error: "Invalid raise amount." };
    }

    const pendingCall = Number(this.toCall) || 0;
    const totalPlayerPutIn = pendingCall > 0 ? (pendingCall + raiseAmount) : raiseAmount;

    if (!this.canPlayerAfford(totalPlayerPutIn)) {
      return {
        ok: false,
        error: pendingCall > 0
          ? "You don't have enough money to call and raise."
          : "You don't have enough money to raise."
      };
    }

    this.adjustPlayerBalance(-totalPlayerPutIn);
    this.pot += totalPlayerPutIn;
    this.toCall = 0;

    const facingRaiserIdx = pendingCall > 0 ? this.lastComputerRaiserIndex : -1;

    let callers = 0;
    for (let i = 0; i < this.computerCount; i++) {
      if (!this.computerActive?.[i]) continue;
      if (this.computerInHand?.[i] === false) continue;

      const amountToCall = pendingCall > 0
        ? (i === facingRaiserIdx ? raiseAmount : (pendingCall + raiseAmount))
        : raiseAmount;

      const bal = Number(this.computerBalances?.[i]);
      const safe = Number.isFinite(bal) ? bal : 0;

      if (safe < amountToCall) {
        if (Array.isArray(this.computerInHand) && i < this.computerInHand.length) this.computerInHand[i] = false;
        if (Array.isArray(this.computerLastActions) && i < this.computerLastActions.length) this.computerLastActions[i] = "FOLD";
        continue;
      }

      if (this.rng() < 0.7) {
        callers += 1;
        const respAllIn = this.shouldComputerAllIn(i);
        const respAmount = respAllIn ? safe : amountToCall;
        this.computerBalances[i] -= respAmount;
        this.pot += respAmount;
        this.computerPotContributions[i] += respAmount;
        if (Array.isArray(this.computerLastActions) && i < this.computerLastActions.length) this.computerLastActions[i] = respAllIn ? "ALL IN" : "CALL";
      } else {
        if (Array.isArray(this.computerInHand) && i < this.computerInHand.length) this.computerInHand[i] = false;
        if (Array.isArray(this.computerLastActions) && i < this.computerLastActions.length) this.computerLastActions[i] = "FOLD";
      }
    }

    // Detect all-in after raise (balance spent on call + raise).
    if (this.playerBalance === 0) this.playerAllIn = true;

    if (callers > 0) {
      return {
        ok: true,
        balanceDelta: -totalPlayerPutIn,
        message: callers === 1
          ? (pendingCall > 0 ? "1 computer called your re-raise" : "1 computer called your raise")
          : (pendingCall > 0 ? `${callers} computers called your re-raise` : `${callers} computers called your raise`),
        state: this.getPublicState({ revealComputer: false })
      };
    }

    // All computers fold -> the player wins the pot directly.
    const payout = this.pot;
    this.adjustPlayerBalance(payout);
    this.pot = 0;
    this.inHand = false;
    this.pruneBrokeComputers();
    this.advanceBlinds();
    return {
      ok: true,
      balanceDelta: -totalPlayerPutIn + payout,
      message: "You won!",
      state: this.getPublicState({ revealComputer: false })
    };
  }

  // Progression
  nextRound(setComputerChecks = true) {
    if (!this.inHand) return { ok: false, error: "No active hand." };
    if (!this.playerAllIn && (Number(this.toCall) || 0) > 0) {
      return { ok: false, error: "You must call or fold." };
    }
    this.toCall = 0;

    let sidePotRaiseMessage = "";
    if (this.playerAllIn) {
      // After the player is all-in, computers may raise into a side pot automatically.
      const sidePotRaise = this.maybeComputerSidePotRaise();
      if (sidePotRaise) {
        const callers = sidePotRaise.sidePotCallers;
        const raiserName = this.getComputerName(sidePotRaise.idx);
        sidePotRaiseMessage = callers > 0
          ? `${raiserName} raised ${sidePotRaise.amount} SEK into a side pot (${callers} computer${callers > 1 ? "s" : ""} called). `
          : `${raiserName} raised ${sidePotRaise.amount} SEK into a side pot (uncalled). `;
      }
    } else {
      const raise = this.maybeComputerRaise();
      if (raise) {
        const raiseLabel = raise.allIn ? "went all-in with" : "raised";
        return {
          ok: true,
          balanceDelta: 0,
          message: `${this.getComputerName(raise.idx)} ${raiseLabel} ${raise.amount} SEK!`,
          state: this.getPublicState({ revealComputer: false })
        };
      }
    }

    if (setComputerChecks && !sidePotRaiseMessage && Array.isArray(this.computerLastActions)) {
      for (let i = 0; i < this.computerCount; i++) {
        if (!this.computerActive?.[i]) continue;
        if (this.computerInHand?.[i] === false) continue;
        this.computerLastActions[i] = "CHECK";
      }
    }

    this.round += 1;

    if (this.round === 1) {
      this.communityCards.push(this.deck.pop(), this.deck.pop(), this.deck.pop());
      return { ok: true, balanceDelta: 0, message: "", state: this.getPublicState({ revealComputer: false }) };
    }

    if (this.round === 2) {
      this.communityCards.push(this.deck.pop());
      return { ok: true, balanceDelta: 0, message: "", state: this.getPublicState({ revealComputer: false }) };
    }

    if (this.round === 3) {
      this.communityCards.push(this.deck.pop());
      return { ok: true, balanceDelta: 0, message: "", state: this.getPublicState({ revealComputer: false }) };
    }

    // SHOWDOWN
    const hasSidePot = this.sidePot > 0;
    const winningComputerIndexes = this.getWinningComputerIndexes(this.communityCards);
    const playerScore = evaluateHand(getAllCards(this.playerHand, this.communityCards));

    let mainPotMessage = `You won the main pot with ${handRankName(playerScore)}!`;
    let winningSeats = [0];

    if (winningComputerIndexes.length) {
      const bestComputerHand = this.computerHands[winningComputerIndexes[0]] || [];
      const bestComputerScore = evaluateHand(getAllCards(bestComputerHand, this.communityCards));
      const comparison = compareHands(this.playerHand, bestComputerHand, this.communityCards);
      const bestHandName = handRankName(Math.max(playerScore, bestComputerScore));

      if (comparison < 0) {
        winningSeats = winningComputerIndexes.map((index) => index + 1);
        mainPotMessage = winningComputerIndexes.length === 1
          ? `${this.getComputerName(winningComputerIndexes[0])} won${hasSidePot ? " the main pot" : ""} with ${bestHandName}!`
          : `${this.formatComputerList(winningComputerIndexes)} split the${hasSidePot ? " main" : ""} pot with ${bestHandName}!`;
      } else if (comparison === 0) {
        winningSeats = [0, ...winningComputerIndexes.map((index) => index + 1)];
        mainPotMessage = winningComputerIndexes.length === 1
          ? `Split${hasSidePot ? " main" : ""} pot with ${this.getComputerName(winningComputerIndexes[0])} (${bestHandName}).`
          : `Split${hasSidePot ? " main" : ""} pot with ${this.formatComputerList(winningComputerIndexes)} (${bestHandName}).`;
      } else {
        // Player wins main pot
        mainPotMessage = hasSidePot
          ? `You won the main pot with ${handRankName(playerScore)}!`
          : `You won with ${handRankName(playerScore)}!`;
      }
    }

    const playerBalanceBeforePayout = this.playerBalance;
    this.distributePot(this.pot, winningSeats);
    const payout = this.playerBalance - playerBalanceBeforePayout;

    this.pot = 0;

    let sidePotMessage = "";
    if (hasSidePot) {
      const sidePotResult = this.distributeSidePot();
      sidePotMessage = sidePotResult.message;
    }

    const message = sidePotMessage
      ? `${mainPotMessage} ${sidePotMessage}`
      : mainPotMessage;

    this.inHand = false;
    this.playerAllIn = false;
    this.pruneBrokeComputers();
    this.advanceBlinds();

    return {
      ok: true,
      balanceDelta: payout,
      message,
      state: this.getPublicState({ revealComputer: true })
    };
  }
}

// Export
window.PokerGameEngine = PokerGameEngine;
