import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { DragSource, DropTarget } from 'react-dnd';
import classnames from 'classnames';
import { IconBtn, Icon } from '@seafile/sf-metadata-ui-component';
import Color from './color';
import Name from './name';

import './index.css';

const dragSource = {
  beginDrag: props => {
    return { idx: props.index, data: props.option, mode: 'sfMetadataSingleSelectOption' };
  },
  endDrag(props, monitor) {
    const optionSource = monitor.getItem();
    const didDrop = monitor.didDrop();
    let optionTarget = {};
    if (!didDrop) {
      return { optionSource, optionTarget };
    }
  },
  isDragging(props, monitor) {
    const { index, dragged } = props;
    const { idx } = dragged;
    return idx > index;
  }
};

const dragCollect = (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  connectDragPreview: connect.dragPreview(),
  isDragging: monitor.isDragging()
});

const dropTarget = {
  drop(props, monitor) {
    const optionSource = monitor.getItem();
    const { index: targetIdx } = props;
    if (targetIdx !== optionSource.idx) {
      const optionTarget = { idx: targetIdx, data: props.option };
      props.onMove(optionSource, optionTarget);
    }
  }
};

const dropCollect = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop(),
  dragged: monitor.getItem()
});

const Option = ({
  isOver, isDragging, canDrop, connectDragSource, connectDragPreview, connectDropTarget,
  isViewing, isDeleting, isEditing,
  option,
  onDelete: propsDelete, onUpdate,
  onMouseLeave, onMouseEnter: propsMouseEnter, onToggleFreeze, onOpenNameEditor, onCloseNameEditor,
}) => {

  const onDelete = useCallback((event) => {
    event.nativeEvent.stopImmediatePropagation();
    propsDelete(option.id);
  }, [option, propsDelete]);

  const onMouseEnter = useCallback(() => {
    propsMouseEnter(option.id);
  }, [option, propsMouseEnter]);

  return connectDropTarget(
    connectDragPreview(
      <div
        className={classnames('sf-metadata-edit-option-container', {
          'sf-metadata-edit-option-can-drop': isOver && canDrop && !isDragging,
          'sf-metadata-edit-deleting-option': isDeleting,
          'sf-metadata-edit-option-can-drop-top': isOver && canDrop && isDragging,
          'sf-metadata-edit-option-viewing': isViewing,
          'sf-metadata-edit-option-editing': isEditing,
        })}
        onMouseEnter={() => onMouseEnter()}
        onMouseLeave={onMouseLeave}
      >
        {connectDragSource(
          <div className="sf-metadata-edit-option-drag-container">
            <Icon iconName="drag" />
          </div>
        )}
        <div className="sf-metadata-edit-option-content">
          <Color option={option} onChange={onUpdate} isViewing={isViewing} />
          <Name
            option={option}
            isEditing={isEditing}
            onChange={onUpdate}
            onToggleFreeze={onToggleFreeze}
            onOpen={onOpenNameEditor}
            onClose={onCloseNameEditor}
          />
        </div>
        <div id={`sf-metadata-edit-option-more-operation-${option.id}`} className="sf-metadata-edit-option-more-operations">
          {(isViewing || isDeleting) && (
            <IconBtn className="sf-metadata-edit-option-operation-item" onClick={onDelete} iconName="delete" />
          )}
        </div>
      </div>
    )
  );
};

Option.propTypes = {
  // normal
  option: PropTypes.object,
  index: PropTypes.number,
  isDeleting: PropTypes.bool,
  isEditing: PropTypes.bool,
  isViewing: PropTypes.bool,
  onMove: PropTypes.func,
  onDelete: PropTypes.func,
  onUpdate: PropTypes.func,
  onMouseEnter: PropTypes.func,
  onMouseLeave: PropTypes.func,
  onToggleFreeze: PropTypes.func,
  onOpenNameEditor: PropTypes.func.isRequired,
  onCloseNameEditor: PropTypes.func.isRequired,

  // drag
  isOver: PropTypes.bool,
  canDrop: PropTypes.bool,
  dragged: PropTypes.object,
  connectDragSource: PropTypes.func.isRequired,
  connectDropTarget: PropTypes.func.isRequired,
  connectDragPreview: PropTypes.func.isRequired,
};

export default DropTarget('sfMetadataSingleSelectOption', dropTarget, dropCollect)(
  DragSource('sfMetadataSingleSelectOption', dragSource, dragCollect)(Option)
);
