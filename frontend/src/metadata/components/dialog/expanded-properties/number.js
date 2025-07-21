import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { getCellValueByColumn, getNumberDisplayString } from '../../../utils/cell';

const Number = ({ record, column }) => {
  const value = useMemo(() => getCellValueByColumn(record, column), [record, column]);
  const displayValue = useMemo(() => getNumberDisplayString(value, column.data), [value, column]);
  return (
    <div className="form-control disabled shrink">
      {displayValue}
    </div>
  );
};

Number.propTypes = {
  record: PropTypes.object.isRequired,
  column: PropTypes.object.isRequired,
};

export default Number;
