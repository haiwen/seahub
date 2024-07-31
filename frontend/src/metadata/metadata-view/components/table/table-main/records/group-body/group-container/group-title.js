import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  CellType,
  getColumnOptions,
  getOption,
} from '../../../../../../_basic';
import { DELETED_OPTION_BACKGROUND_COLOR } from '../../../../../../constants';
import { gettext } from '../../../../../../utils';
import CellFormatter from '../../../../../cell-formatter';

const GroupTitle = ({ column, cellValue, originalCellValue }) => {
  const emptyTip = useMemo(() => `(${gettext('Empty')})`, []);
  const deletedOptionTip = useMemo(() => gettext('Deleted option'), []);

  const renderGroupCellVal = useCallback(() => {
    const { type } = column;
    switch (type) {
      case CellType.CREATOR:
      case CellType.LAST_MODIFIER: {
        if (!originalCellValue) return emptyTip;
        return (<CellFormatter value={originalCellValue} field={column} />);
      }
      case CellType.NUMBER: {
        if (!cellValue && cellValue !== 0) return emptyTip;
        return cellValue;
      }
      case CellType.COLLABORATOR: {
        if (!Array.isArray(cellValue) || cellValue.length === 0) return emptyTip;
        return (<CellFormatter value={cellValue} field={column} />);
      }
      case CellType.CHECKBOX: {
        return <input className="checkbox" type="checkbox" readOnly={true} checked={cellValue} />;
      }
      case CellType.SINGLE_SELECT: {
        const options = getColumnOptions(column);
        if (options.length === 0 || !originalCellValue) return emptyTip;
        const selectedOption = getOption(options, originalCellValue);
        const style = selectedOption ?
          {
            backgroundColor: selectedOption.color,
            color: selectedOption.textColor
          } :
          { backgroundColor: DELETED_OPTION_BACKGROUND_COLOR };
        const optionName = selectedOption ? selectedOption.name : deletedOptionTip;
        return (<div className="sf-metadata-single-select-option" style={style} key={cellValue} title={optionName}>{optionName}</div>);
      }
      default: {
        return cellValue || emptyTip;
      }
    }
  }, [column, cellValue, originalCellValue, emptyTip, deletedOptionTip]);

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
