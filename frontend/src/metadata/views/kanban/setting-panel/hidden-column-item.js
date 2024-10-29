import React, { useRef, useCallback } from 'react';
import { Icon } from '@seafile/sf-metadata-ui-component';
import PropTypes from 'prop-types';
import Switch from '../../../../components/common/switch';
import { COLUMNS_ICON_CONFIG, EVENT_BUS_TYPE } from '../../../constants';

const HiddenColumnItem = ({ isHidden, column, columnIndex, currentIndex, onUpdateCurrentIndex, onChange }) => {
  const fieldItemRef = useRef(null);

  const handleMouseEnter = useCallback(() => {
    if (currentIndex === columnIndex) return;
    onUpdateCurrentIndex(columnIndex);
  }, [currentIndex, columnIndex, onUpdateCurrentIndex]);

  const handleMouseLeave = useCallback(() => {
    onUpdateCurrentIndex(-1);
  }, [onUpdateCurrentIndex]);

  const handleDragStart = useCallback((event) => {
    event.stopPropagation();
    event.dataTransfer.setDragImage(fieldItemRef.current, 10, 10);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', column.key);
  }, [column]);

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    const sourceColumnKey = event.dataTransfer.getData('text/plain');
    if (sourceColumnKey === column.key) return;
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.MODIFY_COLUMN_ORDER, sourceColumnKey, column.key, true);
  }, [column]);

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleChange = useCallback(() => {
    onChange(column.key);
  }, [column.key, onChange]);

  return (
    <div
      ref={fieldItemRef}
      className="hide-column-item"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <div
        className="drag-hide-column-handle"
        draggable={true}
        onDragStart={handleDragStart}
      >
        <Icon iconName="drag" />
      </div>
      <Switch
        checked={!isHidden}
        placeholder={(
          <>
            <Icon iconName={COLUMNS_ICON_CONFIG[column.type]} />
            <span className="text-truncate">{column.name}</span>
          </>
        )}
        onChange={handleChange}
        className="hide-column-item-switch"
      />
    </div>
  );
};

HiddenColumnItem.propTypes = {
  isHidden: PropTypes.bool,
  column: PropTypes.object,
  columnIndex: PropTypes.number,
  currentIndex: PropTypes.number,
  onUpdateCurrentIndex: PropTypes.func,
  onChange: PropTypes.func,
};

export default HiddenColumnItem;
