import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../../../../utils/constants';

const EMPTY_TIP = `(${gettext('Empty')})`;

const GroupTitle = ({ column, cellValue }) => {

  const renderGroupCellVal = useCallback(() => {
    return cellValue || EMPTY_TIP;
  }, [cellValue]);

  return (
    <div className="group-title">
      <div className="group-column-name">{column.name}</div>
      <div className="group-cell-value">{renderGroupCellVal()}</div>
    </div>
  );
};

GroupTitle.propTypes = {
  originalCellValue: PropTypes.any,
  cellValue: PropTypes.any,
  column: PropTypes.object,
};

export default GroupTitle;
