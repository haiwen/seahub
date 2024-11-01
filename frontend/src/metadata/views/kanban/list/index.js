import React from 'react';
import PropTypes from 'prop-types';
import Card from '../card';
import CellFormatter from '../../../components/cell-formatter';
import ListMoreOperations from './list-more-operations';
import { UNCATEGORIZED } from '../../../constants';

import './index.css';

const List = ({
  id,
  title,
  field,
  shownColumns,
  cards,
  settings,
  moreOperationsList,
  draggable,
  onCardDrop,
}) => {
  const handleDragStart = (event, record) => {
    const dragData = JSON.stringify({ record, sourceListId: id });
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/kanban-card', dragData);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const dragData = event.dataTransfer.getData('application/kanban-card');
    if (!dragData) return;
    const { record, sourceListId } = JSON.parse(dragData);
    onCardDrop(record, sourceListId, id);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  return (
    <div
      className="sf-metadata-view-kanban-list"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="list-header">
        <div className="list-header-title">
          {id === UNCATEGORIZED ? (
            <span>{title}</span>
          ) : (
            <CellFormatter value={title} field={field} readonly={true} />
          )}
        </div>
        {id !== UNCATEGORIZED && (
          <div className="list-header-more-operation">
            <ListMoreOperations
              listId={id}
              field={field}
              moreOperationsList={moreOperationsList}
            />
          </div>
        )}
      </div>
      <div className="list-body">
        {cards.map(card => (
          <Card
            key={card.id}
            title={card.title}
            fields={shownColumns}
            record={card.record}
            draggable={draggable}
            settings={settings}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
          />
        ))}
      </div>
    </div>
  );
};

List.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.array]).isRequired,
  field: PropTypes.object.isRequired,
  shownColumns: PropTypes.array.isRequired,
  cards: PropTypes.array.isRequired,
  settings: PropTypes.object.isRequired,
  moreOperationsList: PropTypes.array.isRequired,
  draggable: PropTypes.bool.isRequired,
  onCardDrop: PropTypes.func.isRequired,
};

export default List;
