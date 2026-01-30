import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import SFTable from '../../sf-table';
import { transformDirentsToTableData } from './data-transformer';
import { createDirentTableColumns } from './columns';

import './index.css';

const DirTableView = ({
  direntList,
  repoID,
  path,
  sortBy,
  sortOrder,
  onSort,
  visibleColumns,
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
  updateDirentMetadata,
}) => {
  const tableData = useMemo(() => {
    return transformDirentsToTableData(direntList, repoID);
  }, [direntList, repoID]);

  const columns = useMemo(() => {
    let cols = createDirentTableColumns({
      repoID,
      path,
      sortBy,
      sortOrder,
      onSort,
      onItemClick,
    });

    return cols;
  }, [repoID, path, sortBy, sortOrder, onSort, onItemClick]);

  const handleCellDoubleClick = ({ rowIdx, idx }) => {
    if (onItemDoubleClick) {
      const dirent = direntList[rowIdx];
      onItemDoubleClick(dirent);
    }
  };

  const handleColumnWidthChange = (column, newWidth) => {
  };

  const checkCanModifyRecord = (record) => {
    return !isReadOnly;
  };

  return (
    <div className="dir-table-view">
      <SFTable
        table={tableData}
        visibleColumns={columns}
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
        onCellDoubleClick={handleCellDoubleClick}
        checkCanModifyRecord={checkCanModifyRecord}
        supportCopy={false}
        supportPaste={false}
        supportDragFill={false}
        supportCut={false}
        isGroupView={false}
        showRecordAsTree={false}
        createContextMenuOptions={() => []}
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
