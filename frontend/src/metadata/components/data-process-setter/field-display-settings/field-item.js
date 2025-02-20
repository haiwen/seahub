import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import Switch from '../../../../components/switch';
import Icon from '../../../../components/icon';

function FieldItem({ field, isCollapsed, onToggleField, onMoveField, fieldIconConfig }) {
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
    e.dataTransfer.setData('application/sf-metadata-filed-display-setting', field.key);
  };

  const onTableDragEnter = (e) => {
    e.stopPropagation();
    enteredCounter++;
    if (enteredCounter !== 0 && !isItemDropTipShow) {
      setDropTipShow(true);
    }
  };

  const onDragOver = (e) => {
    if (e.dataTransfer.dropEffect === 'copy') {
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDragLeave = (e) => {
    e.stopPropagation();
    enteredCounter--;
    if (enteredCounter === 0) {
      setDropTipShow(false);
    }
  };

  const onDrop = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setDropTipShow(false);
    const droppedColumnKey = e.dataTransfer.getData('application/sf-metadata-filed-display-setting');
    if (droppedColumnKey === field.key) return;
    onMoveField(droppedColumnKey, field.key);
  };

  const placeholder = () => {
    return (
      <div className="sf-metadata-filed-display-setting-switch">
        <Icon symbol={fieldIconConfig[field.type]} />
        <span className="text-truncate">{field.name}</span>
      </div>
    );
  };

  return (
    <div
      ref={fieldItemRef}
      className={`sf-metadata-filed-display-setting-item-container ${isCollapsed ? 'd-none' : ''}`}
      onDrop={onDrop}
      onDragEnter={onTableDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      <div className="sf-metadata-filed-display-setting-dragbar" draggable="true" onDragStart={onDragStart}>
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
  field: PropTypes.object.isRequired,
  fieldIconConfig: PropTypes.object,
  onToggleField: PropTypes.func.isRequired,
  onMoveField: PropTypes.func.isRequired,
};

export default FieldItem;
