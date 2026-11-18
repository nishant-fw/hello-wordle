// Game rules with no socket code in them, so they can be tested directly.
const { scoreGuess } = require('./score');
const WORDS = require('./words');

const ROWS = 6;
const WORD_LENGTH = 5;
const MAX_PLAYERS = 2;

function createGames({ pickWord = () => WORDS[Math.floor(Math.random() * WORDS.length)] } = {}) {
  const games = new Map();

  function newId() {
    let id;
    do {
      id = Math.random().toString(36).slice(2, 8).toUpperCase();
    } while (games.has(id));
    return id;
  }

  function create(playerId) {
    const id = newId();
    games.set(id, { id, answer: pickWord(), players: [playerId], attempts: {}, finished: false });
    return { ok: true, gameId: id, players: [playerId] };
  }

  function join(gameId, playerId) {
    const game = games.get(String(gameId || '').trim().toUpperCase());
    if (!game || game.finished) return { ok: false, error: 'Game not found' };
    if (game.players.includes(playerId)) return { ok: false, error: 'You are already in this game' };
    if (game.players.length >= MAX_PLAYERS) return { ok: false, error: 'Game is already full' };
    game.players.push(playerId);
    return { ok: true, gameId: game.id, players: [...game.players], started: game.players.length === MAX_PLAYERS };
  }

  // Returns the guess's status, and `ended` when the guess finished the game.
  // The row is the server's count of this player's attempts, never the client's.
  function guess(gameId, playerId, word) {
    const game = games.get(gameId);
    if (!game || !game.players.includes(playerId)) return { ok: false, error: 'Game not found' };
    if (game.players.length < MAX_PLAYERS) return { ok: false, error: 'Waiting for an opponent' };
    if (game.finished) return { ok: false, error: 'Game is over' };
    if (typeof word !== 'string' || !new RegExp(`^[A-Za-z]{${WORD_LENGTH}}$`).test(word)) {
      return { ok: false, error: `A guess is ${WORD_LENGTH} letters` };
    }
    const row = game.attempts[playerId] || 0;
    if (row >= ROWS) return { ok: false, error: 'No guesses left' };

    const status = scoreGuess(word, game.answer);
    game.attempts[playerId] = row + 1;

    let ended = null;
    if (status.every((s) => s === 'match')) {
      ended = { winner: playerId, answer: game.answer, reason: 'solved' };
    } else if (game.players.every((p) => (game.attempts[p] || 0) >= ROWS)) {
      ended = { winner: null, answer: game.answer, reason: 'out-of-guesses' };
    }
    if (ended) {
      game.finished = true;
      games.delete(game.id);
    }
    return { ok: true, row, status, outOfGuesses: row + 1 >= ROWS, ended };
  }

  // A player left: end every game they were in. A started game is won by
  // whoever is still there.
  function leave(playerId) {
    const results = [];
    for (const game of games.values()) {
      if (!game.players.includes(playerId)) continue;
      const others = game.players.filter((p) => p !== playerId);
      games.delete(game.id);
      game.finished = true;
      if (others.length > 0) {
        results.push({ gameId: game.id, ended: { winner: others[0], answer: game.answer, reason: 'opponent-left' } });
      }
    }
    return results;
  }

  return { create, join, guess, leave, size: () => games.size };
}

module.exports = { createGames, ROWS, WORD_LENGTH };
