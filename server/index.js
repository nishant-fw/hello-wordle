// Multiplayer game server: two players race to guess the same word.
const http = require('http');
const { Server } = require('socket.io');
const { createGames, ROWS, WORD_LENGTH } = require('./games');

const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

const server = http.createServer();
const io = new Server(server, { cors: { origin: CLIENT_ORIGIN } });
const games = createGames();

io.on('connection', (socket) => {
  socket.on('createGame', () => {
    const result = games.create(socket.id);
    socket.join(result.gameId);
    socket.emit('gameCreated', { gameId: result.gameId, players: result.players });
  });

  socket.on('joinGame', (gameId) => {
    const result = games.join(gameId, socket.id);
    if (!result.ok) {
      socket.emit('gameError', result.error);
      return;
    }
    socket.join(result.gameId);
    io.to(result.gameId).emit('gameJoined', { gameId: result.gameId, players: result.players });
    if (result.started) {
      io.to(result.gameId).emit('gameStart', { rows: ROWS, columns: WORD_LENGTH });
    }
  });

  socket.on('makeGuess', ({ gameId, guess } = {}) => {
    const result = games.guess(gameId, socket.id, guess);
    if (!result.ok) {
      socket.emit('gameError', result.error);
      return;
    }
    socket.emit('guessResult', { row: result.row, status: result.status, outOfGuesses: result.outOfGuesses });
    // The opponent sees colours only, never letters.
    socket.to(gameId).emit('opponentProgress', { row: result.row, status: result.status });
    if (result.ended) {
      io.to(gameId).emit('gameEnded', result.ended);
      io.in(gameId).socketsLeave(gameId);
    }
  });

  socket.on('disconnect', () => {
    for (const { gameId, ended } of games.leave(socket.id)) {
      io.to(gameId).emit('gameEnded', ended);
      io.in(gameId).socketsLeave(gameId);
    }
  });
});

server.listen(PORT, () => console.log(`Game server listening on port ${PORT}`));
