import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import CellFormatter from '../../../components/cell-formatter';
import { getCellValueByColumn } from '../../../utils/cell';
import { KANBAN_SETTINGS_KEYS } from '../../../constants';

import './index.css';

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
    event.preventDefault();
    event.stopPropagation();
    onDrop(event);
  };

  return (
    <div
      className="sf-metadata-view-kanban-card"
      draggable={draggable}
      onDragStart={handleDragStart}
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
              {settings[KANBAN_SETTINGS_KEYS.SHOW_FIELD_NAMES] && <label>{field.name}</label>}
              {value ? (
                <CellFormatter value={value} field={field} readonly={true} />
              ) : (
                <div className="empty-cell-formatter"></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

Card.propTypes = {
  title: PropTypes.object.isRequired,
  fields: PropTypes.array.isRequired,
  record: PropTypes.object.isRequired,
  draggable: PropTypes.bool.isRequired,
  settings: PropTypes.object.isRequired,
  onDragStart: PropTypes.func.isRequired,
  onDrop: PropTypes.func.isRequired,
};

export default Card;
