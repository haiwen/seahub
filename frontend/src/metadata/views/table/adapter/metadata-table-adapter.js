import React, { useMemo } from 'react';
import GridUtils from '../utils/grid-utils';
import CellFormatter from '../../../components/cell-formatter';
import Editor from '../../../components/cell-editors/editor';
import { CellType } from '../../../constants';
import { getColumnDisplayName } from '../../../utils/column';
import { COLUMNS_ICON_CONFIG, COLUMNS_ICON_NAME } from '../../../constants/column/icon';


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

export const adaptMetadataColumnsToSfTable = (repoID, metadataColumns, tagsData, onFileNameClick) => {
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
      formatter: <CellFormatter repoID={repoID} tagsData={tagsData} />,
      editor: <Editor />,
      is_name_column: column.type === CellType.FILE_NAME,
      is_popup_editor: POPUP_EDITOR_COLUMN_TYPES.includes(column.type),
      is_support_preview: [CellType.FILE_NAME].includes(column?.type),
      is_support_direct_edit: [CellType.CHECKBOX].includes(column?.type),
      editable_via_click_cell: column.editable,
    };
  });
};

class MetadataGridUtilsAdapter {

  constructor(metadata, api) {
    this.metadata = metadata;
    this.api = api;
    this.gridUtils = new GridUtils(metadata, api);
  }

  getCopiedContent({ type, copied, isGroupView, columns }) {
    return this.gridUtils.getCopiedContent({ type, copied, isGroupView, columns });
  }

  getUpdateDraggedRecords(draggedRange, shownColumns, rows, idRowMap, groupMetrics) {
    return this.gridUtils.getUpdateDraggedRecords(draggedRange, shownColumns, rows, idRowMap, groupMetrics);
  }

  paste({ type, copied, multiplePaste, pasteRange, isGroupView, columns, pasteSource, cutPosition, viewId }) {
    return this.gridUtils.paste({ type, copied, multiplePaste, pasteRange, isGroupView, columns, pasteSource, cutPosition, viewId });
  }
}

export const useMetadataTableAdapter = ({
  metadata,
  modifyRecord,
  modifyRecords,
  recordGetterByIndex,
  recordGetterById,
  modifyColumnData,
  updateFileTags,
}) => {
  return useMemo(() => {
    const api = {
      modifyRecord,
      modifyRecords,
      recordGetterByIndex,
      recordGetterById,
      modifyColumnData,
      updateFileTags,
    };
    return new MetadataGridUtilsAdapter(metadata, api);
  }, [metadata, modifyRecord, modifyRecords, recordGetterByIndex, recordGetterById, modifyColumnData, updateFileTags]);
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

export default MetadataGridUtilsAdapter;
