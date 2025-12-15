import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { useMetadataView } from '../../../hooks/metadata-view';
import { useCollaborators } from '../../../hooks';
import { CellType, KANBAN_SETTINGS_KEYS, UNCATEGORIZED } from '../../../constants';
import { COLUMN_DATA_OPERATION_TYPE } from '../../../store/operations';
import { gettext } from '../../../../utils/constants';
import { checkIsPredefinedOption, getCellValueByColumn, isValidCellValue, getRecordIdFromRecord,
  getFileNameFromRecord, getParentDirFromRecord
} from '../../../utils/cell';
import { getColumnOptions, getColumnOriginName } from '../../../utils/column';
import { openFile } from '../../../utils/file';
import { checkIsDir } from '../../../utils/row';
import AddBoard from '../add-board';
import EmptyTip from '../../../../components/empty-tip';
import Board from './board';
import ImagePreviewer from '../../../components/cell-formatter/image-previewer';
import ContextMenu from '../context-menu';
import { getRowById } from '../../../../components/sf-table/utils/table';

import './index.css';

const Boards = ({ modifyRecord, deleteRecords, modifyColumnData, onCloseSettings }) => {
  const [haveFreezed, setHaveFreezed] = useState(false);
  const [isImagePreviewerVisible, setImagePreviewerVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState('');
  const [isDragging, setDragging] = useState(false);

  const currentImageRef = useRef(null);
  const containerRef = useRef(null);

  const { isDirentDetailShow, metadata, store, updateCurrentDirent, updateSelectedRecordIds } = useMetadataView();
  const { collaborators } = useCollaborators();

  const repoID = window.sfMetadataContext.getSetting('repoID');
  const repoInfo = window.sfMetadataContext.getSetting('repoInfo');

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
    const titleFieldKey = metadata.view.settings[KANBAN_SETTINGS_KEYS.TITLE_COLUMN_KEY];
    if (!displayColumnsConfig) return [];
    return displayColumnsConfig.filter(config => config.shown).map(config => metadata.key_column_map[config.key]).filter(column => column && column.key !== titleFieldKey);
  }, [metadata.key_column_map, metadata.view.settings]);

  const displayEmptyValue = useMemo(() => !metadata.view.settings[KANBAN_SETTINGS_KEYS.HIDE_EMPTY_VALUE], [metadata.view.settings]);
  const displayColumnName = useMemo(() => metadata.view.settings[KANBAN_SETTINGS_KEYS.SHOW_COLUMN_NAME], [metadata.view.settings]);
  const textWrap = useMemo(() => metadata.view.settings[KANBAN_SETTINGS_KEYS.TEXT_WRAP], [metadata.view.settings]);

  /**
    [
      {
        key: '',
        value: '',
        children: [ rowId ]
      }, {
        key: '',
        value: '',
        children: [ rowId ]
      },
    ]
  */
  const boards = useMemo(() => {
    if (!groupByColumn) return [];
    const groupByColumnType = groupByColumn.type;

    const { rows } = metadata;
    let ungroupedCard = { key: UNCATEGORIZED, value: null, children: [] };
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
      const recordId = getRecordIdFromRecord(row);
      if (isValidCellValue(cellValue)) {
        switch (groupByColumnType) {
          case CellType.SINGLE_SELECT: {
            if (boardsMap[cellValue]) {
              boardsMap[cellValue].push(recordId);
            } else {
              ungroupedCard.children.push(recordId);
            }
            break;
          }
          case CellType.COLLABORATOR: {
            Array.isArray(cellValue) && cellValue.forEach(email => {
              if (boardsMap[email]) {
                boardsMap[email].push(recordId);
              } else {
                ungroupedCard.children.push(recordId);
              }
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
      _boards.unshift(ungroupedCard);
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

  const deleteOption = useCallback((optionId) => {
    const oldData = groupByColumn.data;
    const oldOptions = getColumnOptions(groupByColumn);
    const newOptions = oldOptions.filter(o => o.id !== optionId);
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

  const onFreezed = useCallback(() => {
    setHaveFreezed(true);
  }, []);

  const onUnFreezed = useCallback(() => {
    setHaveFreezed(false);
  }, []);

  const onOpenFile = useCallback((record) => {
    const repoID = window.sfMetadataContext.getSetting('repoID');
    const canPreview = window.sfMetadataContext.canPreview();
    if (!canPreview) return;
    openFile(repoID, record, () => {
      currentImageRef.current = record;
      setImagePreviewerVisible(true);
    });
  }, []);

  const closeImagePreviewer = useCallback(() => {
    currentImageRef.current = null;
    setImagePreviewerVisible(false);
  }, []);

  const handleUpdateCurrentDirent = useCallback((record) => {
    if (!record) return;
    const recordId = getRecordIdFromRecord(record);
    const name = getFileNameFromRecord(record);
    const path = getParentDirFromRecord(record);
    const isDir = checkIsDir(record);
    updateCurrentDirent({
      id: recordId,
      type: isDir ? 'dir' : 'file',
      mtime: '',
      name,
      path,
      file_tags: []
    });
    setSelectedCard(recordId);
  }, [updateCurrentDirent]);

  const onSelectCard = useCallback((record) => {
    const recordId = getRecordIdFromRecord(record);
    if (selectedCard === recordId) return;
    updateSelectedRecordIds([recordId]);
    handleUpdateCurrentDirent(record);
    onCloseSettings();
  }, [selectedCard, onCloseSettings, handleUpdateCurrentDirent, updateSelectedRecordIds]);

  const handleClickOutside = useCallback((event) => {
    if (isDragging) return;
    setSelectedCard(null);
    updateCurrentDirent();
    updateSelectedRecordIds([]);
  }, [isDragging, updateCurrentDirent, updateSelectedRecordIds]);

  const updateDragging = useCallback((isDragging) => {
    setDragging(isDragging);
  }, []);

  const onContextMenu = useCallback((event, recordId) => {
    event.preventDefault();
    if (selectedCard === recordId) return;
    const record = getRowById(metadata, recordId);
    handleUpdateCurrentDirent(record);
    updateSelectedRecordIds([recordId]);
  }, [metadata, selectedCard, handleUpdateCurrentDirent, updateSelectedRecordIds]);

  const onDeleteRecords = useCallback((recordIds) => {
    deleteRecords(recordIds, {
      success_callback: () => {
        setSelectedCard(null);
        updateCurrentDirent();
      },
    });
  }, [deleteRecords, updateCurrentDirent]);

  const onRename = useCallback((rowId, updates, oldRowData, originalUpdates, originalOldRowData, { success_callback }) => {
    modifyRecord(rowId, updates, oldRowData, originalUpdates, originalOldRowData, {
      success_callback: (operation) => {
        success_callback && success_callback(operation);
        const record = getRowById(metadata, rowId);
        handleUpdateCurrentDirent(record);
      }
    });
  }, [metadata, modifyRecord, handleUpdateCurrentDirent]);

  useEffect(() => {
    if (!isDirentDetailShow) {
      setSelectedCard(null);
    }
  }, [isDirentDetailShow]);

  const isEmpty = boards.length === 0;

  return (
    <>
      <div
        ref={containerRef}
        className={classnames('sf-metadata-view-kanban-boards', {
          'sf-metadata-view-kanban-boards-text-wrap': textWrap,
          'readonly': readonly,
        })}
        onClick={handleClickOutside}
      >
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
                    haveFreezed={haveFreezed}
                    groupByColumn={groupByColumn}
                    titleColumn={titleColumn}
                    displayColumns={displayColumns}
                    selectedCard={selectedCard}
                    onMove={onMove}
                    deleteOption={deleteOption}
                    onFreezed={onFreezed}
                    onUnFreezed={onUnFreezed}
                    onOpenFile={onOpenFile}
                    onSelectCard={onSelectCard}
                    updateDragging={updateDragging}
                    onContextMenu={onContextMenu}
                  />
                );
              })}
            </>
          )}
          {!readonly && (<AddBoard groupByColumn={groupByColumn}/>)}
        </div>
      </div>
      <ContextMenu
        selectedCard={selectedCard}
        onDelete={onDeleteRecords}
        onRename={onRename}
      />
      {isImagePreviewerVisible && (
        <ImagePreviewer
          repoID={repoID}
          repoInfo={repoInfo}
          record={currentImageRef.current}
          table={metadata}
          closeImagePopup={closeImagePreviewer}
        />
      )}
    </>
  );
};

Boards.propTypes = {
  modifyRecord: PropTypes.func.isRequired,
  modifyColumnData: PropTypes.func.isRequired,
  onCloseSettings: PropTypes.func.isRequired,
};

export default Boards;
