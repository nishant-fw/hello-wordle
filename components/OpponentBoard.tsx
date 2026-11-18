import React from 'react';
import { InputStatus } from './types';

// The opponent's board: colours only, the server never sends their letters.
const OpponentBoard: React.FC<{ status: InputStatus[]; columns: number }> = ({ status, columns }) => (
  <div className="opponent">
    <p className="opponent-label">Opponent</p>
    <div
      className="opponent-board"
      style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 20px)`, gap: '2px' }}
      aria-label="Opponent progress"
    >
      {status.map((s, i) => (
        <div key={i} className={`opponent-cell input-${s}`} />
      ))}
    </div>
  </div>
);

export default OpponentBoard;
