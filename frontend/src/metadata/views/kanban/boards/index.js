import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import { ModalPortal } from '@seafile/sf-metadata-ui-component';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { useMetadataView } from '../../../hooks/metadata-view';
import { useCollaborators } from '../../../hooks';
import { CellType, KANBAN_SETTINGS_KEYS, PRIVATE_COLUMN_KEY, UNCATEGORIZED } from '../../../constants';
import { COLUMN_DATA_OPERATION_TYPE } from '../../../store/operations';
import { gettext, siteRoot } from '../../../../utils/constants';
import { checkIsPredefinedOption, getCellValueByColumn, isValidCellValue, getRecordIdFromRecord,
  getFileNameFromRecord, getParentDirFromRecord
} from '../../../utils/cell';
import { getColumnByKey, getColumnOptions, getColumnOriginName } from '../../../utils/column';
import AddBoard from '../add-board';
import EmptyTip from '../../../../components/empty-tip';
import Board from './board';
import ImagePreviewer from '../../../components/cell-formatter/image-previewer';
import { openFile } from '../../../utils/open-file';
import { checkIsDir } from '../../../utils/row';
import ContextMenu from '../context-menu';
import URLDecorator from '../../../../utils/url-decorator';
import { Utils, validateName } from '../../../../utils/utils';
import toaster from '../../../../components/toast';
import Rename from '../rename';

import './index.css';

