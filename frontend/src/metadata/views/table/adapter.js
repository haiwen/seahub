import React, { useMemo } from 'react';
import { GridUtilsAdapter } from '@/components/sf-table/utils/grid-utils-adapter';
import CellFormatter from '../../components/cell-formatter';
import Editor from '../../components/cell-editors/editor';
import { CellType, EVENT_BUS_TYPE, PRIVATE_COLUMN_KEY, PRIVATE_COLUMN_KEYS } from '@/metadata/constants';
import { getColumnDisplayName } from '../../utils/column';
import { COLUMNS_ICON_CONFIG, COLUMNS_ICON_NAME } from '../../constants/column/icon';
import { buildTableMenuOptions } from '@/metadata/utils/menu-builder';
import { checkIsDir } from '@/metadata/utils/row';
import { getParentDirFromRecord, getRecordIdFromRecord } from '@/metadata/utils/cell';
import TextTranslation from '@/utils/text-translation';
import { openInNewTab, openParentFolder } from '@/metadata/utils/file';
import { DropdownItem, Dropdown, DropdownToggle, DropdownMenu } from 'reactstrap';
import Icon from '@/components/icon';

const POPUP_EDITOR_COLUMN_TYPES = [
  CellType.DATE,
  CellType.COLLABORATOR,
  CellType.SINGLE_SELECT,
  CellType.MULTIPLE_SELECT,
  CellType.LONG_TEXT,
  CellType.LINK,
  CellType.TAGS,
  CellType.GEOLOCATION,
];

export const adaptMetadataColumnsToSfTable = (repoID, metadataColumns) => {
  if (!Array.isArray(metadataColumns)) {
    return metadataColumns;
  }

  return metadataColumns.map(column => {
    const displayName = getColumnDisplayName(column.key, column.name);
    const iconName = COLUMNS_ICON_CONFIG[column.type] || 'text';
    const iconTooltip = COLUMNS_ICON_NAME[column.type] || 'Text';

    return {
      ...column,
      display_name: displayName,
      icon_name: iconName,
      icon_tooltip: iconTooltip,
      formatter: <CellFormatter repoID={repoID} />,
      editor: <Editor />,
      is_name_column: column.type === CellType.FILE_NAME,
      is_popup_editor: POPUP_EDITOR_COLUMN_TYPES.includes(column.type),
      is_support_preview: [CellType.FILE_NAME].includes(column?.type),
      is_support_direct_edit: [CellType.CHECKBOX].includes(column?.type),
      editable_via_click_cell: column.editable,
      is_private: PRIVATE_COLUMN_KEYS.includes(column.key),
    };
  });
};

/**
 * GridUtils and PasteUtils adapter for metadata table.
 * Provides a unified interface for drag-fill and paste operations.
 */
export { GridUtilsAdapter } from '@/components/sf-table/utils/grid-utils-adapter';
export { GridUtilsAdapter as MetadataGridUtilsAdapter } from '@/components/sf-table/utils/grid-utils-adapter';

