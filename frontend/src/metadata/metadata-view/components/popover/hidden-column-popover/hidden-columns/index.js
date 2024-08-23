import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { DropTarget } from 'react-dnd';
import { gettext } from '../../../../utils';
import HideColumn from './hide-column';
import html5DragDropContext from '../../../../../../pages/wiki2/wiki-nav/html5DragDropContext';

const HiddenColumns = ({ readOnly, columns, hiddenColumns, onChange, modifyColumnOrder }) => {
  const [currentIndex, setCurrentIndex] = useState(-1);

  const isEmpty = useMemo(() => {
    if (!Array.isArray(columns) || columns.length === 0) return true;
    return false;
  }, [columns]);

  const onMouseEnter = useCallback((columnIndex) => {
    if (currentIndex === columnIndex) return;
    setCurrentIndex(columnIndex);
  }, [currentIndex]);

  const onMouseLeave = useCallback(() => {
    setCurrentIndex(-1);
  }, []);

  return (
    <div className={classnames('hide-columns-list', { 'empty-hide-columns-container': isEmpty })}>
      {isEmpty && <div className="empty-hide-columns-list">{gettext('No properties available to be hidden')}</div>}
      {!isEmpty && columns.map((column, columnIndex) => {
        return (
          <HideColumn
            key={column.key}
            readOnly={readOnly}
            columnIndex={columnIndex}
            currentIndex={currentIndex}
            isHidden={!hiddenColumns.includes(column.key)}
            column={column}
            onChange={onChange}
            onMove={modifyColumnOrder}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
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
  modifyColumnOrder: PropTypes.func,
};

const DndHiddenColumns = DropTarget('sfMetadataHiddenColumns', {}, connect => ({
  connectDropTarget: connect.dropTarget()
}))(HiddenColumns);

export default html5DragDropContext(DndHiddenColumns);
