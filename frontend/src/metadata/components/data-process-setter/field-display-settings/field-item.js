import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import Switch from '../../../../components/switch';
import Icon from '../../../../components/icon';

function FieldItem({ field, index, isCollapsed, onToggleField, onMoveField, fieldIconConfig, updateDragOverKey, dragOverColumnKey, draggingColumnIndex, updateDraggingKey }) {
  let enteredCounter = 0;
  const fieldItemRef = useRef(null);
  const [isItemDropTipShow, setDropTipShow] = useState(false);

  const handleClickField = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    const value = e.target.checked;
    if (value === field.shown) return;
    onToggleField(field.key, value);
  };

  const onDragStart = (e) => {
    e.stopPropagation();
    e.dataTransfer.setDragImage(fieldItemRef.current, 10, 10);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/sf-metadata-field-display-setting', field.key);
    updateDraggingKey(field.key);
  };

  const onDragEnter = (e) => {
    e.stopPropagation();
    enteredCounter++;
    if (enteredCounter !== 0 && !isItemDropTipShow) {
      setDropTipShow(true);
    }
    updateDragOverKey(field.key);
  };

  const onDragOver = (e) => {
    if (e.dataTransfer.dropEffect === 'copy') {
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    updateDragOverKey(field.key);
  };

  const onDragLeave = (e) => {
    e.stopPropagation();
    enteredCounter--;
    if (enteredCounter === 0) {
      setDropTipShow(false);
    }
    updateDragOverKey(null);
  };

  const onDrop = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setDropTipShow(false);
    const droppedColumnKey = e.dataTransfer.getData('application/sf-metadata-field-display-setting');
    if (droppedColumnKey === field.key) return;
    onMoveField(droppedColumnKey, field.key);
    updateDragOverKey(null);
    updateDraggingKey(null);
  };

  const placeholder = () => {
    return (
      <div className="sf-metadata-field-display-setting-switch">
        <Icon symbol={fieldIconConfig[field.type]} />
        <span className="text-truncate">{field.name}</span>
      </div>
    );
  };

  const isOver = (dragOverColumnKey === field.key);

  return (
    <div
      ref={fieldItemRef}
      className={classNames('sf-metadata-field-display-setting-item-container',
        { 'd-none': isCollapsed },
        { 'hide-column-can-drop-top': isOver && draggingColumnIndex >= index },
        { 'hide-column-can-drop': isOver && draggingColumnIndex < index },
      )}
      onDrop={onDrop}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      <div className="sf-metadata-field-display-setting-dragbar" draggable="true" onDragStart={onDragStart}>
        <Icon symbol="drag" />
      </div>
      <Switch
        checked={field.shown}
        className="sf-metadata-switch flex-fill"
        placeholder={placeholder()}
        onChange={handleClickField}
      />
    </div>
  );
}

FieldItem.propTypes = {
  isCollapsed: PropTypes.bool,
  index: PropTypes.number.isRequired,
  field: PropTypes.object.isRequired,
  fieldIconConfig: PropTypes.object,
  onToggleField: PropTypes.func.isRequired,
  onMoveField: PropTypes.func.isRequired,
  updateDragOverKey: PropTypes.func.isRequired,
  dragOverColumnKey: PropTypes.string,
  draggingColumnIndex: PropTypes.number,
  updateDraggingKey: PropTypes.func.isRequired,
};

export default FieldItem;
