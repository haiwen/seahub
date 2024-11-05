import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import CellFormatter from '../../../components/cell-formatter';
import { getCellValueByColumn } from '../../../utils/cell';
import { KANBAN_SETTINGS_KEYS } from '../../../constants';

import './index.css';

const Card = ({
  id,
  title,
  fields,
  record,
  draggable,
  settings,
  onDragStart,
  onDragOver,
  onDrop,
  draggingCardId,
}) => {
  const handleDragStart = (event) => {
    event.stopPropagation();
    onDragStart(event, record);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    onDragOver(event, id);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onDrop(event);
  };

  return (
    <div
      className={classNames('sf-metadata-view-kanban-card', {
        'dragging': draggingCardId === id,
      })}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {title.field && (
        <div className="kanban-card-header">
          <CellFormatter value={title.value} field={title.field} readonly={true} />
        </div>
      )}
      <div className={classNames('kanban-card-body', { 'card-text-wrap': settings[KANBAN_SETTINGS_KEYS.TEXT_WRAP] })}>
        {fields.map(field => {
          const value = getCellValueByColumn(record, field);
          if (settings[KANBAN_SETTINGS_KEYS.HIDE_EMPTY_VALUES] && !value) return null;
          return (
            <div key={field.key} className="card-field">
              {settings[KANBAN_SETTINGS_KEYS.SHOW_FIELD_NAMES] && (
                <h5 className="card-property-name">
                  {field.name}
                </h5>
              )}
              {value ? (
                <CellFormatter value={value} field={field} readonly={true} />
              ) : (
                <div className="cell-formatter-container empty-cell-formatter"></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

Card.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.object.isRequired,
  fields: PropTypes.array.isRequired,
  record: PropTypes.object.isRequired,
  draggable: PropTypes.bool.isRequired,
  settings: PropTypes.object.isRequired,
  onDragStart: PropTypes.func.isRequired,
  onDrop: PropTypes.func.isRequired,
  onDragOver: PropTypes.func.isRequired,
  draggingCardId: PropTypes.string,
};

export default Card;
