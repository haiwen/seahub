import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { repoTrashAPI } from './api';
import { isFiltersValid, transformTrashListToTableData } from './utils';
import Loading from '../../loading';
import SFTable from '../../sf-table';
import EventBus from '../../common/event-bus';
import { EVENT_BUS_TYPE } from '../../common/event-bus-type';
import { Utils } from '../../../utils/utils';
import toaster from '../../toast';

import './index.css';

const PER_PAGE = 100;
export default function DirTrashView({ repoID, currentRepoInfo, toggleShowDirentToolbar }) {

  const [isFirstLoading, setIsFirstLoading] = useState(true);
  const [trashList, setTrashList] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectIds, setSelectIds] = useState([]);
  const [canSearch, setCanSearch] = useState(false);
  const [trashSearchValue, setTrashSearchValue] = useState('');
  const [trashFilters, setTrashFilters] = useState({});

  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const restoreTrashes = useCallback(() => {
    let restoreItems = {};
    selectIds.forEach(item => {
      const index = item.split('_')[1];
      const trashItem = trashList[index];
      const { commit_id, parent_dir, obj_name } = trashItem;
      const path = Utils.joinPath(parent_dir, obj_name);
      if (restoreItems[commit_id]) {
        restoreItems[commit_id] = restoreItems[commit_id].push(path);
      } else {
        restoreItems[commit_id] = [path];
      }
    });

    const unShowTrashList = selectIds.reduce((res, item) => {
      const index = item.split('_')[1];
      res[index] = true;
      return res;
    }, {});

    repoTrashAPI.restoreTrashItems(repoID, restoreItems).then(res => {
      const newTrashList = trashList.filter((item, index) => !unShowTrashList[index + '']);
      setTrashList(newTrashList);
      setSelectIds([]);

      // clear header left toolbar
      const eventBus = EventBus.getInstance();
      eventBus.dispatch(EVENT_BUS_TYPE.SELECT_TRASH, []);
      toggleShowDirentToolbar(false);
    }).catch(error => {
      const errorMessage = Utils.getErrorMsg(error);
      toaster.danger(errorMessage);
    });
  }, [repoID, selectIds, toggleShowDirentToolbar, trashList]);


  const onTrashSearchValueChange = useCallback((value) => {
    if (!value && !isFiltersValid(trashFilters)) {
      // Trigger the function to load the next page
      setCurrentPage(1);
    }
    setTrashSearchValue(value);
  }, [trashFilters]);

  const onTrashFiltersValueChange = useCallback((filters) => {
    if (!isFiltersValid(filters) && !trashSearchValue) {
      // Trigger the function to load the next page
      setCurrentPage(1);
    }
    setTrashFilters(filters);
  }, [trashSearchValue]);

  const refreshTrash = useCallback(() => {
    // Trigger the function to load the next page
    setCurrentPage(1);
  }, []);


  useEffect(() => {
    const eventBus = EventBus.getInstance();
    const unsubscribeRestoreTrash = eventBus.subscribe(EVENT_BUS_TYPE.RESTORE_TRASH, restoreTrashes);
    const unsubscribeTrashSearch = eventBus.subscribe(EVENT_BUS_TYPE.TRASH_SEARCH, onTrashSearchValueChange);
    const unsubscribeTrashFilter = eventBus.subscribe(EVENT_BUS_TYPE.TRASH_FILTER, onTrashFiltersValueChange);
    const unsubscribeRefreshTrash = eventBus.subscribe(EVENT_BUS_TYPE.REFRESH_TRASH, refreshTrash);

    return () => {
      unsubscribeRestoreTrash();
      unsubscribeTrashSearch();
      unsubscribeTrashFilter();
      unsubscribeRefreshTrash();
    };
  }, [onTrashFiltersValueChange, onTrashSearchValueChange, refreshTrash, restoreTrashes]);

  useEffect(() => {
    repoTrashAPI.getRepoFolderTrash(repoID, currentPage, PER_PAGE).then(res => {
      const { items, total_count, can_search } = res.data;
      setTrashList(items);
      if (total_count > currentPage * PER_PAGE) {
        setHasMore(true);
        setCurrentPage(2);
      }
      setCanSearch(can_search);
      setIsFirstLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFirstLoading]);

  const loadNextPage = useCallback(() => {
    setIsLoadingMore(true);
    if (!trashSearchValue && !trashFilters) {
      repoTrashAPI.getRepoFolderTrash(repoID, currentPage, PER_PAGE).then(res => {
        const { items, total_count } = res.data;
        setTrashList([...trashList, ...items]);
        if (total_count > currentPage * PER_PAGE) {
          setHasMore(true);
          setCurrentPage(currentPage + 1);
        } else {
          setHasMore(false);
        }
        setIsLoadingMore(false);
      });
    } else {
      repoTrashAPI.searchRepoFolderTrash(repoID, currentPage, PER_PAGE, trashSearchValue, trashFilters).then(res => {
        const { items, total_count } = res.data;
        setTrashList([...trashList, ...items]);
        if (total_count > currentPage * PER_PAGE) {
          setHasMore(true);
          setCurrentPage(currentPage + 1);
        } else {
          setHasMore(false);
        }
        setIsLoadingMore(false);
      });
    }
  }, [currentPage, repoID, trashFilters, trashList, trashSearchValue]);

  useEffect(() => {
    if (isFirstLoading) return;
    repoTrashAPI.searchRepoFolderTrash(repoID, 1, PER_PAGE, trashSearchValue, trashFilters).then(res => {
      const { items, total_count, can_search } = res.data;
      setTrashList(items);
      if (total_count > currentPage * PER_PAGE) {
        setHasMore(true);
        setCurrentPage(2);
      } else {
        setHasMore(false);
      }
      setCanSearch(can_search);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trashSearchValue, trashFilters]);


  const tableData = useMemo(() => {
    return transformTrashListToTableData(trashList, repoID);
  }, [repoID, trashList]);

  const handleColumnWidthChange = () => {};

  const handleCellDoubleClick = () => {};

  const checkCanModifyRecord = () => {};

  const updateSelectedTrashIds = useCallback((ids) => {
    toggleShowDirentToolbar(ids.length > 0);
    setSelectIds(ids);
    setTimeout(() => {
      const eventBus = EventBus.getInstance();
      eventBus.dispatch(EVENT_BUS_TYPE.SELECT_TRASH, ids);
    }, 0);

  }, [toggleShowDirentToolbar]);

  if (isFirstLoading) return <Loading />;

  return (
    <div className="dir-trash-view sf-trash-wrapper">
      <SFTable
        table={tableData}
        visibleColumns={tableData.columns}
        recordsIds={tableData.row_ids}
        headerSettings={{}}
        noRecordsTipsText=""
        groupbys={[]}
        groups={[]}
        recordsTree={[]}
        showSequenceColumn={true}
        showGridFooter={true}
        hasMoreRecords={hasMore}
        isLoadingMoreRecords={isLoadingMore}
        enableScrollToLoad={false}
        loadMore={loadNextPage}
        modifyColumnWidth={handleColumnWidthChange}
        onCellDoubleClick={handleCellDoubleClick}
        checkCanModifyRecord={checkCanModifyRecord}
        supportCopy={false}
        supportPaste={false}
        supportDragFill={false}
        supportCut={false}
        isGroupView={false}
        showRecordAsTree={false}
        updateSelectedRecordIds={updateSelectedTrashIds}
      />
    </div>
  );
}
