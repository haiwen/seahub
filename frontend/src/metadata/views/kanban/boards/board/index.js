import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import Header from './header';
import Card from './card';
import Container from '../../dnd/container';
import Draggable from '../../dnd/draggable';
import { useMetadataView } from '../../../../hooks/metadata-view';
import { getRowById } from '../../../../../components/sf-table/utils/table';
import { getRecordIdFromRecord } from '../../../../utils/cell';

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
  selectedCard,
  onMove,
  deleteOption,
  onFreezed,
  onUnFreezed,
  onOpenFile,
  onSelectCard,
  updateDragging,
  onContextMenu,
}) => {
  const [isDraggingOver, setDraggingOver] = useState(false);
  const [isCollapsed, setCollapsed] = useState(false);
  const boardName = useMemo(() => `sf_metadata_kanban_board_${board.key}`, [board]);
  const cardsQuantity = useMemo(() => board.children.length, [board.children]);

  const { metadata } = useMetadataView();

  const onDragStart = useCallback(({ payload }) => {
    updateDragging(true);
    return payload;
  }, [updateDragging]);

  const onDragEnd = useCallback((targetBoardIndex, result) => {
    if (isDraggingOver) {
      setDraggingOver(false);
    }

    const { addedIndex, payload } = result;
    const { boardIndex: sourceBoardIndex, cardIndex: sourceCardIndex } = payload;
    if (sourceBoardIndex !== targetBoardIndex && sourceCardIndex !== null && addedIndex !== null) {
      onMove(targetBoardIndex, sourceBoardIndex, sourceCardIndex);
    }
    setTimeout(() => updateDragging(false), 0);
  }, [isDraggingOver, onMove, updateDragging]);

  const onCollapse = useCallback(() => {
    setCollapsed(!isCollapsed);
  }, [isCollapsed]);

  return (
    <section draggable={false} className="sf-metadata-view-kanban-board">
      <Header
        readonly={readonly}
        value={board.value}
        groupByColumn={groupByColumn}
        haveFreezed={haveFreezed}
        cardsQuantity={cardsQuantity}
        onDelete={() => deleteOption(board.key)}
        onFreezed={onFreezed}
        onUnFreezed={onUnFreezed}
        isCollapsed={isCollapsed}
        onCollapse={onCollapse}
      />
      {!isCollapsed && (
        <Container
          orientation="vertical"
          groupName={boardName}
          dragClass="kanban-drag-card"
          dropClass="kanban-drop-card"
          onDragStart={onDragStart}
          onDrop={e => onDragEnd(boardIndex, e)}
          onDragEnter={() => setDraggingOver(true)}
          onDragLeave={() => setDraggingOver(false)}
          shouldAcceptDrop={(sourceContainer) => sourceContainer.groupName !== boardName}
          getChildPayload={(cardIndex) => ({ boardIndex, cardIndex })}
          dropPlaceholder={{
            animationDuration: 300,
            showOnTop: true,
            className: 'card-drop-preview',
          }}
          getGhostParent={() => {
          // return anchestor of container who doesn't have a transform property
            return document.querySelector('.sf-metadata-main');
          }}
        >
          {board.children.map((cardKey) => {
            const record = getRowById(metadata, cardKey);
            if (!record) return null;
            const recordId = getRecordIdFromRecord(record);
            const isSelected = selectedCard === recordId;
            const CardElement = (
              <Card
                key={cardKey}
                isSelected={isSelected}
                displayEmptyValue={displayEmptyValue}
                displayColumnName={displayColumnName}
                record={record}
                titleColumn={titleColumn}
                displayColumns={displayColumns}
                onOpenFile={onOpenFile}
                onSelectCard={onSelectCard}
                onContextMenu={(e) => onContextMenu(e, recordId)}
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
      )}
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
  selectedCard: PropTypes.string,
  onMove: PropTypes.func,
  deleteOption: PropTypes.func,
  onFreezed: PropTypes.func,
  onUnFreezed: PropTypes.func,
  onOpenFile: PropTypes.func.isRequired,
  onSelectCard: PropTypes.func.isRequired,
  updateDragging: PropTypes.func.isRequired,
  onContextMenu: PropTypes.func,
};

export default Board;
