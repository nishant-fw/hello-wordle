const test = require('node:test');
const assert = require('node:assert/strict');
const { scoreGuess } = require('./score');
const { createGames, ROWS } = require('./games');

test('scoreGuess marks exact, present and absent letters', () => {
  assert.deepEqual(scoreGuess('ALIVE', 'ALIVE'), ['match', 'match', 'match', 'match', 'match']);
  assert.deepEqual(scoreGuess('EVILA', 'ALIVE'), ['semi', 'semi', 'match', 'semi', 'semi']);
  assert.deepEqual(scoreGuess('crane', 'ALIVE'), ['mismatch', 'mismatch', 'semi', 'mismatch', 'match']);
});

test('scoreGuess does not over-count repeated letters', () => {
  // One L in the answer, already matched: the other Ls are absent.
  assert.deepEqual(scoreGuess('LLAMA', 'ALIVE'), ['mismatch', 'match', 'semi', 'mismatch', 'mismatch']);
  assert.deepEqual(scoreGuess('EERIE', 'ALIVE'), ['mismatch', 'mismatch', 'mismatch', 'semi', 'match']);
  assert.deepEqual(scoreGuess('SPEED', 'ABIDE'), ['mismatch', 'mismatch', 'semi', 'mismatch', 'semi']);
});

function startedGame() {
  const games = createGames({ pickWord: () => 'ALIVE' });
  const { gameId } = games.create('a');
  const joined = games.join(gameId.toLowerCase(), 'b');
  assert.equal(joined.ok, true);
  assert.equal(joined.started, true);
  return { games, gameId };
}

test('join refuses unknown, full and repeated joins', () => {
  const games = createGames({ pickWord: () => 'ALIVE' });
  assert.equal(games.join('NOPE', 'a').ok, false);
  const { gameId } = games.create('a');
  assert.equal(games.join(gameId, 'a').ok, false);
  assert.equal(games.join(gameId, 'b').ok, true);
  assert.equal(games.join(gameId, 'c').ok, false);
});

test('a guess before the opponent joins is refused', () => {
  const games = createGames({ pickWord: () => 'ALIVE' });
  const { gameId } = games.create('a');
  assert.equal(games.guess(gameId, 'a', 'CRANE').ok, false);
});

test('rows come from the server and invalid guesses are refused', () => {
  const { games, gameId } = startedGame();
  assert.equal(games.guess(gameId, 'a', 'CRAN').ok, false);
  assert.equal(games.guess(gameId, 'a', 'CR4NE').ok, false);
  assert.equal(games.guess(gameId, 'z', 'CRANE').ok, false);
  assert.equal(games.guess(gameId, 'a', 'CRANE').row, 0);
  assert.equal(games.guess(gameId, 'a', 'CRANE').row, 1);
  assert.equal(games.guess(gameId, 'b', 'CRANE').row, 0);
});

test('solving the word ends the game with that player as winner', () => {
  const { games, gameId } = startedGame();
  games.guess(gameId, 'a', 'CRANE');
  const win = games.guess(gameId, 'b', 'alive');
  assert.deepEqual(win.ended, { winner: 'b', answer: 'ALIVE', reason: 'solved' });
  assert.equal(games.guess(gameId, 'a', 'ALIVE').ok, false);
  assert.equal(games.size(), 0);
});

test('the game ends without a winner only when both players run out', () => {
  const { games, gameId } = startedGame();
  for (let i = 0; i < ROWS; i++) {
    const r = games.guess(gameId, 'a', 'CRANE');
    assert.equal(r.ended, null);
    assert.equal(r.outOfGuesses, i === ROWS - 1);
  }
  assert.equal(games.guess(gameId, 'a', 'CRANE').ok, false);
  for (let i = 0; i < ROWS - 1; i++) games.guess(gameId, 'b', 'CRANE');
  const last = games.guess(gameId, 'b', 'CRANE');
  assert.deepEqual(last.ended, { winner: null, answer: 'ALIVE', reason: 'out-of-guesses' });
});

test('leaving a started game hands the win to the opponent', () => {
  const { games, gameId } = startedGame();
  assert.deepEqual(games.leave('a'), [
    { gameId, ended: { winner: 'b', answer: 'ALIVE', reason: 'opponent-left' } },
  ]);
  assert.equal(games.size(), 0);
});

test('leaving a game nobody joined just removes it', () => {
  const games = createGames({ pickWord: () => 'ALIVE' });
  games.create('a');
  assert.deepEqual(games.leave('a'), []);
  assert.equal(games.size(), 0);
});
