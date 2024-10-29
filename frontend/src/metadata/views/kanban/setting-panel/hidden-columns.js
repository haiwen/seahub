import { useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useMetadataView } from '../../../hooks/metadata-view';
import classNames from 'classnames';
import { gettext } from '../../../../utils/constants';
import { COLUMNS_ICON_CONFIG, EVENT_BUS_TYPE } from '../../../constants';
import { Icon, Switch } from '@seafile/sf-metadata-ui-component';

const KanbanHiddenColumns = ({ settings, onChange }) => {
  const [currentIndex, setCurrentIndex] = useState(-1);
  const { metadata } = useMetadataView();

  const columns = useMemo(() => {
    return metadata.view.columns.filter(col => col.key !== settings.groupByColumnKey);
  }, [metadata.view.columns, settings.groupByColumnKey]);

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

  const handleChange = useCallback((columnKey) => {
    const newHiddenColumns = settings.hiddenColumns.slice(0);
    const columnIndex = newHiddenColumns.indexOf(columnKey);
    if (columnIndex > -1) {
      newHiddenColumns.splice(columnIndex, 1);
    } else {
      newHiddenColumns.push(columnKey);
    }
    onChange(newHiddenColumns);
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.MODIFY_HIDDEN_COLUMNS, newHiddenColumns);
  }, [settings, onChange]);

  const handleDragStart = useCallback((event, columnIndex) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/hide-column-item', columnIndex);
  }, []);

  const handleDrop = useCallback((event, targetIndex) => {
    event.preventDefault();
    const dragIndex = parseInt(event.dataTransfer.getData('application/hide-column-item'), 10);
    if (dragIndex !== targetIndex) {
      const sourceColumnKey = columns[dragIndex].key;
      const targetColumnKey = columns[targetIndex].key;

      window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.MODIFY_COLUMN_ORDER, sourceColumnKey, targetColumnKey);
    }
  }, [columns]);

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const hideAll = useCallback(() => {
    const hiddenColumns = columns.map(column => column.key);
    onChange(hiddenColumns);
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.MODIFY_HIDDEN_COLUMNS, hiddenColumns);
  }, [columns, onChange]);

  const showAll = useCallback(() => {
    onChange([]);
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.MODIFY_HIDDEN_COLUMNS, []);
  }, [onChange]);

  return (
    <div className="sf-metadata-kanban-hide-columns">
      <div className={classNames('hide-columns-list', { 'empty-hide-columns-container': isEmpty })}>
        {isEmpty && <div className="empty-hide-columns-list">{gettext('No properties available to be hidden')}</div>}
        {!isEmpty && columns.map((column, columnIndex) => {
          return (
            <div
              key={column.key}
              className="hide-column-item"
              onMouseEnter={() => onMouseEnter(columnIndex)}
              onMouseLeave={onMouseLeave}
              onDragStart={(event) => handleDragStart(event, columnIndex)}
              onDrop={(event) => handleDrop(event, columnIndex)}
              onDragOver={handleDragOver}
            >
              <div className="drag-hide-column-handle">
                <Icon iconName="drag" />
              </div>
              <Switch
                checked={!settings.hiddenColumns.includes(column.key)}
                placeholder={(
                  <>
                    <Icon iconName={COLUMNS_ICON_CONFIG[column.type]} />
                    <span className="text-truncate">{column.name}</span>
                  </>
                )}
                onChange={() => handleChange(column.key)}
                switchClassName="hide-column-item-switch"
              />
            </div>
          );
        })}
        {!isEmpty && (
          <div className="sf-metadata-hide-columns-operations">
            <div className="sf-metadata-hide-columns-operation px-2" onClick={hideAll} aria-label={gettext('Hide all')}>{gettext('Hide all')}</div>
            <div className="sf-metadata-hide-columns-operation px-2" onClick={showAll} aria-label={gettext('Show all')}>{gettext('Show all')}</div>
          </div>
        )}
      </div>
    </div>
  );
};

KanbanHiddenColumns.propTypes = {
  settings: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default KanbanHiddenColumns;
