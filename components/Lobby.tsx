'use client';
import React, { useState } from 'react';
import { useSocket } from './SocketContext';

const Lobby: React.FC = () => {
  const { isConnected, gameId, createGame, joinGame, error, clearError } = useSocket();
  const [code, setCode] = useState('');

  if (!isConnected) {
    return <p className="lobby-text">Connecting to the game server…</p>;
  }

  if (gameId) {
    return (
      <div className="lobby">
        <p className="lobby-text">Share this code with your opponent:</p>
        <p className="lobby-code">{gameId}</p>
        <p className="lobby-text">Waiting for opponent…</p>
      </div>
    );
  }

  return (
    <div className="lobby">
      <button type="button" className="lobby-button" onClick={createGame}>
        Create game
      </button>
      <form
        className="lobby-join"
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) joinGame(code);
        }}
      >
        <input
          className="lobby-input"
          aria-label="Game code"
          placeholder="Game code"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            if (error) clearError();
          }}
        />
        <button type="submit" className="lobby-button" disabled={!code.trim()}>
          Join
        </button>
      </form>
      {error && <p className="lobby-error" role="alert">{error}</p>}
    </div>
  );
};

export default Lobby;