const Boards = ({ modifyRecord, modifyColumnData, onCloseSettings }) => {
  const [haveFreezed, setHaveFreezed] = useState(false);
  const [isImagePreviewerVisible, setImagePreviewerVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState('');
  const [isDragging, setDragging] = useState(false);
  const [isRenameDialogShow, setIsRenameDialogShow] = useState(false);

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

  const handleRightClick = useCallback((event, recordId) => {
    event.preventDefault();
    setSelectedCard(recordId);
  }, []);

  const handleOpenInNewTab = useCallback(() => {
    if (!selectedCard) return;

    const record = metadata.rows.find(row => getRecordIdFromRecord(row) === selectedCard);
    if (!record) return;

    const isDir = checkIsDir(record);
    const parentDir = getParentDirFromRecord(record);
    const name = getFileNameFromRecord(record);
    const url = isDir
      ? window.location.origin + window.location.pathname + Utils.encodePath(Utils.joinPath(parentDir, name))
      : `${siteRoot}lib/${repoID}/file${Utils.encodePath(Utils.joinPath(parentDir, name))}`;

    window.open(url, '_blank');
  }, [selectedCard, metadata.rows, repoID]);

  const handleOpenParentFolder = useCallback(() => {
    if (!selectedCard) return;

    const record = metadata.rows.find(row => getRecordIdFromRecord(row) === selectedCard);
    if (!record) return;

    let parentDir = getParentDirFromRecord(record);
    if (!parentDir) return;
    if (window.location.pathname.endsWith('/')) {
      parentDir = parentDir.slice(1);
    }

    const url = window.location.origin + window.location.pathname + Utils.encodePath(parentDir);
    window.open(url, '_blank');
  }, [selectedCard, metadata.rows]);

  const handleDownload = useCallback(() => {
    if (!selectedCard) return;

    const record = metadata.rows.find(row => getRecordIdFromRecord(row) === selectedCard);
    if (!record) return;

    const path = getParentDirFromRecord(record);
    const name = getFileNameFromRecord(record);
    const direntPath = Utils.joinPath(path, name);
    const url = URLDecorator.getUrl({ type: 'download_file_url', repoID: repoID, path: direntPath });
    location.href = url;
    return;
  }, [selectedCard, metadata.rows, repoID]);

  const handleDelete = useCallback(() => {
    if (!selectedCard) return;

    const record = metadata.rows.find(row => getRecordIdFromRecord(row) === selectedCard);
    if (!record) return;

    const parentDir = getParentDirFromRecord(record);
    const name = getFileNameFromRecord(record);
    if (!parentDir || !name) return;

    const path = Utils.joinPath(parentDir, name);
    const recordsIds = [selectedCard];
    const paths = [path];
    const fileNames = [name];

    store.deleteRecords(recordsIds, {
      fail_callback: (error) => {
        toaster.danger(error);
      },
      success_callback: () => {
        deleteFilesCallback(paths, fileNames);
        const msg = gettext('Successfully deleted {name}');
        toaster.success(msg.replace('{name}', fileNames[0]));
      },
    });
  }, [store, metadata.rows, selectedCard, deleteFilesCallback]);

  const handleRename = useCallback(() => {
    setIsRenameDialogShow(true);
  }, []);

  const handleSubmitRename = useCallback((newName) => {
    if (!selectedCard) return;

    const record = metadata.rows.find(row => getRecordIdFromRecord(row) === selectedCard);
    if (!record) return;

    const { isValid, errMessage } = validateName(newName);
    if (!isValid) {
      toaster.danger(errMessage);
      return;
    }

    const parentDir = getParentDirFromRecord(record);
    if (store.checkDuplicatedName(newName, parentDir)) {
      const errMessage = gettext('The name "{name}" is already taken. Please choose a different name.').replace('{name}', Utils.HTMLescape(newName));
      toaster.danger(errMessage);
      return;
    }

    const column = getColumnByKey(metadata.columns, PRIVATE_COLUMN_KEY.FILE_NAME);
    const rowId = selectedCard;
    const oldName = getFileNameFromRecord(record);
    const path = Utils.joinPath(parentDir, oldName);
    const newPath = Utils.joinPath(parentDir, newName);

    const rowIds = [rowId];
    const updates = { [column.key]: newName };
    const oldValue = getCellValueByColumn(record, column);
    const oldRowData = { [column.key]: oldValue };

    store.modifyRecords(rowIds, { [rowId]: updates }, { [rowId]: updates }, { [rowId]: oldRowData }, { [rowId]: oldRowData }, false, true, {
      fail_callback: (error) => {
        toaster.danger(error);
      },
      success_callback: () => {
        renameFileCallback(path, newPath);
        toaster.success(gettext('Successfully renamed {name}').replace('{name}', oldName));
        setIsRenameDialogShow(false);
      },
    });
  }, [store, metadata.columns, metadata.rows, selectedCard, renameFileCallback]);

  useEffect(() => {
    if (!isDirentDetailShow) {
      setSelectedCard(null);
    }
  }, [isDirentDetailShow]);

  const selectedRecord = useMemo(() => metadata.rows.find(row => getRecordIdFromRecord(row) === selectedCard), [metadata.rows, selectedCard]);
  const isDir = useMemo(() => selectedRecord && checkIsDir(selectedRecord), [selectedRecord]);
  const oldName = useMemo(() => selectedRecord && getFileNameFromRecord(selectedRecord), [selectedRecord]);
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
                    onRightClick={handleRightClick}
                  />
                );
              })}
            </>
          )}
          {!readonly && (<AddBoard groupByColumn={groupByColumn}/>)}
        </div>
      </div>
      {isImagePreviewerVisible && (
        <ImagePreviewer
          repoID={repoID}
          repoInfo={repoInfo}
          record={currentImageRef.current}
          table={metadata}
          closeImagePopup={closeImagePreviewer}
        />
      )}
      <ContextMenu
        isDir={isDir}
        getContainerRect={() => containerRef.current.getBoundingClientRect()}
        onOpenInNewTab={handleOpenInNewTab}
        onOpenParentFolder={handleOpenParentFolder}
        onDownload={handleDownload}
        onDelete={handleDelete}
        onRename={handleRename}
      />
      {isRenameDialogShow && (
        <ModalPortal>
          <Rename
            isDir={isDir}
            oldName={oldName}
            onSubmit={handleSubmitRename}
            onCancel={() => setIsRenameDialogShow(false)}
          />
        </ModalPortal>
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
