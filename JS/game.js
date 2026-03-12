
// Poker-motor (ingen DOM, ingen localStorage).

const suits = ["H", "D", "C", "S"];
const values = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const valueMap = {
  "2": 2, "3": 3, "4": 4, "5": 5,
  "6": 6, "7": 7, "8": 8, "9": 9,
  "10": 10, "J": 11, "Q": 12, "K": 13, "A": 14
};

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

function getAllCards(hand, community) {
  return [...hand, ...community];
}

function countRanks(cards) {
  const counts = {};
  cards.forEach(card => {
    counts[card.rank] = (counts[card.rank] || 0) + 1;
  });
  return counts;
}

function hasFlush(cards) {
  const suitCounts = {};
  cards.forEach(card => {
    suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
  });
  return Object.values(suitCounts).some(count => count >= 5);
}

function hasStraight(cards) {
  return getBestStraightHigh(cards) > 0;
}

function evaluateHand(cards) {
  const ranks = countRanks(cards);
  const rankCounts = Object.values(ranks);

  const straightFlushHigh = getBestStraightFlushHigh(cards);
  if (straightFlushHigh > 0) return 8; // Straight Flush

  if (rankCounts.includes(4)) return 7; // Four of a Kind

  const trips = Object.keys(ranks).filter(r => ranks[r] === 3).map(Number);
  const pairs = Object.keys(ranks).filter(r => ranks[r] === 2).map(Number);
  if (trips.length >= 2) return 6; // Full House (two trips)
  if (trips.length === 1 && pairs.length >= 1) return 6; // Full House

  const flush = hasFlush(cards);
  if (flush) return 5; // Flush

  const straight = hasStraight(cards);
  if (straight) return 4; // Straight

  if (trips.length >= 1) return 3; // Three of a Kind
  if (pairs.length >= 2) return 2; // Two Pair
  if (pairs.length >= 1) return 1; // Pair

  return 0; // High Card
}

function handRankName(score) {
  switch (score) {
    case 8: return "Straight Flush";
    case 7: return "Four of a Kind";
    case 6: return "Full House";
    case 5: return "Flush";
    case 4: return "Straight";
    case 3: return "Three of a Kind";
    case 2: return "Two Pair";
    case 1: return "Pair";
    default: return "High Card";
  }
}

function getBestFlushRanks(cards) {
  const suitsToRanks = {};
  for (const card of cards) {
    if (!suitsToRanks[card.suit]) suitsToRanks[card.suit] = [];
    suitsToRanks[card.suit].push(card.rank);
  }

  let best = null;
  for (const ranks of Object.values(suitsToRanks)) {
    if (ranks.length < 5) continue;
    const top5 = [...ranks].sort((a, b) => b - a).slice(0, 5);
    if (!best) {
      best = top5;
      continue;
    }
    // Lexicographic compare.
    for (let i = 0; i < 5; i++) {
      if (top5[i] > best[i]) {
        best = top5;
        break;
      }
      if (top5[i] < best[i]) break;
    }
  }

  return best;
}

function getBestStraightHigh(cards) {
  const ranks = new Set(cards.map(c => c.rank));
  // Ace can be low in A-2-3-4-5.
  if (ranks.has(14)) ranks.add(1);

  // Find best (highest) straight high card.
  for (let high = 14; high >= 5; high--) {
    let ok = true;
    for (let d = 0; d < 5; d++) {
      if (!ranks.has(high - d)) {
        ok = false;
        break;
      }
    }
    if (ok) return high;
  }

  return 0;
}

function getBestStraightFlushHigh(cards) {
  const bySuit = {};
  for (const card of cards) {
    if (!bySuit[card.suit]) bySuit[card.suit] = [];
    bySuit[card.suit].push(card);
  }

  let best = 0;
  for (const suited of Object.values(bySuit)) {
    if (suited.length < 5) continue;
    best = Math.max(best, getBestStraightHigh(suited));
  }
  return best;
}

function getPairData(cards) {
  const ranks = countRanks(cards);
  const pairRanks = Object.keys(ranks)
    .filter(rank => ranks[rank] === 2)
    .map(Number)
    .sort((a, b) => b - a);

  const pairRank = pairRanks[0] || 0;
  const kickers = cards
    .map(c => c.rank)
    .filter(r => r !== pairRank)
    .sort((a, b) => b - a)
    .slice(0, 3);

  return { pairRank, kickers };
}

