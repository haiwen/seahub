import React, { useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useMetadataView } from '../../../hooks/metadata-view';
import { useCollaborators } from '../../../hooks';
import { CellType, KANBAN_SETTINGS_KEYS, UNCATEGORIZED } from '../../../constants';
import { COLUMN_DATA_OPERATION_TYPE } from '../../../store/operations';
import { gettext } from '../../../../utils/constants';
import { checkIsPredefinedOption, getCellValueByColumn, isValidCellValue, geRecordIdFromRecord } from '../../../utils/cell';
import AddCategory from '../add-category';
import EmptyTip from '../../../../components/empty-tip';
import { getColumnOptions, getColumnOriginName } from '../../../utils/column';
import Board from './board';

import './index.css';

const Boards = ({ modifyRecord, modifyColumnData }) => {
  const { metadata, store } = useMetadataView();
  const { collaborators } = useCollaborators();

  const groupByColumn = useMemo(() => {
    const groupByColumnKey = metadata.view.settings[KANBAN_SETTINGS_KEYS.GROUP_BY_COLUMN_KEY];
    return metadata.key_column_map[groupByColumnKey];
  }, [metadata.key_column_map, metadata.view.settings]);

  const titleColumn = useMemo(() => {
    const titleFieldKey = metadata.view.settings[KANBAN_SETTINGS_KEYS.TITLE_COLUMN_KEY];
    return metadata.key_column_map[titleFieldKey];
  }, [metadata.key_column_map, metadata.view.settings]);

  const displayColumns = useMemo(() => {
    const displayColumnsConfig = metadata.view.settings[KANBAN_SETTINGS_KEYS.COLUMNS];
    if (!displayColumnsConfig) return [];
    return displayColumnsConfig.filter(config => config.shown).map(config => metadata.key_column_map[config.key]).filter(column => column);
  }, [metadata.key_column_map, metadata.view.settings]);

  const displayEmptyValue = useMemo(() => !metadata.view.settings[KANBAN_SETTINGS_KEYS.HIDE_EMPTY_VALUE], [metadata.view.settings]);
  const displayColumnName = useMemo(() => metadata.view.settings[KANBAN_SETTINGS_KEYS.SHOW_COLUMN_NAME], [metadata.view.settings]);

  /**
   [
      {
        key: '',
        id: '',
        children: [ rowId ]
      }, {
        key: '',
        children: []
      },
    ]
  */
  const boards = useMemo(() => {
    if (!groupByColumn) return [];
    const groupByColumnType = groupByColumn.type;

    const { rows } = metadata;
    let ungroupedCard = { key: UNCATEGORIZED, value: '', children: [] };
    let boardsMap = {};

    if (groupByColumnType === CellType.SINGLE_SELECT) {
      boardsMap = groupByColumn.data.options.reduce((pre, cur) => {
        const key = checkIsPredefinedOption(groupByColumn, cur.id) ? cur.id : cur.name;
        pre[key] = [];
        return pre;
      }, {});
    } else if (groupByColumnType === CellType.COLLABORATOR) {
      if (Array.isArray(collaborators)) {
        collaborators.forEach(collaborator => {
          boardsMap[collaborator.email] = [];
        });
      }
    }

    rows.forEach(row => {
      const cellValue = getCellValueByColumn(row, groupByColumn);
      const recordId = geRecordIdFromRecord(row);
      if (isValidCellValue(cellValue)) {
        switch (groupByColumnType) {
          case CellType.SINGLE_SELECT: {
            boardsMap[cellValue].push(recordId);
            break;
          }
          case CellType.COLLABORATOR: {
            Array.isArray(cellValue) && cellValue.forEach(email => {
              boardsMap[email].push(recordId);
            });
            break;
          }
          default: {
            break;
          }
        }
      } else {
        ungroupedCard.children.push(recordId);
      }
    });

    let _boards = [];
    if (groupByColumn.type === CellType.SINGLE_SELECT) {
      const options = getColumnOptions(groupByColumn);
      _boards = options.map(option => {
        if (checkIsPredefinedOption(groupByColumn, option.id)) return { key: option.id, value: option.id, children: boardsMap[option.id] };
        return { key: option.id, value: option.name, children: boardsMap[option.name] };
      });
    } else if (groupByColumn.type === CellType.COLLABORATOR) {
      _boards = collaborators.map(collaborator => ({
        key: collaborator.email,
        value: collaborator.email,
        children: boardsMap[collaborator.email],
      }));
    }
    if (ungroupedCard.children.length > 0) {
      _boards.push(ungroupedCard);
    }
    return _boards;
  }, [metadata, collaborators, groupByColumn]);

  const readonly = useMemo(() => {
    if (!store.context.canModify()) return true;
    if (!groupByColumn) return true;
    if (!groupByColumn.editable) return true;
    if (groupByColumn.type === CellType.SINGLE_SELECT) return false;
    return true;
  }, [groupByColumn, store]);

  const deleteOption = useCallback((cardId) => {
    const oldData = groupByColumn.data;
    const oldOptions = getColumnOptions(groupByColumn);
    const newOptions = checkIsPredefinedOption(groupByColumn, cardId) ? oldOptions.filter(o => o.id !== cardId) : oldOptions.filter(o => o.name !== cardId);
    const optionModifyType = COLUMN_DATA_OPERATION_TYPE.DELETE_OPTION;
    modifyColumnData(groupByColumn.key, { options: newOptions }, { options: oldData.options }, { optionModifyType });
  }, [groupByColumn, modifyColumnData]);

  const onMove = useCallback((targetBoardIndex, sourceBoardIndex, sourceCardIndex) => {
    const targetBoard = boards[targetBoardIndex];
    const sourceBoard = boards[sourceBoardIndex];
    const sourceCard = sourceBoard.children[sourceCardIndex];
    const originName = getColumnOriginName(groupByColumn);
    const updates = { [originName]: targetBoard.value };
    const originalUpdates = { [groupByColumn.key]: targetBoard.value };
    const oldRowData = { [originName]: sourceBoard.value };
    const originalOldRowData = { [groupByColumn.key]: sourceBoard.value };
    modifyRecord(sourceCard, updates, oldRowData, originalUpdates, originalOldRowData);
  }, [boards, groupByColumn, modifyRecord]);

  const isEmpty = boards.length === 0;

  return (
    <div className="sf-metadata-view-kanban-boards">
      <div className="smooth-dnd-container horizontal">
        {isEmpty && (<EmptyTip className="tips-empty-boards" text={gettext('No categories')} />)}
        {!isEmpty && (
          <>
            {boards.map((board, index) => {
              return (
                <Board
                  key={board.key}
                  board={board}
                  index={index}
                  readonly={readonly}
                  displayEmptyValue={displayEmptyValue}
                  displayColumnName={displayColumnName}
                  groupByColumn={groupByColumn}
                  titleColumn={titleColumn}
                  displayColumns={displayColumns}
                  onMove={onMove}
                  deleteOption={deleteOption}
                />
              );
            })}
          </>
        )}
        {!readonly && (<AddCategory groupByColumn={groupByColumn}/>)}
      </div>
    </div>
  );
};

Boards.propTypes = {
  modifyRecord: PropTypes.func.isRequired,
  modifyColumnData: PropTypes.func.isRequired,
};

export default Boards;
