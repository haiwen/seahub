import React from 'react';
import classNames from 'classnames';
import CellFormatter from '../../../components/cell-formatter';
import { getCellValueByColumn } from '../../../utils/cell';

const Card = ({
  title,
  fields,
  record,
  draggable,
  settings,
  onDragStart,
  onDrop,
}) => {
  const handleDragStart = (event) => {
    event.stopPropagation();
    onDragStart(event, record);
  };

  const handleDrop = (event) => {
    onDrop(event);
  };

  return (
    <div
      className='sf-metadata-view-kanban-card'
      draggable={draggable}
      onDragStart={handleDragStart}
      onDrop={handleDrop}
    >
      {title.field && (
        <div className='kanban-card-header'>
          <CellFormatter value={title.value} field={title.field} readonly={true} />
        </div>
      )}
      <div className={classNames('kanban-card-body', { 'card-text-wrap': settings.textWrap })}>
        {fields.map(field => {
          const value = getCellValueByColumn(record, field);
          if (settings.hideEmptyValues && !value) return null;
          return (
            <div key={field.key} className='card-field'>
              {settings.showFieldNames && <label>{field.name}</label>}
              <CellFormatter value={value} field={field} readonly={true} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Card;
