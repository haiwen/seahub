import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { getCellValueByColumn } from '../../../utils/cell';
import Icon from '../../../../components/icon';

const CheckBox = ({ record, column, onCommit }) => {
  const value = useMemo(() => getCellValueByColumn(record, column), [record, column]);

  const onChange = useCallback((e) => {
    e && e.stopPropagation();
    onCommit(column, !value);
  }, [value, column, onCommit]);

  return (
    <div className="form-control shrink sf-metadata-checkbox-editor">
      <div className="sf-metadata-checkbox-editor-content" onClick={onChange}>
        {value && <Icon symbol="check-mark" />}
      </div>
    </div>
  );
};

CheckBox.propTypes = {
  record: PropTypes.object.isRequired,
  column: PropTypes.object.isRequired,
  onCommit: PropTypes.func.isRequired,
};

export default CheckBox;
