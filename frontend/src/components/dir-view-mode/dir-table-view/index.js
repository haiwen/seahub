import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap';
import PropTypes from 'prop-types';
import SFTable from '../../sf-table';
import { transformDirentsToTableData } from './data-transformer';
import { createDirentTableColumns, setDirTableColumnWidth } from './columns';
import { siteRoot, enableSeadoc, enableWhiteboard } from '@/utils/constants';
import { Utils } from '@/utils/utils';
import Icon from '@/components/icon';
import TextTranslation from '@/utils/text-translation';
import { PRIVATE_COLUMN_KEY } from '@/metadata/constants';
import { RecordMetrics } from '../../sf-table/utils/record-metrics';
import { menuHandlers } from '../utils/menuHandlers';
import { useDirentContextMenu } from '../hooks/useDirentContextMenu';
import { getCreateMenuList } from '../utils/contextMenuUtils';

import './index.css';

const DIR_TABLE_UNSUPPORTED_MENU_OPTION_KEYS = [
  TextTranslation.STAR.key,
  TextTranslation.UNSTAR.key,
];

const DirTableView = ({
  direntList,
  repoID,
  repoInfo,
  path,
  sortBy,
  sortOrder,
  columns,
  hiddenColumnKeys,
  eventBus,
  onItemClick,
  onItemDelete,
  onItemRename,
  onItemSelected,
  onBatchDelete,
  updateDirent,
  updateDirentProperties,
  onDirentStatus,
  onItemConvert,
  showDirentDetail,
  onItemsMove,
  onItemMove,
  onSelectedDirentListUpdate,
}) => {
  const [isSubMenuShown, setSubMenuShown] = useState(false);
  const [hoveredOptionKey, setHoveredOptionKey] = useState('');
  const [columnWidthVersion, setColumnWidthVersion] = useState(0);
  const hideMenuRef = useRef(null);

  // Use the shared context menu hook
  const { getBatchMenuList, getItemMenuList } = useDirentContextMenu({ repoInfo });

  const tableData = useMemo(() => {
    return transformDirentsToTableData(direntList, repoID);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direntList, repoID, sortBy, sortOrder]);

  const handleItemClick = useCallback((value) => {
    const dirent = direntList.find(item => item.name === value);
    onItemClick && onItemClick(dirent);
  }, [direntList, onItemClick]);

  const enrichedColumns = useMemo(() => {
    return createDirentTableColumns(columns, hiddenColumnKeys, { repoID, repoInfo, tableData, onItemClick: handleItemClick, updateDirent, onDirentStatus });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, hiddenColumnKeys, repoID, repoInfo, tableData, handleItemClick, updateDirent, onDirentStatus, columnWidthVersion]);

  const modifyColumnWidth = useCallback((column, newWidth) => {
    setDirTableColumnWidth(column.key, newWidth);
    setColumnWidthVersion(prev => prev + 1);
  }, []);

  const checkCanModifyRecord = (record) => {
    return record._permission !== 'r';
  };

  const modifyRecord = useCallback(({ rowId, updates, otherProps }) => {
    const dirent = direntList.find(d => d._id === rowId || d.id === rowId);
    if (!dirent) return;

    Object.entries(updates).forEach(([key, value]) => {
      if (key === PRIVATE_COLUMN_KEY.FILE_NAME) {
        onItemRename(dirent, value);
      }
    });
  }, [direntList, onItemRename]);

  const toggleSubMenu = (e, subMenuOptionKey) => {
    e.stopPropagation();
    if (!subMenuOptionKey) {
      setSubMenuShown(!isSubMenuShown);
      return;
    }
    setSubMenuShown(true);
    setHoveredOptionKey(subMenuOptionKey);
  };

  const onOptionClick = (e, option, dirent, selectedDirents) => {
    e.preventDefault();
    e.stopPropagation();

    const isBatch = selectedDirents && selectedDirents.length > 1;
    const dirents = isBatch ? selectedDirents : dirent;

    const handler = menuHandlers[option.key];
    if (handler) {
      handler({
        eventBus,
        path,
        repoID,
        dirent,
        dirents,
        isBatch,
        onBatchDelete,
        onItemDelete,
        updateDirentProperties,
        onItemConvert,
        showDirentDetail,
        direntList,
      });
    }

    hideMenuRef.current && hideMenuRef.current();
  };

  const createContextMenuOptions = (tableProps) => {
    const { hideMenu, recordMetrics, selectedPosition } = tableProps;
    const { idx, rowIdx } = selectedPosition;
    hideMenuRef.current = hideMenu;

    const selectedRecordIds = RecordMetrics.getSelectedIds(recordMetrics);
    const selectedDirents = selectedRecordIds
      .map(id => direntList.find(d => d._id === id))
      .filter(Boolean);

    // No selection - show create menu
    if (idx === -1 && rowIdx === -1 && selectedRecordIds.length === 0) {
      const createMenuOptions = getCreateMenuList({
        enableSeadoc,
        enableWhiteboard,
        isRepoEncrypted: repoInfo.encrypted
      });

      return createMenuOptions.map((option, index) => {
        if (option === 'Divider') {
          return <div key={index} className="seafile-divider dropdown-divider"></div>;
        }
        return (
          <button
            key={option.key}
            className="seafile-contextmenu-item dropdown-item dir-table-menu-item"
            onClick={(e) => onOptionClick(e, option, null, selectedDirents)}
          >
            {option.value}
          </button>
        );
      });
    }

    // Show batch operations menu
    if (selectedDirents.length > 1) {
      const batchOptions = getBatchMenuList(selectedDirents);

      return batchOptions.map((option, index) => (
        <button
          key={option.key}
          className="seafile-contextmenu-item dropdown-item dir-table-menu-item"
          onClick={(e) => onOptionClick(e, option, null, selectedDirents)}
        >
          {option.value}
        </button>
      ));
    }

    // Single dirent menu
    const dirent = selectedDirents[0] || direntList[rowIdx];
    const options = getItemMenuList(dirent)
      .filter(option => !DIR_TABLE_UNSUPPORTED_MENU_OPTION_KEYS.includes(option.key));

    return options.map((option, index) => {
      if (option === 'Divider') {
        return <div key={index} className="seafile-divider dropdown-divider"></div>;
      } else if (option.subOpList) {
        return (
          <Dropdown
            key={index}
            direction="right"
            className="w-100"
            isOpen={isSubMenuShown && option.key === hoveredOptionKey}
            toggle={toggleSubMenu}
            onMouseMove={(e) => {e.stopPropagation();}}
          >
            <DropdownToggle
              tag="span"
              className="dropdown-item font-weight-normal rounded-0 d-flex align-items-center"
              onMouseEnter={(e) => toggleSubMenu(e, option.key)}
            >
              <span className="mr-auto">{option.value}</span>
              <Icon symbol="down" className="rotate-270" />
            </DropdownToggle>
            <DropdownMenu>
              {option.subOpList.map((subOp, subIndex) => {
                if (subOp == 'Divider') {
                  return <DropdownItem key={subIndex} divider />;
                } else {
                  return (
                    <DropdownItem
                      key={subIndex}
                      data-operation={subOp.key}
                      onClick={(e) => onOptionClick(e, subOp, dirent, selectedDirents)}
                      onContextMenu={(e) => e.stopPropagation()}
                    >
                      {subOp.value}
                    </DropdownItem>
                  );
                }
              })}
            </DropdownMenu>
          </Dropdown>
        );
      } else {
        return (
          <button
            key={index}
            className="seafile-contextmenu-item dropdown-item dir-table-menu-item"
            data-op={option.key}
            onClick={(e) => onOptionClick(e, option, dirent, selectedDirents)}
            onContextMenu={(e) => e.stopPropagation()}
            onMouseMove={() => {setSubMenuShown(false);}}
          >
            {option.value}
          </button>
        );
      }
    });
  };

  const onRecordSelected = useCallback((event, recordId) => {
    const dirent = direntList.find(d => d._id === recordId || d.id === recordId); // _id for file, id for folder
    onItemSelected(dirent, event);
  }, [direntList, onItemSelected]);

  const renderCustomDraggedRows = useCallback((draggedRecordIds) => {
    if (!Array.isArray(draggedRecordIds) || draggedRecordIds.length === 0) return null;
    return draggedRecordIds.map((recordId) => {
      const dirent = direntList.find(d => d._id === recordId || d.id === recordId);
      if (!dirent) return null;
      const iconUrl = Utils.getDirentIcon(dirent);
      return (
        <tr key={`rdg-dragged-record-${recordId}`} className="rdg-dragged-record">
          <td className="rdg-dragged-record-cell">
            <div className="d-flex align-items-center">
              {dirent.encoded_thumbnail_src ? (
                <img
                  src={`${siteRoot}${dirent.encoded_thumbnail_src}?mtime=${dirent.mtime}`}
                  alt={dirent.name}
                  className="thumbnail"
                  style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 2 }}
                />
              ) : (
                <img src={iconUrl} width="24" height="24" alt="" style={{ borderRadius: 2 }} />
              )}
              <span className="ml-2">{dirent.name}</span>
            </div>
          </td>
        </tr>
      );
    });
  }, [direntList]);

  const moveDirents = useCallback(({ draggingSource, dropTarget }) => {
    if (!draggingSource || !dropTarget) {
      return;
    }

    const destRecordId = dropTarget;
    const destDirent = direntList.find(d => d._id === destRecordId || d.id === destRecordId);
    if (!destDirent) {
      return;
    }

    const destRepo = {
      repo_id: repoID,
    };

    let destDirentPath;
    if (destDirent.type === 'dir') {
      const parentPath = destDirent.parent_path || path;
      destDirentPath = parentPath === '/' ? `/${destDirent.name}` : `${parentPath}/${destDirent.name}`;
    } else {
      destDirentPath = path;
    }

    if (draggingSource.length === 1) {
      if (!onItemMove) return;
      const sourceDirentId = draggingSource[0];
      const sourceDirent = direntList.find(d => d._id === sourceDirentId || d.id === sourceDirentId);
      if (!sourceDirent) return;
      onItemMove(destRepo, sourceDirent, destDirentPath, path, false);
    } else {
      if (!onItemsMove) return;
      onItemsMove(destRepo, destDirentPath, false);
    }
  }, [repoID, path, direntList, onItemMove, onItemsMove]);

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
        modifyColumnWidth={modifyColumnWidth}
        checkCanModifyRecord={checkCanModifyRecord}
        modifyRecord={modifyRecord}
        supportCopy={false}
        supportPaste={false}
        supportDragFill={false}
        supportCut={false}
        isGroupView={false}
        showRecordAsTree={false}
        createContextMenuOptions={createContextMenuOptions}
        onRecordSelected={onRecordSelected}
        renderCustomDraggedRows={renderCustomDraggedRows}
        moveRecords={moveDirents}
        updateSelectedRecordIds={onSelectedDirentListUpdate}
      />
    </div>
  );
};

DirTableView.propTypes = {
  direntList: PropTypes.array.isRequired,
  repoID: PropTypes.string.isRequired,
  repoInfo: PropTypes.object.isRequired,
  path: PropTypes.string.isRequired,
  sortBy: PropTypes.string,
  sortOrder: PropTypes.string,
  columns: PropTypes.array,
  hiddenColumnKeys: PropTypes.array,
  eventBus: PropTypes.object,
  onItemClick: PropTypes.func,
  onItemDelete: PropTypes.func,
  onItemRename: PropTypes.func,
  onItemSelected: PropTypes.func,
  onBatchDelete: PropTypes.func,
  updateDirent: PropTypes.func,
  updateDirentProperties: PropTypes.func,
  onDirentStatus: PropTypes.func,
  onItemConvert: PropTypes.func,
  showDirentDetail: PropTypes.func,
  onItemsMove: PropTypes.func,
  onItemMove: PropTypes.func,
};

export default DirTableView;
