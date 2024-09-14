import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { DragSource, DropTarget } from 'react-dnd';
import { Icon, Switch } from '@seafile/sf-metadata-ui-component';
import { COLUMNS_ICON_CONFIG } from '../../../../constants';

const dragSource = {
  beginDrag: props => {
    return { key: props.column.key, column: props.column };
  },
  endDrag(props, monitor) {
    const source = monitor.getItem();
    const didDrop = monitor.didDrop();
    let target = {};
    if (!didDrop) {
      return { source, target };
    }
  },
  isDragging(props) {
    const { columnIndex, currentIndex } = props;
    return currentIndex > columnIndex;
  }
};
const dropTarget = {
  drop(props, monitor) {
    const source = monitor.getItem();
    const { column: targetColumn } = props;
    if (targetColumn.key !== source.key && source.column.frozen === targetColumn.frozen) {
      const target = { key: targetColumn.key };
      props.onMove(source.key, target.key);
    }
  }
};

const dragCollect = (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  connectDragPreview: connect.dragPreview(),
  isDragging: monitor.isDragging(),
});

const dropCollect = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop(),
  dragged: monitor.getItem(),
});

const HideColumnItem = ({
  isOver,
  isDragging,
  canDrop,
  connectDragSource,
  connectDragPreview,
  connectDropTarget,
  readOnly,
  column,
  columnIndex,
  isHidden,
  onChange,
  onMouseEnter,
  onMouseLeave,
}) => {

  const update = useCallback(() => {
    if (readOnly) return;
    onChange(column.key);
  }, [readOnly, column, onChange]);

  return (
    <>
      {connectDropTarget(
        connectDragPreview(
          <div
            className={classNames('hide-column-item', {
              'disabled': readOnly,
              'hide-column-can-drop-top': isOver && canDrop && isDragging,
              'hide-column-can-drop': isOver && canDrop && !isDragging
            })}
            onMouseEnter={() => onMouseEnter(columnIndex)}
            onMouseLeave={onMouseLeave}
          >
            {!readOnly && (
              <>
                {connectDragSource(
                  <div className="drag-hide-column-handle">
                    <Icon iconName="drag" />
                  </div>
                )}
              </>
            )}
            <Switch
              disabled={readOnly}
              checked={isHidden}
              placeholder={(
                <>
                  <Icon iconName={COLUMNS_ICON_CONFIG[column.type]} />
                  <span className="text-truncate">{column.name}</span>
                </>
              )}
              onChange={update}
              switchClassName="hide-column-item-switch"
            />
          </div>
        )
      )}
    </>
  );
};

HideColumnItem.propTypes = {
  readOnly: PropTypes.bool,
  isHidden: PropTypes.bool,
  columnIndex: PropTypes.number,
  currentIndex: PropTypes.number,
  column: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onMove: PropTypes.func,
  onMouseEnter: PropTypes.func,
  onMouseLeave: PropTypes.func,
};

export default DropTarget('sfMetadataHiddenColumns', dropTarget, dropCollect)(
  DragSource('sfMetadataHiddenColumns', dragSource, dragCollect)(HideColumnItem)
);