function getBestHighCardRanks(cards) {
  return [...new Set(cards.map(c => c.rank))]
    .sort((a, b) => b - a)
    .slice(0, 5);
}

function getFourOfKindData(cards) {
  const ranks = countRanks(cards);
  const quadRank = Object.keys(ranks)
    .filter(r => ranks[r] === 4)
    .map(Number)
    .sort((a, b) => b - a)[0] || 0;

  const kicker = cards
    .map(c => c.rank)
    .filter(r => r !== quadRank)
    .sort((a, b) => b - a)[0] || 0;

  return { quadRank, kicker };
}

function getFullHouseData(cards) {
  const ranks = countRanks(cards);
  const trips = Object.keys(ranks)
    .filter(r => ranks[r] === 3)
    .map(Number)
    .sort((a, b) => b - a);
  const pairs = Object.keys(ranks)
    .filter(r => ranks[r] === 2)
    .map(Number)
    .sort((a, b) => b - a);

  const tripRank = trips[0] || 0;
  const pairRank = trips.length >= 2 ? (trips[1] || 0) : (pairs[0] || 0);
  return { tripRank, pairRank };
}

function getThreeOfKindData(cards) {
  const ranks = countRanks(cards);
  const tripRank = Object.keys(ranks)
    .filter(r => ranks[r] === 3)
    .map(Number)
    .sort((a, b) => b - a)[0] || 0;

  const kickers = cards
    .map(c => c.rank)
    .filter(r => r !== tripRank)
    .sort((a, b) => b - a)
    .slice(0, 2);

  return { tripRank, kickers };
}

function getTwoPairData(cards) {
  const ranks = countRanks(cards);
  const pairRanks = Object.keys(ranks)
    .filter(r => ranks[r] === 2)
    .map(Number)
    .sort((a, b) => b - a);

  const highPair = pairRanks[0] || 0;
  const lowPair = pairRanks[1] || 0;
  const kicker = cards
    .map(c => c.rank)
    .filter(r => r !== highPair && r !== lowPair)
    .sort((a, b) => b - a)[0] || 0;

  return { highPair, lowPair, kicker };
}

function determineWinnerInternal(playerHand, computerHand, communityCards) {
  const playerCards = getAllCards(playerHand, communityCards);
  const computerCards = getAllCards(computerHand, communityCards);

  const playerScore = evaluateHand(playerCards);
  const computerScore = evaluateHand(computerCards);

  let winner = "draw";
  let resultText = "";

  if (playerScore > computerScore) {
    winner = "player";
    resultText = "You won!";
  } else if (playerScore < computerScore) {
    winner = "computer";
    resultText = "Computer won!";
  } else {
    // KICKER-LOGIK för pair.
    if (playerScore === 1) {
      const pData = getPairData(playerCards);
      const cData = getPairData(computerCards);

      if (pData.pairRank > cData.pairRank) {
        winner = "player";
        resultText = "You won with a higher pair!";
      } else if (pData.pairRank < cData.pairRank) {
        winner = "computer";
        resultText = "Computer won with a higher pair!";
      } else {
        let decided = false;
        for (let i = 0; i < pData.kickers.length; i++) {
          if (pData.kickers[i] > cData.kickers[i]) {
            winner = "player";
            resultText = "You won on a kicker!";
            decided = true;
            break;
          }
          if (pData.kickers[i] < cData.kickers[i]) {
            winner = "computer";
            resultText = "Computer won on a kicker!";
            decided = true;
            break;
          }
        }
        if (!decided) {
          winner = "draw";
          resultText = "It's a draw!";
        }
      }
    } else if (playerScore === 0) {
      const pHigh = getBestHighCardRanks(playerCards);
      const cHigh = getBestHighCardRanks(computerCards);

      let decided = false;
      for (let i = 0; i < Math.min(pHigh.length, cHigh.length); i++) {
        if (pHigh[i] > cHigh[i]) {
          winner = "player";
          resultText = "You won on a kicker!";
          decided = true;
          break;
        }
        if (pHigh[i] < cHigh[i]) {
          winner = "computer";
          resultText = "Computer won on a kicker!";
          decided = true;
          break;
        }
      }

      if (!decided) {
        winner = "draw";
        resultText = "It's a draw!";
      }
    } else {
      winner = "draw";
      resultText = "It's a draw!";
    }
  }

  return { winner, resultText };
}

