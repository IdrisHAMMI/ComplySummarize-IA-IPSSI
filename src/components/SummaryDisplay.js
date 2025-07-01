import React from 'react';

const SummaryDisplay = ({ summary }) => {
  return (
    <div className="summary-display">
      <h2>Résumé</h2>
      <p>{summary}</p>
    </div>
  );
};

export default SummaryDisplay;
