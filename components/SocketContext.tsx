'use client';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export interface GameResult {
  winner: string | null;
  answer: string;
  reason: 'solved' | 'out-of-guesses' | 'opponent-left';
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  playerId: string | null;
  gameId: string | null;
  players: string[];
  isGameStarted: boolean;
  result: GameResult | null;
  error: string | null;
  createGame: () => void;
  joinGame: (gameId: string) => void;
  makeGuess: (guess: string) => void;
  leaveGame: () => void;
  clearError: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [players, setPlayers] = useState<string[]>([]);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [result, setResult] = useState<GameResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);
    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => {
      setIsConnected(false);
      // The server ends every game of a disconnected player, so any game
      // in progress is gone; go back to the lobby.
      setGameId(null);
      setPlayers([]);
      setIsGameStarted(false);
      setResult(null);
    };
    const onRoster = ({ gameId, players }: { gameId: string; players: string[] }) => {
      setGameId(gameId);
      setPlayers(players);
      setResult(null);
      setError(null);
    };
    const onStart = () => setIsGameStarted(true);
    const onError = (message: string) => setError(message);
    const onEnded = (ended: GameResult) => setResult(ended);

    if (socket.connected) setIsConnected(true);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('gameCreated', onRoster);
    socket.on('gameJoined', onRoster);
    socket.on('gameStart', onStart);
    socket.on('gameError', onError);
    socket.on('gameEnded', onEnded);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('gameCreated', onRoster);
      socket.off('gameJoined', onRoster);
      socket.off('gameStart', onStart);
      socket.off('gameError', onError);
      socket.off('gameEnded', onEnded);
    };
  }, [socket]);

  const createGame = useCallback(() => {
    socket?.emit('createGame');
  }, [socket]);

  const joinGame = useCallback((id: string) => {
    socket?.emit('joinGame', id.trim().toUpperCase());
  }, [socket]);

  const makeGuess = useCallback((guess: string) => {
    if (socket && gameId) socket.emit('makeGuess', { gameId, guess });
  }, [socket, gameId]);

  // Only offered once a game has ended; the server has already removed it.
  const leaveGame = useCallback(() => {
    setGameId(null);
    setPlayers([]);
    setIsGameStarted(false);
    setResult(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        playerId: isConnected ? socket?.id ?? null : null,
        gameId,
        players,
        isGameStarted,
        result,
        error,
        createGame,
        joinGame,
        makeGuess,
        leaveGame,
        clearError,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