// Create context menu options for SFTable using metadata's menu pattern
// This replicates the logic from metadata/views/table/context-menu.js
export const createMetadataContextMenuOptions = ({
  repoID,
  readOnly,
  enableFaceRecognition,
  enableTags,
  recordMetrics,
  selectedPosition,
  selectedRange,
  recordGetterByIndex,
  isGroupView,
  metadata,
  deleteRecords,
  updateRecordDetails,
  updateFaceRecognition,
  updateRecordDescription,
  onOCR,
  generateFileTags,
  hideMenu,
}) => {
  const metadataStatus = {
    enableFaceRecognition,
    enableGenerateDescription: metadata?.columns?.some(c => c.key === PRIVATE_COLUMN_KEY.FILE_DESCRIPTION) || false,
    enableTags,
  };

  const selectedIds = recordMetrics ? Object.keys(recordMetrics.idSelectedRecordMap || {}).filter(id => recordMetrics.idSelectedRecordMap[id]) : [];
  let records = [];
  let isSelectedRange = false;
  let isNameColumn = false;
  let areRecordsInSameFolder = true;
  let isMultiple = false;

  // Handle MULTIPLE selection FIRST (via checkbox/row selection) - priority over selectedPosition
  if (selectedIds.length > 1) {
    records = selectedIds.map(id => metadata?.id_row_map?.[id]).filter(Boolean);
    isMultiple = records.length > 1;

    if (isMultiple) {
      const firstPath = records[0] ? getParentDirFromRecord(records[0]) : '';
      areRecordsInSameFolder = records.every(record => getParentDirFromRecord(record) === firstPath);
    }
    isSelectedRange = false;
  } else if (selectedRange) {
    // Handle range selection second (from drag selection)
    const { topLeft, bottomRight } = selectedRange;
    for (let i = topLeft.rowIdx; i <= bottomRight.rowIdx; i++) {
      const record = recordGetterByIndex ? recordGetterByIndex({ isGroupView, groupRecordIndex: topLeft.groupRecordIndex, recordIndex: i }) : null;
      if (record) {
        records.push(record);
      }
    }
    isMultiple = records.length > 1;
    isSelectedRange = true;
  } else if (selectedPosition && selectedPosition.rowIdx !== undefined) {
    // Handle single cell selection (lowest priority)
    const { groupRecordIndex, rowIdx: recordIndex, idx } = selectedPosition;
    const column = metadata?.columns?.[idx];
    isNameColumn = column && (column.key === PRIVATE_COLUMN_KEY.FILE_NAME);

    const record = recordGetterByIndex ? recordGetterByIndex({ isGroupView, groupRecordIndex, recordIndex }) : null;
    if (record) {
      records = [record];
    }
    isMultiple = false;
  }

  if (records.length === 0) {
    return [];
  }

  const menuOptions = buildTableMenuOptions(
    records,
    readOnly,
    metadataStatus,
    isMultiple,
    areRecordsInSameFolder,
    isNameColumn,
    isSelectedRange
  );

  // Helper to get current records for event handling
  const singleRecord = records.length === 1 ? records[0] : null;

  // Handle option click
  const handleOptionClick = (option, event) => {
    event?.stopPropagation();
    event?.preventDefault();

    const eventBus = window.sfMetadataContext?.eventBus;
    if (!eventBus) return;

    switch (option.key) {
      case TextTranslation.OPEN_FILE_IN_NEW_TAB.key:
      case TextTranslation.OPEN_FOLDER_IN_NEW_TAB.key:
        if (singleRecord) {
          openInNewTab(repoID, singleRecord);
        }
        break;
      case TextTranslation.OPEN_PARENT_FOLDER.key:
        if (singleRecord) {
          openParentFolder(singleRecord);
        }
        break;
      case TextTranslation.RENAME.key:
        if (singleRecord && singleRecord._id) {
          eventBus.dispatch(EVENT_BUS_TYPE.OPEN_EDITOR);
        }
        break;
      case TextTranslation.MOVE.key:
      case TextTranslation.MOVE_FILE.key:
      case TextTranslation.MOVE_FOLDER.key:
        if (records.length > 0) {
          eventBus.dispatch(EVENT_BUS_TYPE.TOGGLE_MOVE_DIALOG, records);
        }
        break;
      case TextTranslation.COPY.key:
        if (records.length > 0) {
          eventBus.dispatch(EVENT_BUS_TYPE.TOGGLE_COPY_DIALOG, records);
        }
        break;
      case TextTranslation.DOWNLOAD.key:
        if (records.length > 0) {
          const recordsIds = records.map(r => getRecordIdFromRecord(r)).filter(Boolean);
          if (recordsIds.length > 0) {
            eventBus.dispatch(EVENT_BUS_TYPE.DOWNLOAD_RECORDS, recordsIds);
          }
        }
        break;
      case TextTranslation.DELETE.key:
      case TextTranslation.DELETE_FILE.key:
      case TextTranslation.DELETE_FOLDER.key:
      case TextTranslation.DELETE_SELECTED.key:
        if (records.length > 0) {
          if (records.some(r => checkIsDir(r))) {
            // Has folder - need delete dialog (cannot handle in this simple function)
            eventBus.dispatch(EVENT_BUS_TYPE.DELETE_RECORDS, records.map(r => getRecordIdFromRecord(r)).filter(Boolean));
          } else {
            const recordsIds = records.map(r => getRecordIdFromRecord(r)).filter(Boolean);
            if (recordsIds.length > 0 && deleteRecords) {
              deleteRecords(recordsIds);
            }
          }
        }
        break;
      case TextTranslation.CLEAR_SELECTED.key:
        eventBus.dispatch(EVENT_BUS_TYPE.SELECT_NONE);
        break;
      case TextTranslation.COPY_SELECTED.key:
        // Handled by SFTable's copy mechanism
        break;
      case TextTranslation.EXTRACT_FILE_DETAIL.key:
      case TextTranslation.EXTRACT_FILE_DETAILS.key:
        if (singleRecord) {
          updateRecordDetails([singleRecord]);
        }
        break;
      case TextTranslation.DETECT_FACES.key:
        if (records.length > 0) {
          updateFaceRecognition(records);
        }
        break;
      case TextTranslation.GENERATE_DESCRIPTION.key:
        if (singleRecord) {
          updateRecordDescription(singleRecord);
        }
        break;
      case TextTranslation.GENERATE_TAGS.key:
        if (singleRecord) {
          generateFileTags(singleRecord);
        }
        break;
      case TextTranslation.EXTRACT_TEXT.key:
        if (singleRecord) {
          onOCR(singleRecord, 'sf-table-rdg-selected');
        }
        break;
      default:
        break;
    }

    hideMenu?.(false);
  };

  // Render menu options as React elements
  const renderOptions = () => {
    return menuOptions.map((option, index) => {
      if (option === 'Divider') {
        return <DropdownItem key={`divider-${index}`} divider />;
      }
      if (option.subOpList) {
        return (
          <Dropdown
            key={option.key}
            direction="right"
            className="w-100"
            toggle={() => {}}
          >
            <DropdownToggle
              tag="span"
              className="dropdown-item font-weight-normal rounded-0 d-flex align-items-center"
            >
              <span className="mr-auto">{option.value}</span>
              <Icon symbol="down" className="rotate-270" />
            </DropdownToggle>
            <DropdownMenu>
              {option.subOpList.map((subItem, subIndex) => {
                if (subItem === 'Divider') {
                  return <DropdownItem key={`sub-divider-${subIndex}`} divider />;
                }
                return (
                  <DropdownItem key={subItem.key} onClick={(e) => { e.stopPropagation(); handleOptionClick(subItem, e); }}>
                    {subItem.value}
                  </DropdownItem>
                );
              })}
            </DropdownMenu>
          </Dropdown>
        );
      }
      return (
        <DropdownItem key={option.key} onClick={(e) => { e.stopPropagation(); handleOptionClick(option, e); }}>
          {option.value}
        </DropdownItem>
      );
    });
  };

  return renderOptions();
};