function compareHandsInternal(handA, handB, communityCards) {
  const aCards = getAllCards(handA, communityCards);
  const bCards = getAllCards(handB, communityCards);

  const aScore = evaluateHand(aCards);
  const bScore = evaluateHand(bCards);

  if (aScore > bScore) return 1;
  if (aScore < bScore) return -1;

  // KICKER-LOGIK för Pair
  if (aScore === 1) {
    const aData = getPairData(aCards);
    const bData = getPairData(bCards);

    if (aData.pairRank > bData.pairRank) return 1;
    if (aData.pairRank < bData.pairRank) return -1;

    for (let i = 0; i < aData.kickers.length; i++) {
      if (aData.kickers[i] > bData.kickers[i]) return 1;
      if (aData.kickers[i] < bData.kickers[i]) return -1;
    }
  }

  // KICKER-LOGIK för Two Pair
  if (aScore === 2) {
    const aData = getTwoPairData(aCards);
    const bData = getTwoPairData(bCards);
    if (aData.highPair > bData.highPair) return 1;
    if (aData.highPair < bData.highPair) return -1;
    if (aData.lowPair > bData.lowPair) return 1;
    if (aData.lowPair < bData.lowPair) return -1;
    if (aData.kicker > bData.kicker) return 1;
    if (aData.kicker < bData.kicker) return -1;
  }

  // KICKER-LOGIK för Three of a Kind
  if (aScore === 3) {
    const aData = getThreeOfKindData(aCards);
    const bData = getThreeOfKindData(bCards);
    if (aData.tripRank > bData.tripRank) return 1;
    if (aData.tripRank < bData.tripRank) return -1;
    for (let i = 0; i < Math.min(aData.kickers.length, bData.kickers.length); i++) {
      if (aData.kickers[i] > bData.kickers[i]) return 1;
      if (aData.kickers[i] < bData.kickers[i]) return -1;
    }
  }

  // KICKER-LOGIK för Full House
  if (aScore === 6) {
    const aData = getFullHouseData(aCards);
    const bData = getFullHouseData(bCards);
    if (aData.tripRank > bData.tripRank) return 1;
    if (aData.tripRank < bData.tripRank) return -1;
    if (aData.pairRank > bData.pairRank) return 1;
    if (aData.pairRank < bData.pairRank) return -1;
  }

  // KICKER-LOGIK för Four of a Kind
  if (aScore === 7) {
    const aData = getFourOfKindData(aCards);
    const bData = getFourOfKindData(bCards);
    if (aData.quadRank > bData.quadRank) return 1;
    if (aData.quadRank < bData.quadRank) return -1;
    if (aData.kicker > bData.kicker) return 1;
    if (aData.kicker < bData.kicker) return -1;
  }

  // KICKER-LOGIK för Flush
  if (aScore === 5) {
    const aFlush = getBestFlushRanks(aCards);
    const bFlush = getBestFlushRanks(bCards);
    if (aFlush && bFlush) {
      for (let i = 0; i < 5; i++) {
        if (aFlush[i] > bFlush[i]) return 1;
        if (aFlush[i] < bFlush[i]) return -1;
      }
    }
  }

  // KICKER-LOGIK för Straight
  if (aScore === 4) {
    const aHigh = getBestStraightHigh(aCards);
    const bHigh = getBestStraightHigh(bCards);
    if (aHigh > bHigh) return 1;
    if (aHigh < bHigh) return -1;
  }

  // KICKER-LOGIK för Straight Flush
  if (aScore === 8) {
    const aHigh = getBestStraightFlushHigh(aCards) || getBestStraightHigh(aCards);
    const bHigh = getBestStraightFlushHigh(bCards) || getBestStraightHigh(bCards);
    if (aHigh > bHigh) return 1;
    if (aHigh < bHigh) return -1;
  }

  // KICKER-LOGIK för High Card
  if (aScore === 0) {
    const aHigh = getBestHighCardRanks(aCards);
    const bHigh = getBestHighCardRanks(bCards);
    for (let i = 0; i < Math.min(aHigh.length, bHigh.length); i++) {
      if (aHigh[i] > bHigh[i]) return 1;
      if (aHigh[i] < bHigh[i]) return -1;
    }
  }

  return 0;
}

