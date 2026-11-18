// Wordle scoring, kept on the server so clients never see the answer.
// Two passes so repeated letters are coloured the way Wordle does it:
// exact matches claim their letter first, then the leftovers are handed
// out left to right as 'semi'.
function scoreGuess(guess, answer) {
  const g = guess.toUpperCase().split('');
  const a = answer.toUpperCase().split('');
  if (g.length !== a.length) {
    throw new Error(`guess has ${g.length} letters, answer has ${a.length}`);
  }

  const status = Array(a.length).fill('mismatch');
  const remaining = {};

  for (let i = 0; i < a.length; i++) {
    if (g[i] === a[i]) {
      status[i] = 'match';
    } else {
      remaining[a[i]] = (remaining[a[i]] || 0) + 1;
    }
  }

  for (let i = 0; i < a.length; i++) {
    if (status[i] !== 'match' && remaining[g[i]] > 0) {
      status[i] = 'semi';
      remaining[g[i]]--;
    }
  }

  return status;
}

module.exports = { scoreGuess };
