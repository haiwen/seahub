import React, { Fragment, useState } from 'react';
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
  const [placeholderIndex, setPlaceholderIndex] = useState(null);

  const handleDragStart = (event, record) => {
    const height = event.target.offsetHeight;
    onSetPlaceholderHeight(height);
    const dragData = JSON.stringify({ record, sourceListId: id });
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/kanban-card', dragData);
    setDraggingCardId(record._id);
    onDragSourceListId(id);

    const dragImage = event.target.cloneNode(true);
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-9999px';
    dragImage.style.left = '-9999px';
    dragImage.style.width = `${event.target.offsetWidth}px`;
    dragImage.classList.add('dragging');
    dragImage.style.cursor = 'grabbing';
    document.body.appendChild(dragImage);

    const offsetX = event.clientX - event.target.getBoundingClientRect().left;
    const offsetY = event.clientY - event.target.getBoundingClientRect().top;
    event.dataTransfer.setDragImage(dragImage, offsetX, offsetY);

    event.target.addEventListener('dragend', () => {
      if (document.body.contains(dragImage)) {
        document.body.removeChild(dragImage);
      }
      setDraggingCardId(null);
      setPlaceholderIndex(null);
    });
  };

  const handleDragOver = (event, cardId) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    onDragOverListId(id);

    const target = event.target.closest('.sf-metadata-view-kanban-card');
    if (target) {
      const targetRect = target.getBoundingClientRect();
      const offset = event.clientY - targetRect.top;
      const targetIndex = cards.findIndex(card => card.id === cardId);
      const newPlaceholderIndex = offset < targetRect.height / 2 ? targetIndex : targetIndex + 1;

      if (newPlaceholderIndex > -1 && newPlaceholderIndex !== placeholderIndex) {
        setPlaceholderIndex(newPlaceholderIndex);
      }
    }

    const kanbanWrapper = document.querySelector('.sf-metadata-view-kanban');
    const viewportHeight = window.innerHeight;
    const scrollThreshold = 50;
    if (event.clientY < scrollThreshold) {
      kanbanWrapper.scrollBy({ top: -20, behavior: 'smooth' });
    } else if (event.clientY > viewportHeight - scrollThreshold) {
      kanbanWrapper.scrollBy({ top: 20, behavior: 'smooth' });
    }
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
    setPlaceholderIndex(null);
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
        {cards.map((card, index) => (
          <Fragment key={card.id}>
            {dragSourceListId && dragSourceListId !== dragOverListId && dragOverListId === id && placeholderIndex === index && (
              <div
                className="kanban-card-placeholder"
                style={{ height: `${placeholderHeight}px` }}
              />
            )}
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
          </Fragment>
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
  dragSourceListId: PropTypes.string,
  onDragSourceListId: PropTypes.func,
  dragOverListId: PropTypes.string,
  onDragOverListId: PropTypes.func,
  placeholderHeight: PropTypes.number,
  onSetPlaceholderHeight: PropTypes.func,
};

export default List;
