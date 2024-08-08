import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { gettext } from '../../../../utils';
import HideColumn from './hide-column';

const HiddenColumns = ({ readOnly, columns, hiddenColumns, onChange }) => {
  const isEmpty = useMemo(() => {
    if (!Array.isArray(columns) || columns.length === 0) return true;
    return false;
  }, [columns]);

  return (
    <div className={classnames('hide-columns-list', { 'empty-hide-columns-container': isEmpty })}>
      {isEmpty && <div className="empty-hide-columns-list">{gettext('No properties available to be hidden')}</div>}
      {!isEmpty && columns.map((column) => {
        return (
          <HideColumn
            key={column.key}
            readOnly={readOnly}
            isHidden={hiddenColumns.includes(column.key)}
            column={column}
            onChange={onChange}
          />
        );
      })}
    </div>
  );
};

HiddenColumns.propTypes = {
  readOnly: PropTypes.bool,
  hiddenColumns: PropTypes.array,
  columns: PropTypes.array,
  onChange: PropTypes.func,
};

export default HiddenColumns;
