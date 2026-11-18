'use client';
import React, { useState, useRef, useEffect, useContext, useCallback } from 'react';
import AlertContext from '../context/alert/alertContext';
import { GameProps, InputStatus } from './types';
import { useGameLogic } from './useGameLogic';
import { useInputHandling } from './useInputHandling';
import GameBoard from './GameBoard';
import OpponentBoard from './OpponentBoard';
import { GameResult, useSocket } from './SocketContext';

const noopAlert = () => {};

interface GuessResult {
  row: number;
  status: InputStatus[];
  outOfGuesses: boolean;
}

function resultMessage(result: GameResult, playerId: string | null): [string, string] {
  if (result.reason === 'opponent-left') return ['Your opponent left. You win!', 'success'];
  if (result.winner && result.winner === playerId) return ['You won!', 'success'];
  if (result.winner) return [`Your opponent got it first. The word was ${result.answer}.`, 'info'];
  return [`Nobody got it. The word was ${result.answer}.`, 'info'];
}

const Game: React.FC<GameProps> = ({ rows, columns }) => {
  const totalInputs = rows * columns;
  const [inputs, setInputs] = useState<string[]>(Array(totalInputs).fill(''));
  const [inputStatus, setInputStatus] = useState<InputStatus[]>(Array(totalInputs).fill('unattempted'));
  const [opponentStatus, setOpponentStatus] = useState<InputStatus[]>(Array(totalInputs).fill('unattempted'));
  const [activeRow, setActiveRow] = useState(0);
  const inputsRef = useRef<HTMLDivElement>(null);
  const [lastFocusedIndex, setLastFocusedIndex] = useState(0);
  const [isGameFinished, setIsGameFinished] = useState(false);
  // True between sending a guess and hearing back, so Enter cannot send it twice.
  const pendingGuess = useRef(false);
  const alertContext = useContext(AlertContext);
  const setAlert = alertContext?.setAlert ?? noopAlert;
  const { socket, gameId, playerId, makeGuess, result, error, clearError, leaveGame } = useSocket();

  const { finishGame, endGame } = useGameLogic(setIsGameFinished, setAlert);

  const submitGuess = useCallback((guess: string) => {
    if (pendingGuess.current || isGameFinished) return;
    pendingGuess.current = true;
    makeGuess(guess);
  }, [isGameFinished, makeGuess]);

  const { handleInput, handleKeyUp } = useInputHandling(
    inputs,
    setInputs,
    inputsRef,
    activeRow,
    columns,
    setLastFocusedIndex,
    submitGuess
  );

  useEffect(() => {
    if (!socket) return;

    const fillRow = (prev: InputStatus[], row: number, status: InputStatus[]) => {
      const next = [...prev];
      for (let i = 0; i < columns; i++) next[row * columns + i] = status[i];
      return next;
    };

    const onGuessResult = ({ row, status, outOfGuesses }: GuessResult) => {
      pendingGuess.current = false;
      setInputStatus((prev) => fillRow(prev, row, status));
      if (status.every((s) => s === 'match')) return; // gameEnded follows
      if (outOfGuesses) {
        endGame();
        setAlert('Out of guesses. Waiting for your opponent…', 'info', 4000);
      } else {
        setActiveRow(row + 1);
      }
    };

    const onOpponentProgress = ({ row, status }: { row: number; status: InputStatus[] }) => {
      setOpponentStatus((prev) => fillRow(prev, row, status));
    };

    const onError = () => {
      pendingGuess.current = false;
    };

    socket.on('guessResult', onGuessResult);
    socket.on('opponentProgress', onOpponentProgress);
    socket.on('gameError', onError);

    return () => {
      socket.off('guessResult', onGuessResult);
      socket.off('opponentProgress', onOpponentProgress);
      socket.off('gameError', onError);
    };
  }, [socket, columns, endGame, setAlert]);

  useEffect(() => {
    if (!error) return;
    setAlert(error, 'danger');
    clearError();
  }, [error, setAlert, clearError]);

  useEffect(() => {
    if (!result) return;
    const [message, type] = resultMessage(result, playerId);
    finishGame(message, type);
  }, [result, playerId, finishGame]);

  // Move to the first cell of the active row whenever it changes.
  useEffect(() => {
    const first = activeRow * columns;
    (inputsRef.current?.children[first] as HTMLInputElement | undefined)?.focus();
    setLastFocusedIndex(first);
  }, [activeRow, columns]);

  useEffect(() => {
    if (isGameFinished) return;
    const inputsDiv = inputsRef.current;
    if (!inputsDiv) return;

    const preventMouseFocusChange = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const activeRowStart = activeRow * columns;
      const activeRowEnd = activeRowStart + columns - 1;
      if (lastFocusedIndex >= activeRowStart && lastFocusedIndex <= activeRowEnd) {
        (inputsDiv.children[lastFocusedIndex] as HTMLInputElement).focus();
      }
    };

    document.addEventListener('mousedown', preventMouseFocusChange);
    document.addEventListener('touchstart', preventMouseFocusChange);

    return () => {
      document.removeEventListener('mousedown', preventMouseFocusChange);
      document.removeEventListener('touchstart', preventMouseFocusChange);
    };
  }, [lastFocusedIndex, activeRow, columns, isGameFinished]);

  if (!alertContext) {
    return <div>Context is not provided!</div>;
  }

  return (
    <div className="game">
      <p className="game-title">Game {gameId}</p>
      <div className="game-boards">
        <GameBoard
          inputs={inputs}
          inputStatus={inputStatus}
          columns={columns}
          rows={rows}
          inputsRef={inputsRef}
          activeRow={activeRow}
          handleInput={handleInput}
          handleKeyUp={handleKeyUp}
        />
        <OpponentBoard status={opponentStatus} columns={columns} />
      </div>
      {result && (
        <div className="game-result" role="status">
          <p>{resultMessage(result, playerId)[0]}</p>
          <button type="button" className="lobby-button" onClick={leaveGame}>
            Back to lobby
          </button>
        </div>
      )}
    </div>
  );
};

export default Game;
