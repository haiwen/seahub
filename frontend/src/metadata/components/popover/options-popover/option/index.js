import React, { useCallback, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useDrag, useDrop } from 'react-dnd';
import classnames from 'classnames';
import Icon from '../../../../../components/icon';
import IconBtn from '../../../../../components/icon-btn';
import Color from './color';
import Name from './name';

import './index.css';

const Option = ({
  isViewing, isDeleting, isEditing, isPredefined,
  option, index,
  onDelete: propsDelete, onUpdate, onMove,
  onMouseLeave, onMouseEnter: propsMouseEnter, onToggleFreeze, onOpenNameEditor, onCloseNameEditor,
  onRemoveEmptyOption,
}) => {
  const ref = useRef(null);
  const [dropPosition, setDropPosition] = useState(null);

  const [, drag, preview] = useDrag({
    type: 'sfMetadataSingleSelectOption',
    item: () => ({
      idx: index,
      data: option,
    }),
  });

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'sfMetadataSingleSelectOption',
    hover: (item, monitor) => {
      if (!ref.current) return;

      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      const newPosition = hoverClientY < hoverMiddleY ? 'top' : 'bottom';
      setDropPosition(newPosition);
    },
    drop: (item) => {
      if (item.idx === index) return;
      if (item.idx === index - 1 && dropPosition === 'top') return;
      if (item.idx === index + 1 && dropPosition === 'bottom') return;
      onMove(item, { idx: index, data: option });
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    })
  });

  drop(preview(ref));

  const onDelete = useCallback((event) => {
    event.nativeEvent.stopImmediatePropagation();
    propsDelete(option.id);
  }, [option, propsDelete]);

  const onMouseEnter = useCallback(() => {
    propsMouseEnter(option.id);
  }, [option, propsMouseEnter]);

  return (
    <div
      ref={ref}
      className={classnames('sf-metadata-edit-option-container', {
        'sf-metadata-edit-deleting-option': isDeleting,
        'sf-metadata-edit-option-drop-over-top': isOver && canDrop && dropPosition === 'top',
        'sf-metadata-edit-option-drop-over-bottom': isOver && canDrop && dropPosition === 'bottom',
        'sf-metadata-edit-option-viewing': isViewing,
        'sf-metadata-edit-option-editing': isEditing,
        'sf-metadata-edit-option-disabled': isPredefined,
      })}
      onMouseEnter={() => onMouseEnter()}
      onMouseLeave={onMouseLeave}
    >
      <div ref={drag} className="sf-metadata-edit-option-drag-container">
        <Icon symbol="drag" />
      </div>
      <div className="sf-metadata-edit-option-content">
        <Color option={option} onChange={onUpdate} isViewing={isViewing} isPredefined={isPredefined} />
        <Name
          option={option}
          isPredefined={isPredefined}
          isEditing={isEditing}
          onChange={onUpdate}
          onToggleFreeze={onToggleFreeze}
          onOpen={onOpenNameEditor}
          onClose={onCloseNameEditor}
          onRemoveEmptyOption={onRemoveEmptyOption}
        />
      </div>
      <div id={`sf-metadata-edit-option-more-operation-${option.id}`} className="sf-metadata-edit-option-more-operations">
        {(isViewing || isDeleting) && (
          <IconBtn className="sf-metadata-edit-option-operation-item" onClick={onDelete} symbol="delete" />
        )}
      </div>
    </div>
  );
};

Option.propTypes = {
  option: PropTypes.object,
  index: PropTypes.number,
  isPredefined: PropTypes.bool,
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
  onRemoveEmptyOption: PropTypes.func,
};

export default Option;
