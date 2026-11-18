# hello-wordle

A two-player Wordle race. Both players guess the same secret five-letter
word; the first to solve it wins. You see your own letters and colours,
and only the colours of your opponent's guesses.

The Next.js app is the client. A small socket.io server in `server/`
picks the word, scores every guess and decides who won, so the answer
never reaches a browser.

## Run it

```bash
npm install
npm run server   # game server on http://localhost:3001
npm run dev      # app on http://localhost:3000
```

Open the app in two browser windows. In one, choose **Create game** and
share the code it shows; in the other, enter the code and choose **Join**.
Type a guess and press Enter in the last cell of the row.

| Variable | Used by | Default |
| --- | --- | --- |
| `PORT` | server | `3001` |
| `CLIENT_ORIGIN` | server (CORS) | `http://localhost:3000` |
| `NEXT_PUBLIC_SOCKET_URL` | app | `http://localhost:3001` |

## Rules

- Six guesses of five letters each. Guesses are not checked against a
  dictionary.
- A player who runs out of guesses waits; the game ends without a winner
  when both have.
- If a player disconnects, the other wins.

## Checks

```bash
npm test         # game rules and scoring (node --test)
npm run lint
npx tsc --noEmit
npm run build
```
