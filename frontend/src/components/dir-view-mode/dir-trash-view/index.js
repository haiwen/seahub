import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { repoTrashAPI } from './api';
import { generateTrashItem, getTrashPath, isFiltersValid, transformTrashListToTableData } from './utils';
import Loading from '../../loading';
import SFTable from '../../sf-table';
import EventBus, { eventBus } from '../../common/event-bus';
import { EVENT_BUS_TYPE } from '../../common/event-bus-type';
import { Utils } from '../../../utils/utils';
import { siteRoot } from '../../../utils/constants';
import toaster from '../../toast';
import { seafileAPI } from '../../../utils/seafile-api';

import './index.css';
import classNames from 'classnames';

const PER_PAGE = 100;
export default function DirTrashView({ repoID, toggleShowDirentToolbar }) {

  const [isFirstLoading, setIsFirstLoading] = useState(true);
  const [trashList, setTrashList] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [selectIds, setSelectIds] = useState([]);
  const [canSelected, setCanSelected] = useState(true);

  const [trashSearchValue, setTrashSearchValue] = useState('');
  const [trashFilters, setTrashFilters] = useState({});

  const [trashItem, setCurrentTrashItem] = useState(false);

  const reloadTrashList = useCallback(() => {
    repoTrashAPI.getRepoFolderTrash(repoID, currentPage, PER_PAGE).then(res => {
      const { items, total_count, can_search } = res.data;
      setTrashList(items);
      if (total_count > currentPage * PER_PAGE) {
        setHasMore(true);
        setCurrentPage(2);
      }
      setIsFirstLoading(false);
      setCanSelected(true);

      const eventBus = EventBus.getInstance();
      eventBus.dispatch(EVENT_BUS_TYPE.TRASH_SEARCH_STATE_CHANGED, can_search);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    reloadTrashList();
  }, [reloadTrashList]);

  const onTrashItemClick = useCallback((trashItem) => {
    const { is_dir, obj_id, commit_id, parent_dir, obj_name } = trashItem;
    if (is_dir) {
      setCurrentTrashItem(trashItem);
      eventBus.dispatch(EVENT_BUS_TYPE.UPDATE_TRASH_PATH, trashItem);
    } else {
      const url = `${siteRoot}repo/${repoID}/trash/files/?obj_id=${obj_id}&commit_id=${commit_id}&base=${encodeURIComponent(parent_dir)}&p=${encodeURIComponent('/' + obj_name)}`;
      window.open(url, '_blank');
    }
  }, [repoID]);

  const onDirPathChanged = useCallback((path) => {
    if (path === '/') {
      reloadTrashList();
      return;
    }

    const searchValue = path.split('/')[1];
    repoTrashAPI.searchRepoFolderTrash(repoID, 1, PER_PAGE, searchValue, {}).then(res => {
      const { items } = res.data;
      const item = items[0];
      const trashItem = generateTrashItem(item, path);
      setCurrentTrashItem(trashItem);
      setIsFirstLoading(false);
      setHasMore(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  useEffect(() => {
    const eventBus = EventBus.getInstance();
    const unsubscribeRestoreTrash = eventBus.subscribe(EVENT_BUS_TYPE.RESTORE_TRASH, restoreTrashes);
    const unsubscribeTrashSearch = eventBus.subscribe(EVENT_BUS_TYPE.TRASH_SEARCH, onTrashSearchValueChange);
    const unsubscribeTrashFilter = eventBus.subscribe(EVENT_BUS_TYPE.TRASH_FILTER, onTrashFiltersValueChange);
    const unsubscribeRefreshTrash = eventBus.subscribe(EVENT_BUS_TYPE.REFRESH_TRASH, refreshTrash);
    const unsubscribeTrashItemClick = eventBus.subscribe(EVENT_BUS_TYPE.ON_TRASH_ITEM_CLICK, onTrashItemClick);
    const unsubscribeDirPathChanged = eventBus.subscribe(EVENT_BUS_TYPE.UPDATE_TRASH_PATH_BY_DIR_PATH, onDirPathChanged);

    return () => {
      unsubscribeRestoreTrash();
      unsubscribeTrashSearch();
      unsubscribeTrashFilter();
      unsubscribeRefreshTrash();
      unsubscribeTrashItemClick();
      unsubscribeDirPathChanged();
    };
  }, [onDirPathChanged, onTrashFiltersValueChange, onTrashItemClick, onTrashSearchValueChange, refreshTrash, restoreTrashes]);

  useEffect(() => {
    const currentPath = getTrashPath();
    if (currentPath === '/') { // repo
      repoTrashAPI.getRepoFolderTrash(repoID, currentPage, PER_PAGE).then(res => {
        const { items, total_count, can_search } = res.data;
        setTrashList(items);
        if (total_count > currentPage * PER_PAGE) {
          setHasMore(true);
          setCurrentPage(2);
        }
        setIsFirstLoading(false);

        const eventBus = EventBus.getInstance();
        eventBus.dispatch(EVENT_BUS_TYPE.TRASH_SEARCH_STATE_CHANGED, can_search);
      });
    } else { // sub folder
      const searchValue = currentPath.split('/')[1];
      repoTrashAPI.searchRepoFolderTrash(repoID, 1, PER_PAGE, searchValue, trashFilters).then(res => {
        const { items } = res.data;
        const item = items[0];
        const trashItem = generateTrashItem(item, currentPath);
        setCurrentTrashItem(trashItem);
        setIsFirstLoading(false);
        setHasMore(false);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // search module
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

      const eventBus = EventBus.getInstance();
      eventBus.dispatch(EVENT_BUS_TYPE.TRASH_SEARCH_STATE_CHANGED, can_search);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trashSearchValue, trashFilters]);

  useEffect(() => {
    if (!trashItem) return;
    const { commit_id, parent_dir, obj_name } = trashItem;
    const path = Utils.joinPath(parent_dir, obj_name);
    seafileAPI.listCommitDir(repoID, commit_id, path).then(res => {
      const { dirent_list } = res.data;
      const trashList = dirent_list.map(item => {
        item.is_folder_trash = item.type === 'dir';
        item.obj_name = item.name;
        item.commit_id = commit_id;
        item.is_dir = item.type === 'dir';
        return item;
      });
      setTrashList(trashList);
      setHasMore(false);
      setCanSelected(false);
      setCurrentPage(1);

      const eventBus = EventBus.getInstance();
      eventBus.dispatch(EVENT_BUS_TYPE.TRASH_SEARCH_STATE_CHANGED, false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trashItem]);


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
    <div className={classNames('dir-trash-view sf-trash-wrapper', { 'read-only': !canSelected })}>
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
