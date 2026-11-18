import { useCallback } from 'react';

export const useGameLogic = (
  setIsGameFinished: React.Dispatch<React.SetStateAction<boolean>>,
  setAlert: (message: string, type: string, timeout?: number) => void
) => {
  const endGame = useCallback(() => {
    // Select all input elements with the class 'input'
    const inputs = document.querySelectorAll<HTMLInputElement>('.input');

    // Iterate over each input element
    inputs.forEach((input) => {
      // Disable the input field
      input.disabled = true;

      // Remove any interactive capabilities and the text cursor
      input.style.pointerEvents = 'none'; // Ensure no interactions
      input.style.outline = 'none'; // Remove the text cursor
    });
  }, []);

  const finishGame = useCallback((message: string, type: string) => {
    setIsGameFinished(true);
    endGame();
    setAlert(message, type, 4000);
  }, [setIsGameFinished, endGame, setAlert]);

  return { finishGame, endGame };
};
