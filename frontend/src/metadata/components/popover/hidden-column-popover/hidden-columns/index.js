import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import HideColumn from './hide-column';
import { gettext } from '../../../../../utils/constants';

const HiddenColumns = ({ readOnly, columns, hiddenColumns, onChange, canReorder, modifyColumnOrder }) => {
  const [draggingColumnKey, setDraggingCellKey] = useState(null);
  const [dragOverColumnKey, setDragOverCellKey] = useState(null);

  const isEmpty = useMemo(() => {
    if (!Array.isArray(columns) || columns.length === 0) return true;
    return false;
  }, [columns]);

  const updateDraggingKey = useCallback((cellKey) => {
    if (cellKey === draggingColumnKey) return;
    setDraggingCellKey(cellKey);
  }, [draggingColumnKey]);

  const updateDragOverKey = useCallback((cellKey) => {
    if (cellKey === dragOverColumnKey) return;
    setDragOverCellKey(cellKey);
  }, [dragOverColumnKey]);

  const draggingColumnIndex = draggingColumnKey ? columns.findIndex(c => c.key === draggingColumnKey) : -1;

  return (
    <div className={classnames('hide-columns-list', { 'empty-hide-columns-container': isEmpty })}>
      {isEmpty && <div className="empty-hide-columns-list">{gettext('No properties available to be hidden')}</div>}
      {!isEmpty && columns.map((column, columnIndex) => {
        return (
          <HideColumn
            key={column.key}
            readOnly={readOnly}
            columnIndex={columnIndex}
            isHidden={!hiddenColumns.includes(column.key)}
            column={column}
            draggingColumnKey={draggingColumnKey}
            draggingColumnIndex={draggingColumnIndex}
            dragOverColumnKey={dragOverColumnKey}
            canReorder={canReorder}
            onChange={onChange}
            onMove={modifyColumnOrder}
            updateDraggingKey={updateDraggingKey}
            updateDragOverKey={updateDragOverKey}
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
  canReorder: PropTypes.bool,
  modifyColumnOrder: PropTypes.func,
};

export default HiddenColumns;
