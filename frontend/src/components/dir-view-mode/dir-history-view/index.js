import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { seafileAPI } from '../../../utils/seafile-api';
import { siteRoot, gettext, enableRepoSnapshotLabel } from '../../../utils/constants';
import Loading from '../../loading';
import SFTable from '../../sf-table';
import { transformCommitsToTableData } from './data-transformer';
import { createHistoryColumns } from './columns';
import CommitDetails from '../../dialog/commit-details';
import UpdateRepoCommitLabels from '../../dialog/edit-repo-commit-labels';
import { eventBus } from '../../common/event-bus';
import { EVENT_BUS_TYPE } from '../../common/event-bus-type';

import './index.css';

const PAGE_SIZE = 1000;
const PERMISSION_READ_WRITE = 'rw';
const COLUMN_KEY_TAGS = 'tags';

const showTags = enableRepoSnapshotLabel !== false;

const DirHistoryView = ({ repoID, userPerm }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [allCommits, setAllCommits] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    date: { value: '', from: null, to: null },
    creators: [],
    tags: [],
  });
  const [showCommitDetails, setShowCommitDetails] = useState(false);
  const [selectedCommit, setSelectedCommit] = useState(null);
  const [showEditTags, setShowEditTags] = useState(false);
  const [editingCommit, setEditingCommit] = useState(null);
  const [columnWidths, setColumnWidths] = useState({});

  const initialLoadRef = useRef(false);

  const filteredCommits = useMemo(() => {
    let filtered = allCommits;

    if (searchQuery && searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(commit => commit.description && commit.description.toLowerCase().includes(lowerQuery));
    }

    if (filters.date && filters.date.from && filters.date.to) {
      filtered = filtered.filter(commit => {
        const commitTime = new Date(commit.time).getTime();
        const fromTime = filters.date.from * 1000;
        const toTime = filters.date.to * 1000;
        return commitTime >= fromTime && commitTime <= toTime;
      });
    }

    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(commit => {
        const commitTags = commit.tags || [];
        return filters.tags.some(tagId => commitTags.includes(tagId));
      });
    }

    if (filters.creators && filters.creators.length > 0) {
      filtered = filtered.filter(commit => {
        const creatorEmail = commit.email || '';
        return filters.creators.some(creator => creator.email === creatorEmail);
      });
    }

    return filtered;
  }, [allCommits, searchQuery, filters]);

  const loadNextPage = useCallback(() => {
    if (isLoadingMore) return;

    setIsLoadingMore(true);

    seafileAPI.getRepoHistory(repoID, currentPage, PAGE_SIZE)
      .then(res => {
        const newCommits = res.data.data || [];
        const updatedCommits = [...allCommits, ...newCommits];

        setIsLoading(false);
        setAllCommits(updatedCommits);
        setCurrentPage(prev => prev + 1);
        setHasNextPage(res.data.more || false);
        setIsLoadingMore(false);

        eventBus.dispatch(EVENT_BUS_TYPE.HISTORY_COMMITS_UPDATED, updatedCommits);
      })
      .catch(() => {
        setIsLoading(false);
        setIsLoadingMore(false);
      });
  }, [repoID, currentPage, isLoadingMore, allCommits]);

  useEffect(() => {
    const unsubscribeSearch = eventBus.subscribe(EVENT_BUS_TYPE.HISTORY_SEARCH, (searchQuery) => {
      setSearchQuery(searchQuery);
    });

    const unsubscribeFilter = eventBus.subscribe(EVENT_BUS_TYPE.HISTORY_FILTER, (filters) => {
      setFilters(filters);
    });

    return () => {
      if (unsubscribeSearch) unsubscribeSearch();
      if (unsubscribeFilter) unsubscribeFilter();
    };
  }, []);

  useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;

    setIsLoadingMore(true);

    seafileAPI.getRepoHistory(repoID, 1, PAGE_SIZE)
      .then(res => {
        const newCommits = res.data.data || [];

        setIsLoading(false);
        setAllCommits(newCommits);
        setCurrentPage(2);
        setHasNextPage(res.data.more || false);
        setIsLoadingMore(false);

        eventBus.dispatch(EVENT_BUS_TYPE.HISTORY_COMMITS_UPDATED, newCommits);
      })
      .catch(() => {
        setIsLoading(false);
        setIsLoadingMore(false);
      });
  }, [repoID]);

  const handleShowCommitDetails = useCallback((commit) => {
    setShowCommitDetails(true);
    setSelectedCommit(commit);
  }, []);

  const handleEditTags = useCallback((commit) => {
    setShowEditTags(true);
    setEditingCommit(commit);
  }, []);

  const handleCloseCommitDetails = useCallback(() => {
    setShowCommitDetails(false);
    setSelectedCommit(null);
  }, []);

  const handleCloseEditTags = useCallback(() => {
    setShowEditTags(false);
    setEditingCommit(null);
  }, []);

  const handleColumnWidthChange = useCallback((column, newWidth) => {
    setColumnWidths(prevState => ({
      ...prevState,
      [column.key]: newWidth,
    }));
  }, []);

  const checkCanModifyRecord = useCallback((_record) => {
    return userPerm === PERMISSION_READ_WRITE;
  }, [userPerm]);

  const handleTagsUpdated = useCallback((commitId, tags) => {
    setAllCommits(prevAllCommits => {
      return prevAllCommits.map(commit => {
        if (commit.commit_id === commitId) {
          return { ...commit, tags: tags };
        }
        return commit;
      });
    });
  }, []);

  const firstCommitId = useMemo(() => {
    return allCommits.length > 0 ? allCommits[0].commit_id : null;
  }, [allCommits]);

  const createHistoryContextMenuOptions = useCallback((tableProps) => {
    const { selectedPosition, recordIds, recordGetterByIndex, isGroupView } = tableProps;

    let commit = null;
    if (selectedPosition) {
      const recordIndex = selectedPosition.rowIdx !== undefined ? selectedPosition.rowIdx : selectedPosition.recordIndex;
      const groupRecordIndex = selectedPosition.groupRecordIndex;

      if (recordIndex !== undefined && recordIds && recordIndex >= 0 && recordIndex < recordIds.length) {
        if (recordGetterByIndex && typeof recordGetterByIndex === 'function') {
          const params = { isGroupView, groupRecordIndex, recordIndex };
          commit = recordGetterByIndex(params);
        }
      }
    }

    if (!commit) return [];

    const isCurrentVersion = commit && commit.commit_id && firstCommitId && commit.commit_id === firstCommitId;

    if (isCurrentVersion) {
      return [
        <button
          key="history-details"
          className="dropdown-item"
          onClick={(e) => {
            e.stopPropagation();
            handleShowCommitDetails(commit);
          }}
        >
          {gettext('Details')}
        </button>
      ];
    }

    return [
      <button
        key="history-details"
        className="dropdown-item"
        onClick={(e) => {
          e.stopPropagation();
          handleShowCommitDetails(commit);
        }}
      >
        {gettext('Details')}
      </button>,
      <button
        key="history-view-snapshot"
        className="dropdown-item"
        onClick={(e) => {
          e.stopPropagation();
          window.open(`${siteRoot}repo/${repoID}/snapshot/?commit_id=${commit.commit_id}`, '_blank');
        }}
      >
        {gettext('View Snapshot')}
      </button>
    ];
  }, [repoID, handleShowCommitDetails, firstCommitId]);

  const tableData = useMemo(() => {
    return transformCommitsToTableData(filteredCommits, repoID);
  }, [filteredCommits, repoID]);

  const columns = useMemo(() => {
    let cols = createHistoryColumns({
      repoID,
      userPerm,
      showTags,
    });

    let left = 0;
    cols = cols.map((column, idx) => {
      const width = columnWidths[column.key] || column.width;
      const updatedColumn = { ...column, width, left, idx };
      left += width;
      return updatedColumn;
    });

    return cols;
  }, [repoID, userPerm, columnWidths]);

  const getTagsColumnIndex = useCallback(() => {
    return columns.findIndex(col => col.key === COLUMN_KEY_TAGS);
  }, [columns]);

  const handleCellDoubleClick = useCallback(({ rowIdx, idx }) => {
    const tagsColumnIndex = getTagsColumnIndex();
    if (idx === tagsColumnIndex) {
      const commit = filteredCommits[rowIdx];
      if (commit && userPerm === PERMISSION_READ_WRITE) {
        handleEditTags(commit);
      }
    }
  }, [filteredCommits, userPerm, handleEditTags, getTagsColumnIndex]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div className="dir-history-view sf-history-wrapper">
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
        showGridFooter={true}
        hasMoreRecords={hasNextPage}
        isLoadingMoreRecords={isLoadingMore}
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
        createContextMenuOptions={createHistoryContextMenuOptions}
      />

      {showCommitDetails && selectedCommit && (
        <CommitDetails
          repoID={repoID}
          commitID={selectedCommit.commit_id}
          commitTime={selectedCommit.ctime}
          toggleDialog={handleCloseCommitDetails}
        />
      )}

      {showEditTags && editingCommit && (
        <UpdateRepoCommitLabels
          repoID={repoID}
          commitID={editingCommit.commit_id}
          commitLabels={editingCommit.tags || []}
          updateCommitLabels={(tags) => handleTagsUpdated(editingCommit.commit_id, tags)}
          toggleDialog={handleCloseEditTags}
        />
      )}
    </div>
  );
};

DirHistoryView.propTypes = {
  repoID: PropTypes.string.isRequired,
  userPerm: PropTypes.string.isRequired,
};

export default DirHistoryView;
