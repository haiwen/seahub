import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import Header from './header';
import Card from './card';
import { useMetadataView } from '../../../../hooks/metadata-view';
import { getRowById } from '../../../../utils/table';
import Container from '../../dnd/container';
import Draggable from '../../dnd/draggable';

import './index.css';

const Board = ({
  board,
  index: boardIndex,
  readonly,
  haveFreezed,
  displayEmptyValue,
  displayColumnName,
  groupByColumn,
  titleColumn,
  displayColumns,
  onMove,
  deleteOption,
  onFreezed,
  onUnFreezed,
  onCloseSettings,
}) => {
  const [isDraggingOver, setDraggingOver] = useState(false);
  const boardName = useMemo(() => `sf_metadata_kanban_board_${board.key}`, [board]);

  const { metadata } = useMetadataView();

  const onDragStart = useCallback(({ payload }) => {
    return payload;
  }, []);

  const onDragEnd = useCallback((targetBoardIndex, result) => {
    if (isDraggingOver) {
      setDraggingOver(false);
    }

    const { addedIndex, payload } = result;
    const { boardIndex: sourceBoardIndex, cardIndex: sourceCardIndex } = payload;
    if (sourceBoardIndex === targetBoardIndex) return;
    if (sourceCardIndex !== null && addedIndex !== null) {
      onMove(targetBoardIndex, sourceBoardIndex, sourceCardIndex);
    }

  }, [isDraggingOver, onMove]);

  return (
    <section draggable={false} className="sf-metadata-view-kanban-board">
      <Header
        readonly={readonly}
        value={board.value}
        groupByColumn={groupByColumn}
        haveFreezed={haveFreezed}
        onDelete={() => deleteOption(board.key)}
        onFreezed={onFreezed}
        onUnFreezed={onUnFreezed}
      />
      <Container
        orientation="vertical"
        groupName={boardName}
        dragClass="kanban-dragged-card"
        dropClass="kanban-drop-card"
        onDragStart={onDragStart}
        onDrop={e => onDragEnd(boardIndex, e)}
        onDragEnter={() => setDraggingOver(true)}
        onDragLeave={() => setDraggingOver(false)}
        shouldAcceptDrop={(sourceContainer) => sourceContainer.groupName !== boardName}
        getChildPayload={(cardIndex) => ({ boardIndex, cardIndex })}
      >
        {board.children.map((cardKey) => {
          const record = getRowById(metadata, cardKey);
          if (!record) return null;
          const CardElement = (
            <Card
              key={cardKey}
              readonly={readonly}
              displayEmptyValue={displayEmptyValue}
              displayColumnName={displayColumnName}
              record={record}
              titleColumn={titleColumn}
              displayColumns={displayColumns}
              onCloseSettings={onCloseSettings}
            />
          );
          if (readonly) return CardElement;
          return (
            <Draggable key={`sf-metadata-kanban-card-${cardKey}`}>
              {CardElement}
            </Draggable>
          );
        })}
      </Container>
    </section>
  );
};

Board.propTypes = {
  board: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  readonly: PropTypes.bool,
  haveFreezed: PropTypes.bool,
  displayEmptyValue: PropTypes.bool,
  displayColumnName: PropTypes.bool,
  groupByColumn: PropTypes.object,
  titleColumn: PropTypes.object,
  displayColumns: PropTypes.array,
  onMove: PropTypes.func,
  deleteOption: PropTypes.func,
  onFreezed: PropTypes.func,
  onUnFreezed: PropTypes.func,
  onCloseSettings: PropTypes.func.isRequired,
};

export default Board;
