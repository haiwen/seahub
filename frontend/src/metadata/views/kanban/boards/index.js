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
import { Utils, validateName } from '../../../../utils/utils';
import { getRowById } from '../../../utils/table';
import AddBoard from '../add-board';
import EmptyTip from '../../../../components/empty-tip';
import Board from './board';
import ImagePreviewer from '../../../components/cell-formatter/image-previewer';
import toaster from '../../../../components/toast';
import ContextMenu from '../context-menu';

import './index.css';

const Boards = ({ modifyRecord, modifyColumnData, onCloseSettings }) => {
  const [haveFreezed, setHaveFreezed] = useState(false);
  const [isImagePreviewerVisible, setImagePreviewerVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState('');
  const [isDragging, setDragging] = useState(false);

  const currentImageRef = useRef(null);
  const containerRef = useRef(null);

  const { isDirentDetailShow, metadata, store, updateCurrentDirent, showDirentDetail, deleteFilesCallback, renameFileCallback } = useMetadataView();
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
    openFile(repoID, record, () => {
      currentImageRef.current = record;
      setImagePreviewerVisible(true);
    });
  }, []);

  const closeImagePreviewer = useCallback(() => {
    currentImageRef.current = null;
    setImagePreviewerVisible(false);
  }, []);

  const onSelectCard = useCallback((record) => {
    const recordId = getRecordIdFromRecord(record);
    if (selectedCard === recordId) return;
    const name = getFileNameFromRecord(record);
    const path = getParentDirFromRecord(record);
    const isDir = checkIsDir(record);
    updateCurrentDirent({
      type: isDir ? 'dir' : 'file',
      mtime: '',
      name,
      path,
      file_tags: []
    });
    setSelectedCard(recordId);
    onCloseSettings();
    showDirentDetail();
  }, [selectedCard, onCloseSettings, showDirentDetail, updateCurrentDirent]);

  const handleClickOutside = useCallback((event) => {
    if (isDragging) return;
    setSelectedCard(null);
    updateCurrentDirent();
  }, [isDragging, updateCurrentDirent]);

  const updateDragging = useCallback((isDragging) => {
    setDragging(isDragging);
  }, []);

  const onContextMenu = useCallback((event, recordId) => {
    event.preventDefault();
    setSelectedCard(recordId);
  }, []);

  const onDelete = useCallback((recordsIds) => {
    if (!Array.isArray(recordsIds) || recordsIds.length === 0) return;

    let paths = [];
    let fileNames = [];
    recordsIds.forEach((recordId) => {
      const record = getRowById(metadata, recordId);
      const { _parent_dir, _name } = record || {};
      if (_parent_dir && _name) {
        const path = Utils.joinPath(_parent_dir, _name);
        paths.push(path);
        fileNames.push(_name);
      }
    });
    store.deleteRecords(recordsIds, {
      fail_callback: (error) => {
        toaster.danger(error);
      },
      success_callback: () => {
        deleteFilesCallback(paths, fileNames);
        let msg = fileNames.length > 1
          ? gettext('Successfully deleted {name} and {n} other items')
          : gettext('Successfully deleted {name}');
        msg = msg.replace('{name}', fileNames[0])
          .replace('{n}', fileNames.length - 1);
        toaster.success(msg);
      },
    });
  }, [store, metadata, deleteFilesCallback]);

  const onModify = (rowIds, idRowUpdates, idOriginalRowUpdates, idOldRowData, idOriginalOldRowData, { success_callback }) => {
    const isRename = store.checkIsRenameFileOperator(rowIds, idOriginalRowUpdates);
    let newName = null;
    if (isRename) {
      const rowId = rowIds[0];
      const row = getRowById(metadata, rowId);
      const rowUpdates = idOriginalRowUpdates[rowId];
      const { _parent_dir, _name } = row;
      newName = getFileNameFromRecord(rowUpdates);
      const { isValid, errMessage } = validateName(newName);
      if (!isValid) {
        toaster.danger(errMessage);
        return;
      }
      if (newName === _name) {
        return;
      }
      if (store.checkDuplicatedName(newName, _parent_dir)) {
        let errMessage = gettext('The name "{name}" is already taken. Please choose a different name.');
        errMessage = errMessage.replace('{name}', Utils.HTMLescape(newName));
        toaster.danger(errMessage);
        return;
      }
    }
    store.modifyRecords(rowIds, idRowUpdates, idOriginalRowUpdates, idOldRowData, idOriginalOldRowData, false, isRename, {
      fail_callback: (error) => {
        error && toaster.danger(error);
      },
      success_callback: (operation) => {
        if (operation.is_rename) {
          const rowId = operation.row_ids[0];
          const row = getRowById(metadata, rowId);
          const rowUpdates = operation.id_original_row_updates[rowId];
          const oldRow = operation.id_original_old_row_data[rowId];
          const parentDir = getParentDirFromRecord(row);
          const oldName = getFileNameFromRecord(oldRow);
          const path = Utils.joinPath(parentDir, oldName);
          const newName = getFileNameFromRecord(rowUpdates);
          renameFileCallback(path, newName);
          success_callback && success_callback();
        }
      },
    });
  };

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
        boundaryCoordinates={containerRef?.current?.getBoundingClientRect()}
        selectedCard={selectedCard}
        onDelete={onDelete}
        onModify={onModify}
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
