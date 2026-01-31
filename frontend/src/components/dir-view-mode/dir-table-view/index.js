import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import SFTable from '../../sf-table';
import { transformDirentsToTableData } from './data-transformer';
import { createDirentTableColumns } from './columns';

import './index.css';
import { username } from '@/utils/constants';
import { Utils } from '@/utils/utils';

const DirTableView = ({
  direntList,
  repoID,
  repoInfo,
  path,
  sortBy,
  sortOrder,
  onSort,
  columns,
  hiddenColumnKeys,
  onItemClick,
  onItemRightClick,
  onItemMouseDown,
  onItemDoubleClick,
  onDirentChecked,
  onAllDirentsChecked,
  isAllDirentsChecked,
  isPartiallyChecked,
  onDirentStarClick,
  onEmptyAreaMouseDown,
  isReadOnly,
  showTrashModal,
  onBatchMoveToTrash,
  onBatchRestoreFromTrash,
  onBatchDelete,
  onBatchRemove,
  enableDirDownload,
  enableDirUpload,
  enableFileUpload,
  fileUploadType,
  getChildDirentList,
  registerExecuteOperation,
  unregisterExecuteOperation,
  statusColumnOptions,
  onDirentChange,
  onDirentStatus,
}) => {
  const tableData = useMemo(() => {
    return transformDirentsToTableData(direntList, repoID);
  }, [direntList, repoID]);

  const enrichedColumns = useMemo(() => {
    return createDirentTableColumns(columns, { repoID, repoInfo, tableData, onDirentChange, onDirentStatus });
  }, [repoID, repoInfo, tableData, columns, onDirentChange, onDirentStatus]);

  const handleColumnWidthChange = (column, newWidth) => {
  };

  const checkCanModifyRecord = (record) => {
    return !isReadOnly;
  };

  const createContextMenuOptions = useCallback((cellPosition) => {
    const { rowIdx } = cellPosition;
    const dirent = direntList[rowIdx];
    console.log('createContextMenuOptions', { cellPosition, dirent });
    const isRepoOwner = repoInfo.ower_email === username;
    return Utils.getDirentOperationList(isRepoOwner, repoInfo, dirent, true);
  }, [direntList, repoInfo]);

  return (
    <div className="dir-table-view dir-table-wrapper">
      <SFTable
        table={tableData}
        visibleColumns={enrichedColumns}
        recordsIds={tableData.row_ids}
        headerSettings={{}}
        noRecordsTipsText=""
        groupbys={[]}
        groups={[]}
        recordsTree={[]}
        showSequenceColumn={true}
        showGridFooter={false}
        hasMoreRecords={false}
        isLoadingMoreRecords={false}
        enableScrollToLoad={false}
        modifyColumnWidth={handleColumnWidthChange}
        checkCanModifyRecord={checkCanModifyRecord}
        supportCopy={false}
        supportPaste={false}
        supportDragFill={false}
        supportCut={false}
        isGroupView={false}
        showRecordAsTree={false}
        createContextMenuOptions={createContextMenuOptions}
      />
    </div>
  );
};

DirTableView.propTypes = {
  direntList: PropTypes.array.isRequired,
  repoID: PropTypes.string.isRequired,
  path: PropTypes.string.isRequired,
  sortBy: PropTypes.string,
  sortOrder: PropTypes.string,
  onSort: PropTypes.func,
  visibleColumns: PropTypes.array,
  onItemClick: PropTypes.func,
  onItemRightClick: PropTypes.func,
  onItemMouseDown: PropTypes.func,
  onItemDoubleClick: PropTypes.func,
  onDirentChecked: PropTypes.func,
  onAllDirentsChecked: PropTypes.func,
  isAllDirentsChecked: PropTypes.bool,
  isPartiallyChecked: PropTypes.bool,
  onDirentStarClick: PropTypes.func,
  onEmptyAreaMouseDown: PropTypes.func,
  isReadOnly: PropTypes.bool,
  showTrashModal: PropTypes.bool,
  onBatchMoveToTrash: PropTypes.func,
  onBatchRestoreFromTrash: PropTypes.func,
  onBatchDelete: PropTypes.func,
  onBatchRemove: PropTypes.func,
  enableDirDownload: PropTypes.bool,
  enableDirUpload: PropTypes.bool,
  enableFileUpload: PropTypes.bool,
  fileUploadType: PropTypes.string,
  getChildDirentList: PropTypes.func,
  registerExecuteOperation: PropTypes.func,
  unregisterExecuteOperation: PropTypes.func,
  collaborators: PropTypes.object,
  collaboratorsCache: PropTypes.object,
  updateCollaboratorsCache: PropTypes.func,
  queryUser: PropTypes.func,
  statusColumnOptions: PropTypes.array,
  updateDirentMetadata: PropTypes.func,
};

export default DirTableView;
