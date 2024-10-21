import React from 'react';
import Card from '../card';
import CellFormatter from '../../../components/cell-formatter';
import ListMoreOperations from './list-more-operations';

const List = ({
  id,
  title,
  field,
  contentFields,
  cards,
  settings,
  moreOperationsList,
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
      className='sf-metadata-view-kanban-list'
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className='list-header'>
        <span>
          {id === 'ungrouped' ? (
            <span>{title}</span>
          ) : (
            <CellFormatter value={title} field={field} readonly={true} />
          )}
        </span>
        <div className="list-header-more-operation">
          <ListMoreOperations
            listId={id}
            field={field}
            moreOperationsList={moreOperationsList}
          />
        </div>
      </div>
      <div className='list-body'>
        {cards.map(card => (
          <Card
            key={card.id}
            title={card.title}
            fields={contentFields}
            record={card.record}
            draggable={field.editable}
            settings={settings}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
          />
        ))}
      </div>
    </div>
  );
};

export default List;
