import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { getCellValueByColumn } from '../../../utils/cell';
import RateEditor from '../../cell-editors/rate-editor';

const Rate = ({ record, column, onCommit }) => {
  const value = useMemo(() => getCellValueByColumn(record, column), [record, column]);

  const onChange = useCallback((update) => {
    onCommit(column, update[column.key]);
  }, [column, onCommit]);

  return (
    <div className="form-control shrink">
      <RateEditor isCellSelected={true} value={value} field={column} onChange={onChange} />
    </div>
  );
};

Rate.propTypes = {
  record: PropTypes.object.isRequired,
  column: PropTypes.object.isRequired,
  onCommit: PropTypes.func.isRequired,
};

export default Rate;
