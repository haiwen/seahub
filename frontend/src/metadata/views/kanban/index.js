import React, { useState, useMemo, useEffect, useCallback } from 'react';
import classNames from 'classnames';
import { Icon } from '@seafile/sf-metadata-ui-component';
import { useMetadata } from '../../hooks/metadata';
import { useMetadataView } from '../../hooks/metadata-view';
import { useCollaborators } from '../../hooks';
import { CellType, EVENT_BUS_TYPE, PRIVATE_COLUMN_KEY, PRIVATE_COLUMN_KEYS } from '../../constants';
import { COLUMN_DATA_OPERATION_TYPE } from '../../store/operations';
import { gettext } from '../../../utils/constants';
import { getViewShownColumns } from '../../utils/view';
import toaster from '../../../components/toast';
import { getCellValueByColumn } from '../../utils/cell';
import AddListPopover from '../../components/popover/add-list-popover';
import SettingPanel from './setting-panel';
import List from './list';
import useKanbanSettings from './useKanbanSettings';

import './index.css';

const Kanban = () => {
  const [isSettingOpen, setSettingOpen] = useState(false);
  const [isShowAddListPopover, setShowAddListPopover] = useState(false);
  const [draggingListId, setDraggingListId] = useState(null);
  const [dragOverListId, setDragOverListId] = useState(null);

  const { viewsMap } = useMetadata();
  const { metadata, store } = useMetadataView();
  const { collaborators } = useCollaborators();

  const {
    selectedViewId,
    groupByColumnKey,
    titleFieldKey,
    hideEmptyValues,
    showFieldNames,
    textWrap,
    updateSetting,
  } = useKanbanSettings(viewsMap);

  const shownColumns = useMemo(() => getViewShownColumns(viewsMap[selectedViewId], metadata.columns), [viewsMap, metadata.columns, selectedViewId]);

  const groupByColumn = useMemo(() => {
    return shownColumns.find(col => col.key === groupByColumnKey);
  }, [shownColumns, groupByColumnKey]);

  const titleField = useMemo(() => {
    return shownColumns.find(col => col.key === titleFieldKey);
  }, [shownColumns, titleFieldKey]);

  const currentSettings = useMemo(() => ({
    selectedViewId,
    groupByColumnKey,
    titleFieldKey,
    hideEmptyValues,
    showFieldNames,
    textWrap,
  }), [selectedViewId, groupByColumnKey, titleFieldKey, hideEmptyValues, showFieldNames, textWrap]);

  const contentFields = useMemo(() => {
    return shownColumns.filter(col => col.key !== titleFieldKey);
  }, [shownColumns, titleFieldKey]);

  const lists = useMemo(() => {
    if (!groupByColumn) return [];

    const { rows } = metadata;
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
        contentFields,
        cards: isPrivateColumn ? groupedCardsMap[option.id] : groupedCardsMap[option.name],
      }));
    } else if (groupByColumn.type === CellType.COLLABORATOR) {
      if (Array.isArray(collaborators)) {
        groupedLists = collaborators.map(collaborator => ({
          id: collaborator.email,
          title: [collaborator.email],
          field: groupByColumn,
          contentFields,
          cards: groupedCardsMap[collaborator.email],
        }));
      }
    }

    const ungroupedList = {
      id: 'uncategorized',
      title: gettext('Uncategorized'),
      field: groupByColumn,
      contentFields,
      cards: ungroupedCards,
    };

    groupedLists.push(ungroupedList);

    return groupedLists;
  }, [metadata, collaborators, groupByColumnKey, groupByColumn, titleField, contentFields]);

  const canAddList = useMemo(() => {
    const groupByCol = shownColumns.find(col => col.key === groupByColumn?.key);
    return groupByCol?.editable;
  }, [shownColumns, groupByColumn]);

  const handleAddListButtonClick = useCallback(() => {
    setShowAddListPopover(true);
  }, []);

  const handleAddNewList = useCallback((option) => {
    const oldData = groupByColumn.data;
    const options = [...oldData.options, option];
    const optionModifyType = COLUMN_DATA_OPERATION_TYPE.ADD_OPTION;
    store.modifyColumnData(groupByColumn.key, { options }, { options: oldData.options }, { optionModifyType });
    setShowAddListPopover(false);
  }, [store, groupByColumn]);

  const handleCancelAddList = useCallback(() => {
    setShowAddListPopover(false);
  }, []);

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

  const onListDragEnter = useCallback((event, listId) => {
    if (!draggingListId) return;
    setDragOverListId(listId);
  }, [draggingListId]);

  const onListDragLeave = useCallback(() => {
    if (!draggingListId) return;
    setDragOverListId(null);
  }, [draggingListId]);

  const onListDragOver = useCallback((event) => {
    if (!draggingListId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, [draggingListId]);

  const onListDrop = useCallback((event, dropIndex) => {
    event.preventDefault();
    const dragData = event.dataTransfer.getData('application/kanban-list');
    if (!dragData) return;
    const { listId: dragListId } = JSON.parse(dragData);
    const oldData = shownColumns.find(col => col.key === groupByColumn.key).data;
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
  }, [store, shownColumns, groupByColumn]);

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
    const originalOldRowData = { [columnKey]: originalOldCellValue }; // { [column.key]: cellValue }
    return { oldRowData, originalOldRowData };
  }, [groupByColumn]);

  const onCardDrop = useCallback((record, sourceListId, targetListId) => {
    if (sourceListId === targetListId) return;

    const rowId = record[PRIVATE_COLUMN_KEY.ID];
    const targetList = lists.find(list => list.id === targetListId);
    const originalOldCellValue = getCellValueByColumn(record, groupByColumn);
    const updates = PRIVATE_COLUMN_KEYS.includes(groupByColumnKey)
      ? { [groupByColumn.key]: targetList.id }
      : { [groupByColumn.name]: targetList.title };
    const originalUpdates = { [groupByColumn.key]: targetList.id };
    const { oldRowData, originalOldRowData } = getOldRowData(originalOldCellValue);

    modifyRecord(rowId, updates, oldRowData, originalUpdates, originalOldRowData);
  }, [lists, groupByColumnKey, groupByColumn, modifyRecord, getOldRowData]);

  useEffect(() => {
    const unsubscribeKanbanSetting = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.TOGGLE_KANBAN_SETTING, () => setSettingOpen(!isSettingOpen));

    return () => {
      unsubscribeKanbanSetting();
    };
  }, [isSettingOpen, viewsMap]);

  return (
    <div className='sf-metadata-view-kanban-container'>
      <div className='sf-metadata-view-kanban-wrapper'>
        <div className='sf-metadata-view-kanban'>
          {lists && lists.map((list, index) => (
            <div
              key={list.id}
              draggable={list.field.editable}
              onDragStart={(event) => onListDragStart(event, list.id)}
              onDragEnter={(event) => onListDragEnter(event, list.id)}
              onDragLeave={onListDragLeave}
              onDragOver={onListDragOver}
              onDrop={(event) => onListDrop(event, index)}
              className={classNames('kanban-list', {
                'dragging': draggingListId === list.id,
                'drag-over': dragOverListId === list.id,
              })}
            >
              <List
                key={list._id}
                {...list}
                settings={currentSettings}
                moreOperationsList={moreOperationsList}
                onDeleteList={() => handleDeleteList(list._id)}
                onCardDrop={onCardDrop}
              />
            </div>
          ))}
          {canAddList && (
            <div
              id="add-list-button"
              className='add-list-button'
              onClick={handleAddListButtonClick}
            >
              <Icon iconName="add-table" />
              <span className="btn-text">{gettext('Add a new list')}</span>
            </div>
          )}
          {isShowAddListPopover && (
            <AddListPopover
              options={groupByColumn.data.options}
              onCancel={handleCancelAddList}
              onSubmit={handleAddNewList}
            />
          )}
        </div>
      </div>
      {isSettingOpen &&
      <SettingPanel
        shownColumns={shownColumns}
        settings={currentSettings}
        onSettingChange={updateSetting}
        onClose={() => setSettingOpen(false)}
      />}
    </div>
  );
};

export default Kanban;
