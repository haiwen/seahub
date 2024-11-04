import React, { useState, useMemo, useEffect, useCallback } from 'react';
import classNames from 'classnames';
import { useMetadata } from '../../hooks/metadata';
import { useMetadataView } from '../../hooks/metadata-view';
import { useCollaborators } from '../../hooks';
import { CellType, EVENT_BUS_TYPE, KANBAN_SETTINGS_KEYS, PRIVATE_COLUMN_KEY, PRIVATE_COLUMN_KEYS, UNCATEGORIZED } from '../../constants';
import { COLUMN_DATA_OPERATION_TYPE } from '../../store/operations';
import { gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import { getCellValueByColumn } from '../../utils/cell';
import SettingPanel from './setting-panel';
import List from './list';
import AddList from './add-list';
import EmptyTip from '../../../components/empty-tip';

import './index.css';

const Kanban = () => {
  const [isSettingPanelOpen, setSettingPanelOpen] = useState(false);
  const [draggingListId, setDraggingListId] = useState(null);
  const [dragOverListId, setDragOverListId] = useState(null);
  const [dragSourceListId, setDragSourceListId] = useState(null);
  const [placeholderHeight, setPlaceholderHeight] = useState(null);

  const { viewsMap } = useMetadata();
  const { metadata, store } = useMetadataView();
  const { collaborators } = useCollaborators();

  const columns = useMemo(() => {
    const columnsData = metadata.view.columns;
    let savedColumnsKeys = metadata.view.settings[KANBAN_SETTINGS_KEYS.COLUMNS_KEYS] || [];
    const sourceColumnsKeys = columnsData.map(col => col.key);
    const updatedColumnsKeys = [...savedColumnsKeys];

    sourceColumnsKeys.forEach(key => {
      if (!savedColumnsKeys.includes(key)) {
        updatedColumnsKeys.push(key);
      }
    });

    const columnsMap = new Map(columnsData.map(col => [col.key, col]));
    return updatedColumnsKeys.map(key => columnsMap.get(key)).filter(col => col);
  }, [metadata.view.columns, metadata.view.settings]);

  const shownColumns = useMemo(() => {
    const shownColumnKeys = metadata.view.settings[KANBAN_SETTINGS_KEYS.SHOWN_COLUMNS_KEYS];
    if (!shownColumnKeys) return [];

    return columns.filter(col => shownColumnKeys.includes(col.key));
  }, [columns, metadata.view.settings]);

  const groupByColumn = useMemo(() => {
    const groupByColumnKey = metadata.view.settings[KANBAN_SETTINGS_KEYS.GROUP_BY_COLUMN_KEY];
    return metadata.columns.find(col => col.key === groupByColumnKey);
  }, [metadata.columns, metadata.view.settings]);

  const titleField = useMemo(() => {
    const titleFieldKey = metadata.view.settings[KANBAN_SETTINGS_KEYS.TITLE_FIELD_KEY];
    return metadata.columns.find(col => col.key === titleFieldKey);
  }, [metadata.columns, metadata.view.settings]);

  const lists = useMemo(() => {
    if (!groupByColumn) return [];

    const { rows } = metadata;
    const groupByColumnKey = metadata.view.settings[KANBAN_SETTINGS_KEYS.GROUP_BY_COLUMN_KEY];

    const ungroupedCards = [];
    const groupedCardsMap = {};
    const isPrivateColumn = PRIVATE_COLUMN_KEYS.includes(groupByColumnKey);

    if (groupByColumn.type === CellType.SINGLE_SELECT) {
      if (isPrivateColumn) {
        groupByColumn.data.options.forEach(option => groupedCardsMap[option.id] = []);
      } else {
        groupByColumn.data.options.forEach(option => groupedCardsMap[option.name] = []);
      }
    } else if (groupByColumn.type === CellType.COLLABORATOR) {
      if (Array.isArray(collaborators)) {
        collaborators.forEach(collaborator => {
          groupedCardsMap[collaborator.email] = [];
        });
      }
    }

    rows.forEach(row => {
      const cellValue = getCellValueByColumn(row, groupByColumn);
      const card = {
        id: row[PRIVATE_COLUMN_KEY.ID],
        title: {
          value: getCellValueByColumn(row, titleField),
          field: titleField
        },
        record: row,
      };

      if (cellValue) {
        groupedCardsMap[cellValue].push(card); // error here
      } else {
        ungroupedCards.push(card);
      }
    });

    let groupedLists = [];
    if (groupByColumn.type === CellType.SINGLE_SELECT) {
      groupedLists = groupByColumn.data.options.map(option => ({
        id: option.id,
        title: option.name,
        field: groupByColumn,
        shownColumns,
        cards: isPrivateColumn ? groupedCardsMap[option.id] : groupedCardsMap[option.name],
      }));
    } else if (groupByColumn.type === CellType.COLLABORATOR) {
      if (Array.isArray(collaborators)) {
        groupedLists = collaborators.map(collaborator => ({
          id: collaborator.email,
          title: [collaborator.email],
          field: groupByColumn,
          shownColumns,
          cards: groupedCardsMap[collaborator.email],
        }));
      }
    }

    const ungroupedList = {
      id: UNCATEGORIZED,
      title: gettext('Uncategorized'),
      field: groupByColumn,
      shownColumns,
      cards: ungroupedCards,
    };

    groupedLists.push(ungroupedList);

    return groupedLists;
  }, [metadata, collaborators, groupByColumn, titleField, shownColumns]);

  const canAddList = useMemo(() => groupByColumn && groupByColumn.editable && groupByColumn.type !== CellType.COLLABORATOR, [groupByColumn]);

  const draggable = useMemo(() => groupByColumn && groupByColumn.editable && groupByColumn.type !== CellType.COLLABORATOR, [groupByColumn]);

  const handleDeleteList = useCallback((listId) => {
    const oldData = groupByColumn.data;
    const options = groupByColumn.data.options.filter(option => option.id !== listId);
    const optionModifyType = COLUMN_DATA_OPERATION_TYPE.DELETE_OPTION;
    store.modifyColumnData(groupByColumn.key, { options }, { options: oldData.options }, { optionModifyType });
  }, [store, groupByColumn]);

  const moreOperationsList = useMemo(() => [
    {
      label: gettext('Delete'),
      onClick: (listId) => handleDeleteList(listId),
    }
  ], [handleDeleteList]);

  const onListDragStart = useCallback((event, listId) => {
    const dragData = JSON.stringify({ type: 'kanban-list', listId });
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/kanban-list', dragData);
    setDraggingListId(listId);
  }, []);

  const onListDragOver = useCallback((event, listId) => {
    if (!draggingListId || !listId) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverListId(listId);
  }, [draggingListId]);

  const onDragSourceListId = useCallback((listId) => {
    setDragSourceListId(listId);
  }, []);

  const onDragOverListId = useCallback((listId) => {
    setDragOverListId(listId);
  }, []);

  const onSetPlaceholderHeight = useCallback((height) => {
    setPlaceholderHeight(height);
  }, []);

  const onListDragLeave = useCallback(() => {
    if (!draggingListId) return;
    setDragOverListId(null);
  }, [draggingListId]);

  const onListDrop = useCallback((event, dropIndex) => {
    event.preventDefault();
    const dragData = event.dataTransfer.getData('application/kanban-list');
    if (!dragData) return;
    const { listId: dragListId } = JSON.parse(dragData);
    const oldData = columns.find(col => col.key === groupByColumn.key).data;
    const dragIndex = oldData.options.findIndex(option => option.id === dragListId);

    if (dragIndex === dropIndex) return;

    const newOptions = [...oldData.options];
    newOptions.splice(dragIndex, 1);
    newOptions.splice(dropIndex, 0, oldData.options[dragIndex]);

    const options = newOptions.filter(option => option.name);
    const optionModifyType = COLUMN_DATA_OPERATION_TYPE.MOVE_OPTION;
    store.modifyColumnData(groupByColumn.key, { options }, { options: oldData.options }, { optionModifyType });

    setDraggingListId(null);
    setDragOverListId(null);
  }, [store, columns, groupByColumn]);

  const modifyRecord = useCallback((rowId, updates, oldRowData, originalUpdates, originalOldRowData) => {
    const rowIds = [rowId];
    const idRowUpdates = { [rowId]: updates };
    const idOriginalRowUpdates = { [rowId]: originalUpdates };
    const idOldRowData = { [rowId]: oldRowData };
    const idOriginalOldRowData = { [rowId]: originalOldRowData };
    store.modifyRecords(rowIds, idRowUpdates, idOriginalRowUpdates, idOldRowData, idOriginalOldRowData, false, false, {
      fail_callback: (error) => {
        error && toaster.danger(error);
      },
      success_callback: () => {
        // do nothing
      },
    });
  }, [store]);

  const getOldRowData = useCallback((originalOldCellValue) => {
    const { key: columnKey, name: columnName } = groupByColumn;
    const oldRowData = PRIVATE_COLUMN_KEYS.includes(columnKey)
      ? { [columnKey]: originalOldCellValue }
      : { [columnName]: originalOldCellValue };
    const originalOldRowData = { [columnKey]: originalOldCellValue };
    return { oldRowData, originalOldRowData };
  }, [groupByColumn]);

  const onCardDrop = useCallback((record, sourceListId, targetListId) => {
    if (sourceListId === targetListId) return;

    const groupByColumnKey = metadata.view.settings[KANBAN_SETTINGS_KEYS.GROUP_BY_COLUMN_KEY];
    const rowId = record[PRIVATE_COLUMN_KEY.ID];
    const targetList = lists.find(list => list.id === targetListId);
    const originalOldCellValue = getCellValueByColumn(record, groupByColumn);
    const updates = PRIVATE_COLUMN_KEYS.includes(groupByColumnKey)
      ? { [groupByColumn.key]: targetList.id }
      : { [groupByColumn.name]: targetList.title };
    const originalUpdates = { [groupByColumn.key]: targetList.id };
    const { oldRowData, originalOldRowData } = getOldRowData(originalOldCellValue);

    modifyRecord(rowId, updates, oldRowData, originalUpdates, originalOldRowData);
  }, [metadata.view.settings, lists, groupByColumn, modifyRecord, getOldRowData]);

  const onUpdateSettings = useCallback((newSettings) => {
    store.modifySettings(newSettings);
  }, [store]);

  useEffect(() => {
    const unsubscribeKanbanSetting = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.TOGGLE_KANBAN_SETTING, () => setSettingPanelOpen(!isSettingPanelOpen));

    return () => {
      unsubscribeKanbanSetting();
    };
  }, [isSettingPanelOpen, viewsMap]);

  return (
    <div className="sf-metadata-view-kanban-container">
      <div className="sf-metadata-view-kanban-wrapper">
        <div className="sf-metadata-view-kanban">
          {lists.length === 0 ? (
            <EmptyTip className="tips-empty-board" text={gettext('No categories')} />
          ) : (
            lists.map((list, index) => (
              <div
                key={list.id}
                draggable={draggable}
                onDragStart={(event) => onListDragStart(event, list.id)}
                onDragOver={(event) => onListDragOver(event, list.id)}
                onDragLeave={onListDragLeave}
                onDrop={(event) => onListDrop(event, index)}
                className={classNames('kanban-list', {
                  'dragging': draggingListId === list.id,
                  'drag-over': dragOverListId === list.id,
                })}
              >
                <List
                  key={list._id}
                  {...list}
                  settings={metadata.view.settings}
                  moreOperationsList={moreOperationsList}
                  onDeleteList={() => handleDeleteList(list._id)}
                  draggable={draggable}
                  onCardDrop={onCardDrop}
                  dragSourceListId={dragSourceListId}
                  onDragSourceListId={onDragSourceListId}
                  dragOverListId={dragOverListId}
                  onDragOverListId={onDragOverListId}
                  placeholderHeight={placeholderHeight}
                  onSetPlaceholderHeight={onSetPlaceholderHeight}
                />
              </div>
            ))
          )}
          {canAddList && (
            <AddList groupByColumn={groupByColumn}/>
          )}
        </div>
      </div>
      <div className="sf-metadata-view-kanban-setting h-100">
        {isSettingPanelOpen && (
          <SettingPanel
            columns={columns}
            settings={metadata.view.settings}
            onUpdateSettings={onUpdateSettings}
            onClose={() => setSettingPanelOpen(false)}
          />
        )}
      </div>
    </div>
  );
};

export default Kanban;
