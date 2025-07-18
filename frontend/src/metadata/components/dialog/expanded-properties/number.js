import React from 'react';
import { getCellValueByColumn, getNumberDisplayString } from '../../../utils/cell';

const Number = ({ record, column }) => {
  const value = getCellValueByColumn(record, column);
  const displayValue = getNumberDisplayString(value, column.data);
  return (
    <div className="form-control disabled shrink">
      {displayValue}
    </div>
  );
};

export default Number;
