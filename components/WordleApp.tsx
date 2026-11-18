'use client';
import React from 'react';
import Game from './game';
import Lobby from './Lobby';
import { SocketProvider, useSocket } from './SocketContext';

const Screen: React.FC = () => {
  const { gameId, isGameStarted } = useSocket();
  if (!gameId || !isGameStarted) return <Lobby />;
  // A new game id remounts the board, so every game starts empty.
  return <Game key={gameId} rows={6} columns={5} />;
};

const WordleApp: React.FC = () => (
  <SocketProvider>
    <Screen />
  </SocketProvider>
);

export default WordleApp;
