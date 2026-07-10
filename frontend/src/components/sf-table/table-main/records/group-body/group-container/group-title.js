import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../../../../utils/constants';
import { CellType } from '../../../../../../metadata/constants';
import { getOptionName } from '../../../../../../metadata/utils/cell';

const EMPTY_TIP = `(${gettext('Empty')})`;

const GroupTitle = ({ column, cellValue }) => {

  const renderGroupCellVal = useCallback(() => {
    if (!cellValue) return EMPTY_TIP;

    if (column.type === CellType.SINGLE_SELECT) {
      const optionName = getOptionName(column.data?.options, cellValue);
      return optionName || cellValue;
    }

    return cellValue;
  }, [column, cellValue]);

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