class PokerGameEngine {
  constructor(rng = Math.random, { computerCount = 3 } = {}) {
    this.rng = rng;
    this.computerCount = Number.isFinite(computerCount) ? Math.max(1, Math.floor(computerCount)) : 3;
    this.playerCount = 1 + this.computerCount;
    this.startingBalance = 1000;
    this.resetTable();
  }

  resetHandTracking() {
    // Tracks per-hand participation and last action (for UI).
    this.computerInHand = Array.from({ length: this.computerCount }, (_, i) => !!this.computerActive?.[i]);
    this.computerLastActions = Array.from({ length: this.computerCount }, () => "");
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

  getSmallBlindIndex() {
    // Small blind always follows big blind (clockwise).
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

  resetTable() {
    this.deck = [];
    this.playerHand = [];
    this.computerHands = Array.from({ length: this.computerCount }, () => []);
    this.communityCards = [];
    this.round = 0;
    this.pot = 0;
    this.inHand = false;

    // Simple betting state: when > 0, player must Call or Fold before advancing.
    this.toCall = 0;
    this.lastComputerRaiserIndex = -1;
    this.lastComputerRaiseAmount = 0;
    this.raiseStage = -1;

    // Balances (not persisted; UI persists player balance separately).
    this.playerBalance = this.startingBalance;
    this.computerBalances = Array.from({ length: this.computerCount }, () => this.startingBalance);
    this.computerActive = Array.from({ length: this.computerCount }, () => true);

    this.resetHandTracking();

    // Blinds
    this.handNumber = 0;
    this.handsSinceBlindIncrease = 0;
    this.smallBlind = 10;
    this.bigBlind = 20;
    // Start with player as small blind (so BB is the seat before player).
    this.bigBlindIndex = this.playerCount > 1 ? (this.playerCount - 1) : 0;
  }

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
      // Back-compat: keep computerHand as "Computer 1".
      computerHand: revealComputer ? [...(safeHands[0] || [])] : [],
      computerHands: revealComputer ? safeHands.map(h => [...h]) : safeHands.map(() => []),
      communityCards: [...this.communityCards],
      revealComputer
    };
  }

