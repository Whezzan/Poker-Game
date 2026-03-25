const PokerHandEvaluator = (() => {
  // Helpers
  function getAllCards(hand, community) {
    return [...hand, ...community];
  }

  function countRanks(cards) {
    const counts = {};
    cards.forEach((card) => {
      counts[card.rank] = (counts[card.rank] || 0) + 1;
    });
    return counts;
  }

  // Detection
  function getBestStraightHigh(cards) {
    const ranks = new Set(cards.map((card) => card.rank));
    if (ranks.has(14)) ranks.add(1);

    for (let high = 14; high >= 5; high--) {
      let ok = true;
      for (let offset = 0; offset < 5; offset++) {
        if (!ranks.has(high - offset)) {
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
    for (const suitedCards of Object.values(bySuit)) {
      if (suitedCards.length < 5) continue;
      best = Math.max(best, getBestStraightHigh(suitedCards));
    }
    return best;
  }

  function hasFlush(cards) {
    const suitCounts = {};
    cards.forEach((card) => {
      suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
    });
    return Object.values(suitCounts).some((count) => count >= 5);
  }

  // Evaluation
  function evaluateHand(cards) {
    const ranks = countRanks(cards);
    const rankCounts = Object.values(ranks);

    if (getBestStraightFlushHigh(cards) > 0) return 8;
    if (rankCounts.includes(4)) return 7;

    const trips = Object.keys(ranks).filter((rank) => ranks[rank] === 3).map(Number);
    const pairs = Object.keys(ranks).filter((rank) => ranks[rank] === 2).map(Number);
    if (trips.length >= 2) return 6;
    if (trips.length === 1 && pairs.length >= 1) return 6;
    if (hasFlush(cards)) return 5;
    if (getBestStraightHigh(cards) > 0) return 4;
    if (trips.length >= 1) return 3;
    if (pairs.length >= 2) return 2;
    if (pairs.length >= 1) return 1;
    return 0;
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

  // Tiebreakers
  function getBestFlushRanks(cards) {
    const suitsToRanks = {};
    for (const card of cards) {
      if (!suitsToRanks[card.suit]) suitsToRanks[card.suit] = [];
      suitsToRanks[card.suit].push(card.rank);
    }

    let best = null;
    for (const ranks of Object.values(suitsToRanks)) {
      if (ranks.length < 5) continue;
      const topFive = [...ranks].sort((a, b) => b - a).slice(0, 5);
      if (!best) {
        best = topFive;
        continue;
      }

      for (let i = 0; i < 5; i++) {
        if (topFive[i] > best[i]) {
          best = topFive;
          break;
        }
        if (topFive[i] < best[i]) break;
      }
    }

    return best;
  }

  function getPairData(cards) {
    const ranks = countRanks(cards);
    const pairRanks = Object.keys(ranks)
      .filter((rank) => ranks[rank] === 2)
      .map(Number)
      .sort((a, b) => b - a);

    const pairRank = pairRanks[0] || 0;
    const kickers = cards
      .map((card) => card.rank)
      .filter((rank) => rank !== pairRank)
      .sort((a, b) => b - a)
      .slice(0, 3);

    return { pairRank, kickers };
  }

  function getBestHighCardRanks(cards) {
    return [...new Set(cards.map((card) => card.rank))]
      .sort((a, b) => b - a)
      .slice(0, 5);
  }

  function getFourOfKindData(cards) {
    const ranks = countRanks(cards);
    const quadRank = Object.keys(ranks)
      .filter((rank) => ranks[rank] === 4)
      .map(Number)
      .sort((a, b) => b - a)[0] || 0;

    const kicker = cards
      .map((card) => card.rank)
      .filter((rank) => rank !== quadRank)
      .sort((a, b) => b - a)[0] || 0;

    return { quadRank, kicker };
  }

  function getFullHouseData(cards) {
    const ranks = countRanks(cards);
    const trips = Object.keys(ranks)
      .filter((rank) => ranks[rank] === 3)
      .map(Number)
      .sort((a, b) => b - a);
    const pairs = Object.keys(ranks)
      .filter((rank) => ranks[rank] === 2)
      .map(Number)
      .sort((a, b) => b - a);

    const tripRank = trips[0] || 0;
    const pairRank = trips.length >= 2 ? (trips[1] || 0) : (pairs[0] || 0);
    return { tripRank, pairRank };
  }

  function getThreeOfKindData(cards) {
    const ranks = countRanks(cards);
    const tripRank = Object.keys(ranks)
      .filter((rank) => ranks[rank] === 3)
      .map(Number)
      .sort((a, b) => b - a)[0] || 0;

    const kickers = cards
      .map((card) => card.rank)
      .filter((rank) => rank !== tripRank)
      .sort((a, b) => b - a)
      .slice(0, 2);

    return { tripRank, kickers };
  }

  function getTwoPairData(cards) {
    const ranks = countRanks(cards);
    const pairRanks = Object.keys(ranks)
      .filter((rank) => ranks[rank] === 2)
      .map(Number)
      .sort((a, b) => b - a);

    const highPair = pairRanks[0] || 0;
    const lowPair = pairRanks[1] || 0;
    const kicker = cards
      .map((card) => card.rank)
      .filter((rank) => rank !== highPair && rank !== lowPair)
      .sort((a, b) => b - a)[0] || 0;

    return { highPair, lowPair, kicker };
  }

  // Comparison
  function compareHands(handA, handB, communityCards) {
    const aCards = getAllCards(handA, communityCards);
    const bCards = getAllCards(handB, communityCards);

    const aScore = evaluateHand(aCards);
    const bScore = evaluateHand(bCards);

    if (aScore > bScore) return 1;
    if (aScore < bScore) return -1;

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

    if (aScore === 6) {
      const aData = getFullHouseData(aCards);
      const bData = getFullHouseData(bCards);
      if (aData.tripRank > bData.tripRank) return 1;
      if (aData.tripRank < bData.tripRank) return -1;
      if (aData.pairRank > bData.pairRank) return 1;
      if (aData.pairRank < bData.pairRank) return -1;
    }

    if (aScore === 7) {
      const aData = getFourOfKindData(aCards);
      const bData = getFourOfKindData(bCards);
      if (aData.quadRank > bData.quadRank) return 1;
      if (aData.quadRank < bData.quadRank) return -1;
      if (aData.kicker > bData.kicker) return 1;
      if (aData.kicker < bData.kicker) return -1;
    }

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

    if (aScore === 4) {
      const aHigh = getBestStraightHigh(aCards);
      const bHigh = getBestStraightHigh(bCards);
      if (aHigh > bHigh) return 1;
      if (aHigh < bHigh) return -1;
    }

    if (aScore === 8) {
      const aHigh = getBestStraightFlushHigh(aCards) || getBestStraightHigh(aCards);
      const bHigh = getBestStraightFlushHigh(bCards) || getBestStraightHigh(bCards);
      if (aHigh > bHigh) return 1;
      if (aHigh < bHigh) return -1;
    }

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

  // Exports
  return {
    compareHands,
    evaluateHand,
    getAllCards,
    handRankName
  };
})();

window.PokerHandEvaluator = PokerHandEvaluator;
