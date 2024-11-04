import React, { useState } from 'react';
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
  dragSourceListId,
  onDragSourceListId,
  dragOverListId,
  onDragOverListId,
  placeholderHeight,
  onSetPlaceholderHeight,
}) => {
  const [draggingCardId, setDraggingCardId] = useState(null);

  const handleDragStart = (event, record) => {
    const height = event.target.offsetHeight;
    onSetPlaceholderHeight(height);
    const dragData = JSON.stringify({ record, sourceListId: id });
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/kanban-card', dragData);
    setDraggingCardId(record.id);
    onDragSourceListId(id);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    onDragOverListId(id);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const dragData = event.dataTransfer.getData('application/kanban-card');
    if (!dragData) return;

    const { record, sourceListId } = JSON.parse(dragData);
    onCardDrop(record, sourceListId, id);

    setDraggingCardId(null);
    onDragSourceListId(null);
    onDragOverListId(null);
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
        {dragSourceListId && dragSourceListId !== dragOverListId && dragOverListId === id && (
          <div
            className="kanban-card-placeholder"
            style={{ height: `${placeholderHeight}px` }}
          />
        )}
        {cards.map((card) => (
          <Card
            key={card.id}
            id={card.id}
            title={card.title}
            fields={shownColumns}
            record={card.record}
            draggable={draggable}
            settings={settings}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            draggingCardId={draggingCardId}
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
