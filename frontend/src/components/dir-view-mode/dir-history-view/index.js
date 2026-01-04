import React from 'react';
import PropTypes from 'prop-types';
import { seafileAPI } from '../../../utils/seafile-api';
import Loading from '../../loading';
import SFTable from '../../sf-table';
import { transformCommitsToTableData } from './utils/data-transformer';
import { createHistoryColumns } from './columns';
import CommitDetails from '../../dialog/commit-details';
import UpdateRepoCommitLabels from '../../dialog/edit-repo-commit-labels';
import { enableRepoSnapshotLabel } from '../../../utils/constants';
import { eventBus } from '../../common/event-bus';
import { EVENT_BUS_TYPE } from '../../common/event-bus-type';

import './index.css';

// Show tag column if feature is enabled (default to true for backwards compatibility)
const showLabel = enableRepoSnapshotLabel !== false;

const propTypes = {
  repoID: PropTypes.string.isRequired,
  userPerm: PropTypes.string.isRequired,
  currentRepoInfo: PropTypes.object.isRequired,
};

class DirHistoryView extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      allCommits: [],
      filteredCommits: [], // For search results
      currentPage: 1,
      hasNextPage: false,
      isLoadingMore: false,
      searchQuery: '',
      sortBy: 'time',
      sortOrder: 'desc',
      filters: {
        date: {
          value: '',
          from: null,
          to: null,
        },
        creators: [],
        tags: [],
      },
      // Dialog states
      showCommitDetails: false,
      selectedCommit: null,
      showEditLabels: false,
      editingCommit: null,
      // Column widths for resize
      columnWidths: {},
    };
    this.PAGE_SIZE = 100;
  }

  componentDidMount() {
    this.loadNextPage();
    // Subscribe to EventBus events from DirTool
    this.unsubscribeSearch = eventBus.subscribe(EVENT_BUS_TYPE.HISTORY_SEARCH, this.handleSearch);
    this.unsubscribeSort = eventBus.subscribe(EVENT_BUS_TYPE.HISTORY_SORT, this.handleSortChangeFromEvent);
    this.unsubscribeFilter = eventBus.subscribe(EVENT_BUS_TYPE.HISTORY_FILTER, this.handleFilter);
  }

  componentDidUpdate(prevProps, prevState) {
    // Initialize filteredCommits when allCommits first loads
    if (prevState.allCommits.length === 0 && this.state.allCommits.length > 0 && this.state.filteredCommits.length === 0) {
      const defaultFilters = {
        date: {
          value: '',
          from: null,
          to: null,
        },
        creators: [],
        tags: [],
      };
      this.setState({
        filteredCommits: this.filterAndSortCommits(this.state.allCommits, '', 'time', 'desc', defaultFilters),
      });
    }
  }

  componentWillUnmount() {
    // Unsubscribe from EventBus
    if (this.unsubscribeSearch) this.unsubscribeSearch();
    if (this.unsubscribeSort) this.unsubscribeSort();
    if (this.unsubscribeFilter) this.unsubscribeFilter();
  }

  loadNextPage = () => {
    if (this.state.isLoadingMore) return;

    const { repoID } = this.props;
    const { currentPage, allCommits } = this.state;

    this.setState({ isLoadingMore: true });

    seafileAPI.getRepoHistory(repoID, currentPage, this.PAGE_SIZE)
      .then(res => {
        const newCommits = res.data.data || [];
        const updatedCommits = [...allCommits, ...newCommits];

        // Log ALL fields of the first commit to see what's available
        if (newCommits.length > 0) {
          console.log('[DEBUG] First commit ALL fields:', Object.keys(newCommits[0]).map(key => ({ [key]: newCommits[0][key] })));
        }

        this.setState({
          isLoading: false,
          allCommits: updatedCommits,
          filteredCommits: this.filterAndSortCommits(updatedCommits, this.state.searchQuery, this.state.sortBy, this.state.sortOrder, this.state.filters),
          currentPage: currentPage + 1,
          hasNextPage: res.data.more || false,
          isLoadingMore: false,
        }, () => {
          // Notify toolbar that commits have been updated
          eventBus.dispatch(EVENT_BUS_TYPE.HISTORY_COMMITS_UPDATED, updatedCommits);
        });
      })
      .catch(error => {
        // eslint-disable-next-line no-console
        console.error('Failed to load history:', error);
        this.setState({ isLoading: false, isLoadingMore: false });
      });
  };

  filterAndSortCommits = (commits, searchQuery, sortBy, sortOrder, filters = {}) => {
    let filtered = commits;

    console.log('[DEBUG] filterAndSortCommits - searchQuery:', searchQuery, 'commits count:', commits.length);

    // Apply search filter - only if searchQuery has actual content (not empty)
    if (searchQuery && searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase().trim();
      console.log('[DEBUG] Applying search filter with query:', lowerQuery);
      filtered = commits.filter(commit => {
        // Return true if commit has any matching text in searchable fields
        const matches = (
          (commit.description && commit.description.toLowerCase().includes(lowerQuery)) ||
          (commit.name && commit.name.toLowerCase().includes(lowerQuery)) ||
          (commit.device_name && commit.device_name.toLowerCase().includes(lowerQuery)) ||
          (commit.tags && commit.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
        );
        if (matches) {
          console.log('[DEBUG] Match found in commit:', commit.commit_id, {
            description: commit.description,
            name: commit.name,
            device_name: commit.device_name,
            tags: commit.tags
          });
        }
        return matches;
      });
      console.log('[DEBUG] After search filter - filtered count:', filtered.length);
    } else {
      console.log('[DEBUG] No search query - showing all commits');
    }

    // Apply date filter
    if (filters.date && filters.date.from && filters.date.to) {
      console.log('[DEBUG] Applying date filter');
      filtered = filtered.filter(commit => {
        const commitTime = new Date(commit.time).getTime();
        const fromTime = typeof filters.date.from === 'number' ? filters.date.from * 1000 : new Date(filters.date.from).getTime();
        const toTime = typeof filters.date.to === 'number' ? filters.date.to * 1000 : new Date(filters.date.to).getTime();
        return commitTime >= fromTime && commitTime <= toTime;
      });
      console.log('[DEBUG] After date filter - filtered count:', filtered.length);
    }

    // Apply tags filter - filter commits that have any of the selected tags
    if (filters.tags && filters.tags.length > 0) {
      console.log('[DEBUG] Applying tags filter:', filters.tags);
      filtered = filtered.filter(commit => {
        const commitTags = commit.commit_labels || [];
        return filters.tags.some(tagId => commitTags.includes(tagId));
      });
      console.log('[DEBUG] After tags filter - filtered count:', filtered.length);
    }

    // Apply creators filter
    if (filters.creators && filters.creators.length > 0) {
      console.log('[DEBUG] Applying creators filter:', filters.creators);
      filtered = filtered.filter(commit => {
        const creatorEmail = commit.email || '';
        return filters.creators.some(creator => creator.email === creatorEmail);
      });
      console.log('[DEBUG] After creators filter - filtered count:', filtered.length);
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'time') {
        const timeA = new Date(a.time).getTime();
        const timeB = new Date(b.time).getTime();
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      } else if (sortBy === 'creator') {
        const nameA = (a.name || a.email || '').toLowerCase();
        const nameB = (b.name || b.email || '').toLowerCase();
        return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      }
      return 0;
    });

    console.log('[DEBUG] Final sorted count:', sorted.length);
    return sorted;
  };

  handleSearch = (searchQuery) => {
    console.log('[DEBUG] Search query:', searchQuery);
    this.setState(prevState => {
      // Always update filteredCommits - even if search is empty
      const filteredCommits = this.filterAndSortCommits(prevState.allCommits, searchQuery, prevState.sortBy, prevState.sortOrder, prevState.filters);
      console.log('[DEBUG] All commits count:', prevState.allCommits.length);
      console.log('[DEBUG] Filtered commits count:', filteredCommits.length);
      console.log('[DEBUG] First 3 filtered commits:', filteredCommits.slice(0, 3).map(c => ({ id: c.commit_id, desc: c.desc })));
      return {
        searchQuery,
        filteredCommits,
      };
    });
  };

  handleSortChange = (sortBy, sortOrder) => {
    this.setState(prevState => ({
      sortBy,
      sortOrder,
      filteredCommits: this.filterAndSortCommits(prevState.allCommits, prevState.searchQuery, sortBy, sortOrder, prevState.filters),
    }));
  };

  handleSortChangeFromEvent = ({ sortBy, sortOrder }) => {
    this.handleSortChange(sortBy, sortOrder);
  };

  handleFilter = (filters) => {
    this.setState(prevState => ({
      filters,
      filteredCommits: this.filterAndSortCommits(prevState.allCommits, prevState.searchQuery, prevState.sortBy, prevState.sortOrder, filters),
    }));
  };

  handleShowCommitDetails = (commit) => {
    this.setState({
      showCommitDetails: true,
      selectedCommit: commit,
    });
  };

  handleCloseCommitDetails = () => {
    this.setState({
      showCommitDetails: false,
      selectedCommit: null,
    });
  };

  handleEditLabels = (commit) => {
    this.setState({
      showEditLabels: true,
      editingCommit: commit,
    });
  };

  handleCloseEditLabels = () => {
    this.setState({
      showEditLabels: false,
      editingCommit: null,
    });
  };

  handleLabelsUpdated = (commitId, labels) => {
    // Update the commit in allCommits and re-apply filters
    this.setState(prevState => {
      const updatedCommits = prevState.allCommits.map(commit =>
        commit.commit_id === commitId
          ? { ...commit, commit_labels: labels }
          : commit
      );
      return {
        allCommits: updatedCommits,
        filteredCommits: this.filterAndSortCommits(updatedCommits, prevState.searchQuery, prevState.sortBy, prevState.sortOrder, prevState.filters),
      };
    });
  };

  handleColumnWidthChange = (column, newWidth) => {
    this.setState(prevState => ({
      columnWidths: {
        ...prevState.columnWidths,
        [column.key]: newWidth,
      },
    }));
  };

  render() {
    const { repoID, userPerm } = this.props;
    const {
      isLoading,
      filteredCommits,
      hasNextPage,
      isLoadingMore,
      showCommitDetails,
      selectedCommit,
      showEditLabels,
      editingCommit,
      columnWidths,
    } = this.state;

    if (isLoading) {
      return <Loading />;
    }

    // Use filtered commits for display
    console.log('[DEBUG] render - filteredCommits length:', filteredCommits.length);
    console.log('[DEBUG] render - allCommits length:', this.state.allCommits.length);
    console.log('[DEBUG] render - searchQuery:', this.state.searchQuery);

    // The logic should be:
    // - If searching (has searchQuery OR has active filters), always use filteredCommits (even if empty = no matches)
    // - If no searchQuery and no filters and filteredCommits is empty (initial state), use allCommits
    // - Otherwise use filteredCommits
    const hasActiveFilters = (
      (this.state.filters.date && this.state.filters.date.from && this.state.filters.date.to) ||
      (this.state.filters.tags && this.state.filters.tags.length > 0) ||
      (this.state.filters.creators && this.state.filters.creators.length > 0)
    );

    let displayCommits;
    if (this.state.searchQuery || hasActiveFilters) {
      // User is searching or filtering - always use filteredCommits (empty means no matches found)
      displayCommits = filteredCommits;
      console.log('[DEBUG] render - using filteredCommits (search/filter mode)');
    } else if (filteredCommits.length === 0 && this.state.allCommits.length > 0) {
      // No search/query, no filters, filteredCommits is empty - this is initial state, use allCommits
      displayCommits = this.state.allCommits;
      console.log('[DEBUG] render - using allCommits (initial state)');
    } else {
      // Default to filteredCommits
      displayCommits = filteredCommits;
      console.log('[DEBUG] render - using filteredCommits (default)');
    }

    console.log('[DEBUG] render - displayCommits length:', displayCommits.length);

    // Transform commits data to SFTable format
    const tableData = transformCommitsToTableData(displayCommits);

    // Create columns with callbacks
    let columns = createHistoryColumns({
      repoID,
      userPerm,
      showLabel,
      onShowCommitDetails: this.handleShowCommitDetails,
      onEditLabels: this.handleEditLabels,
    });

    // Apply saved column widths and recalculate left positions
    let left = 0;
    columns = columns.map((column, idx) => {
      const width = columnWidths[column.key] || column.width;
      const updatedColumn = {
        ...column,
        width,
        left,
        idx,
      };
      left += width;
      return updatedColumn;
    });

    return (
      <div className="dir-history-view">
        <SFTable
          table={tableData}
          visibleColumns={columns}
          recordsIds={tableData.row_ids}
          headerSettings={{}}
          noRecordsTipsText=""
          groupbys={[]}
          groups={[]}
          recordsTree={[]}
          showSequenceColumn={false}
          showGridFooter={true}
          hasMoreRecords={hasNextPage}
          isLoadingMoreRecords={isLoadingMore}
          loadMore={this.loadNextPage}
          modifyColumnWidth={this.handleColumnWidthChange}
          canModifyRecords={false}
          supportCopy={false}
          supportPaste={false}
          supportDragFill={false}
          supportCut={false}
          isGroupView={false}
          showRecordAsTree={false}
        />

        {showCommitDetails && selectedCommit && (
          <CommitDetails
            repoID={repoID}
            commitID={selectedCommit.commit_id}
            commitTime={selectedCommit.ctime}
            toggleDialog={this.handleCloseCommitDetails}
          />
        )}

        {showEditLabels && editingCommit && (
          <UpdateRepoCommitLabels
            repoID={repoID}
            commitID={editingCommit.commit_id}
            commitLabels={editingCommit.commit_labels || []}
            toggleDialog={this.handleCloseEditLabels}
            onLabelsUpdated={(labels) => this.handleLabelsUpdated(editingCommit.commit_id, labels)}
          />
        )}
      </div>
    );
  }
}

DirHistoryView.propTypes = propTypes;

export default DirHistoryView;