export const useMetadataTableAdapter = ({
  repoID,
  metadata,
  readOnly,
  modifyRecord,
  modifyRecords,
  recordGetterByIndex,
  recordGetterById,
  modifyColumnData,
  updateFileTags,
  deleteRecords,
  updateRecordDetails,
  updateFaceRecognition,
  updateRecordDescription,
  onOCR,
  generateFileTags,
  tagsData,
  collaborators,
}) => {
  return useMemo(() => {
    const api = {
      modifyRecord,
      modifyRecords,
      recordGetterByIndex,
      recordGetterById,
      modifyColumnData,
      updateFileTags,
      getTagsData: () => tagsData || {},
      getCollaborators: () => {
        if (!window.sfMetadata) return [];
        return window.sfMetadata.getCollaborators() || [];
      },
    };
    const adapter = new GridUtilsAdapter({
      renderRecordsIds: metadata?.view?.rows || [],
      api,
    });

    // Attach context menu options creator
    adapter.createContextMenuOptions = (props) => createMetadataContextMenuOptions({
      ...props,
      repoID,
      metadata,
      readOnly,
      deleteRecords,
      updateRecordDetails,
      updateFaceRecognition,
      updateRecordDescription,
      onOCR,
      generateFileTags,
    });

    return adapter;
  }, [modifyRecord, modifyRecords, recordGetterByIndex, recordGetterById, modifyColumnData, updateFileTags, metadata, repoID, readOnly, deleteRecords, updateRecordDetails, updateFaceRecognition, updateRecordDescription, onOCR, generateFileTags, tagsData]);
};

export const adaptSfTablePropsToMetadata = (sfTableProps, metadataProps) => {
  const {
    table,
    visibleColumns,
    recordsIds,
    groupbys,
    groups,
    modifyRecords,
    recordGetterByIndex,
    recordGetterById,
    getUpdateDraggedRecords,
    getCopiedRecordsAndColumnsFromRange,
  } = sfTableProps;

  return {
    table,
    columns: visibleColumns,
    recordIds: recordsIds,
    groupbys,
    groups,
    modifyRecords,
    recordGetterByIndex,
    recordGetterById,
    gridUtils: metadataProps?.gridUtils,
    getUpdateDraggedRecords,
    getCopiedRecordsAndColumnsFromRange,
  };
};
