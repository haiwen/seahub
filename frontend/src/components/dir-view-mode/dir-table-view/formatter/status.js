import React from 'react';
import TextFormatter from '@/metadata/components/cell-formatter/text';

// Status Formatter - reuses metadata TextFormatter
const StatusFormatter = ({ value, row }) => {
  // Defensive check for row existence
  if (!row) {
    return <span className="dir-table-cell-empty">--</span>;
  }

  const { _status: status } = row;

  // Build TextFormatter expected props
  return (
    <TextFormatter
      value={status}
      className="dir-table-status-formatter"
    />
  );
};

export default StatusFormatter;
