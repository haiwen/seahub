import React, { useMemo } from 'react';
import { getCellValueByColumn } from '../../../utils/cell';

const Text = ({ record, column }) => {
  const readOnly = useMemo(() => !column.editable, [column]);
  const value = useMemo(() => getCellValueByColumn(record, column), [record, column]);

  return (
    <input
      type="text"
      disabled={readOnly}
      value={value}
    />
  );
};

export default Text;