  startHand(betAmount) {
    if (this.inHand) return { ok: false, error: "Hand already in progress." };

    this.toCall = 0;
    this.lastComputerRaiserIndex = -1;
    this.lastComputerRaiseAmount = 0;
    this.raiseStage = -1;

    // Reset per-hand fold/action tracking.
    this.resetHandTracking();
    if (Array.isArray(this.computerLastActions)) {
      for (let i = 0; i < this.computerCount; i++) {
        if (this.computerActive?.[i]) this.computerLastActions[i] = "CHECK";
      }
    }

    // Remove busted computers before assigning blinds.
    this.pruneBrokeComputers();
    this.ensureBigBlindActive();
    if (this.getActiveComputerCount() <= 0) {
      return { ok: false, error: "Game over. All computers are out." };
    }

    // If a computer cannot afford its blind, eliminate it and retry.
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

    this.deck = createDeck().sort(() => this.rng() - 0.5);
    this.playerHand = [this.deck.pop(), this.deck.pop()];
    this.computerHands = Array.from({ length: this.computerCount }, (_, i) => {
      if (!this.computerActive?.[i]) return [];
      return [this.deck.pop(), this.deck.pop()];
    });
    this.communityCards = [];
    this.round = 0;

    // Post blinds.
    const smallBlindIndex = this.getSmallBlindIndex();
    const bigBlindIndex = this.bigBlindIndex;
    this.pot = 0;
    this.inHand = true;

    let playerBlind = 0;

    if (smallBlindIndex === 0) {
      playerBlind += this.smallBlind;
      this.pot += this.smallBlind;
    } else {
      const ci = smallBlindIndex - 1;
      if (this.computerActive?.[ci]) {
        this.computerBalances[ci] -= this.smallBlind;
        this.pot += this.smallBlind;
        if (Array.isArray(this.computerLastActions) && ci < this.computerLastActions.length) {
          this.computerLastActions[ci] = "CALL";
        }
      }
    }

    if (bigBlindIndex === 0) {
      playerBlind += this.bigBlind;
      this.pot += this.bigBlind;
    } else {
      const ci = bigBlindIndex - 1;
      if (this.computerActive?.[ci]) {
        this.computerBalances[ci] -= this.bigBlind;
        this.pot += this.bigBlind;
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

  maybeComputerRaise() {
    if (!this.inHand) return null;
    if ((Number(this.toCall) || 0) > 0) return null;
    if (this.round >= 3) return null; // No raises after river in this simplified engine.
    if (this.raiseStage === this.round) return null; // Max 1 computer raise per stage.

    // Keep it simple: 25% chance that a computer raises when player tries to advance.
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
    const amount = minRaise;

    this.computerBalances[idx] -= amount;
    this.pot += amount;
    this.toCall = amount;
    this.lastComputerRaiserIndex = idx;
    this.lastComputerRaiseAmount = amount;
    this.raiseStage = this.round;

    // Other computers effectively check in this simplified model.
    if (Array.isArray(this.computerLastActions)) {
      for (let i = 0; i < this.computerCount; i++) {
        if (i === idx) continue;
        if (!this.computerActive?.[i]) continue;
        if (this.computerInHand?.[i] === false) continue;
        this.computerLastActions[i] = "CHECK";
      }
    }

    if (Array.isArray(this.computerLastActions) && idx < this.computerLastActions.length) {
      this.computerLastActions[idx] = "RAISE";
    }

    return { idx, amount };
  }

  check() {
    if (!this.inHand) return { ok: false, error: "No active hand." };
    if ((Number(this.toCall) || 0) > 0) return { ok: false, error: "You must call or fold." };
    return this.nextRound();
  }

  call() {
    if (!this.inHand) return { ok: false, error: "No active hand." };

    const amount = Number(this.toCall) || 0;
    if (amount <= 0) {
      // No bet to call; treat as check for back-compat.
      return this.check();
    }

    this.pot += amount;
    this.toCall = 0;

    const res = this.nextRound(false);
    if (res && res.ok !== false) {
      res.balanceDelta = (res.balanceDelta || 0) - amount;
      if (!res.message) {
        const ci = this.lastComputerRaiserIndex;
        const who = Number.isFinite(ci) && ci >= 0 ? `Computer ${ci + 1}` : "Computer";
        res.message = `You called ${who}'s raise (${amount} SEK).`;
      }
    }
    return res;
  }

  fold() {
    if (!this.inHand) return { ok: false, error: "No active hand." };

    // For clarity, run out the remaining community cards and show a full showdown
    // between the remaining computers (player has folded).
    while ((this.communityCards?.length || 0) < 5 && Array.isArray(this.deck) && this.deck.length) {
      this.communityCards.push(this.deck.pop());
    }

    const hands = Array.isArray(this.computerHands) ? this.computerHands : [];
    const safeHands = hands.length
      ? hands
      : Array.from({ length: this.computerCount }, () => []);

    // Find best computer hand among computers still in the hand.
    let bestIdx = -1;
    for (let i = 0; i < safeHands.length; i++) {
      if (!this.computerActive?.[i]) continue;
      if (this.computerInHand?.[i] === false) continue;
      if (!safeHands[i] || safeHands[i].length < 2) continue;
      if (bestIdx === -1) {
        bestIdx = i;
        continue;
      }
      const cmp = compareHandsInternal(safeHands[i], safeHands[bestIdx], this.communityCards);
      if (cmp === 1) bestIdx = i;
    }

    let message = "You folded.";
    if (bestIdx !== -1) {
      const bestComputerHand = safeHands[bestIdx] || [];
      const bestComputerScore = evaluateHand(getAllCards(bestComputerHand, this.communityCards));
      const winHandName = handRankName(bestComputerScore);
      message = `You folded. Computer ${bestIdx + 1} would have won with ${winHandName}!`;
      this.computerBalances[bestIdx] += this.pot;
    }

    this.pot = 0;
    this.toCall = 0;
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

    // Player puts in chips: call (if any) + raise.
    this.pot += totalPlayerPutIn;
    this.toCall = 0;

    const facingRaiserIdx = pendingCall > 0 ? this.lastComputerRaiserIndex : -1;

    // Simple computer AI: each computer has 70% chance to call.
    // When re-raising, the original raiser only needs to match the added raise,
    // while other computers must match (call + raise).
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
        // Can't afford: fold this hand.
        if (Array.isArray(this.computerInHand) && i < this.computerInHand.length) this.computerInHand[i] = false;
        if (Array.isArray(this.computerLastActions) && i < this.computerLastActions.length) this.computerLastActions[i] = "FOLD";
        continue;
      }

      if (this.rng() < 0.7) {
        callers += 1;
        this.computerBalances[i] -= amountToCall;
        this.pot += amountToCall;
        if (Array.isArray(this.computerLastActions) && i < this.computerLastActions.length) this.computerLastActions[i] = "CALL";
      } else {
        if (Array.isArray(this.computerInHand) && i < this.computerInHand.length) this.computerInHand[i] = false;
        if (Array.isArray(this.computerLastActions) && i < this.computerLastActions.length) this.computerLastActions[i] = "FOLD";
      }
    }

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

    // Alla datorer foldar -> spelaren vinner potten direkt.
    const payout = this.pot;
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

  nextRound(setComputerChecks = true) {
    if (!this.inHand) return { ok: false, error: "No active hand." };

    if ((Number(this.toCall) || 0) > 0) {
      return { ok: false, error: "You must call or fold." };
    }

    const raise = this.maybeComputerRaise();
    if (raise) {
      return {
        ok: true,
        balanceDelta: 0,
        message: `Computer ${raise.idx + 1} raised ${raise.amount} SEK!`,
        state: this.getPublicState({ revealComputer: false })
      };
    }

    // No computer raise: treat it as a check from remaining computers.
    // (Skip this when the player action was a CALL; no computer action happened.)
    if (setComputerChecks && Array.isArray(this.computerLastActions)) {
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
    const hands = Array.isArray(this.computerHands) ? this.computerHands : [];
    const safeHands = hands.length
      ? hands
      : Array.from({ length: this.computerCount }, () => []);

    // Find best computer hand.
    let bestIdx = -1;
    for (let i = 0; i < safeHands.length; i++) {
      if (!this.computerActive?.[i]) continue;
      if (this.computerInHand?.[i] === false) continue;
      if (!safeHands[i] || safeHands[i].length < 2) continue;
      if (bestIdx === -1) {
        bestIdx = i;
        continue;
      }
      const cmp = compareHandsInternal(safeHands[i], safeHands[bestIdx], this.communityCards);
      if (cmp === 1) bestIdx = i;
    }

    const bestComputerHand = bestIdx === -1 ? [] : (safeHands[bestIdx] || []);
    const vsBest = bestIdx === -1 ? 1 : compareHandsInternal(this.playerHand, bestComputerHand, this.communityCards);
    const winner = bestIdx === -1 ? "player" : (vsBest === 1 ? "player" : vsBest === -1 ? "computer" : "draw");

    const playerScore = evaluateHand(getAllCards(this.playerHand, this.communityCards));
    const bestComputerScore = evaluateHand(getAllCards(bestComputerHand, this.communityCards));
    const winHandName = winner === "player"
      ? handRankName(playerScore)
      : winner === "computer"
        ? handRankName(bestComputerScore)
        : handRankName(Math.max(playerScore, bestComputerScore));

    const resultText =
      winner === "player"
        ? `You won with ${winHandName}!`
        : winner === "computer"
          ? `Computer ${bestIdx + 1} won with ${winHandName}!`
          : `It's a draw (${winHandName}).`;

    let payout = 0;
    if (winner === "draw") {
      const half = Math.floor(this.pot / 2);
      const other = this.pot - half;
      payout = half;
      if (bestIdx !== -1) this.computerBalances[bestIdx] += other;
    } else if (winner === "player") {
      payout = this.pot;
    } else if (winner === "computer") {
      if (bestIdx !== -1) this.computerBalances[bestIdx] += this.pot;
    }

    const message = resultText;

    this.pot = 0;
    this.inHand = false;
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

window.pokerGame = new PokerGameEngine();