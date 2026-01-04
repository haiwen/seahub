/**
 * Data transformation utilities for repository history table
 * Converts API response format to SFTable expected format
 */

/**
 * Transform commits array from API to SFTable data structure
 * @param {Array} commits - Array of commit objects from API
 * @param {string} repoID - Repository ID
 * @param {number} currentPage - Current page number for determining first commit
 * @returns {Object} SFTable compatible data structure
 */
export function transformCommitsToTableData(commits, repoID, currentPage = 1) {
  if (!commits || !Array.isArray(commits)) {
    return {
      _id: `repo_history_${repoID}`,
      rows: [],
      row_ids: [],
      id_row_map: {},
      columns: [], // Will be set by column factory
    };
  }

  // Transform commits with additional computed fields
  const rows = commits.map((commit, index) => {
    const globalIndex = (currentPage - 1) * 100 + index; // Assuming 100 per page

    return {
      ...commit,
      _id: commit.commit_id, // SFTable requires _id field
      // tags field already exists in API response
      // Computed fields
      isFirstCommit: globalIndex === 0,
      showDetails: true, // All commits can show details except possibly the last one
    };
  });

  // Create SFTable compatible structure
  return {
    _id: `repo_history_${repoID}`,
    rows: rows,
    row_ids: rows.map(r => r._id),
    id_row_map: rows.reduce((map, row) => {
      map[row._id] = row;
      return map;
    }, {}),
    columns: [], // Will be set by createHistoryColumns()
  };
}

/**
 * Update existing table data with new commits (for progressive loading)
 * @param {Object} existingTableData - Current table data
 * @param {Array} newCommits - New commits to append
 * @param {string} repoID - Repository ID
 * @param {number} currentPage - Current page number
 * @returns {Object} Updated SFTable data structure
 */
export function appendCommitsToTableData(existingTableData, newCommits, repoID, currentPage) {
  if (!newCommits || newCommits.length === 0) {
    return existingTableData;
  }

  const existingRows = existingTableData.rows || [];
  const startIndex = existingRows.length;

  // Transform new commits
  const newRows = newCommits.map((commit, index) => ({
    ...commit,
    _id: commit.commit_id,
    // tags field already exists in API response
    isFirstCommit: startIndex === 0 && index === 0,
    showDetails: true,
  }));

  // Merge with existing data
  const allRows = [...existingRows, ...newRows];

  return {
    _id: `repo_history_${repoID}`,
    rows: allRows,
    row_ids: allRows.map(r => r._id),
    id_row_map: allRows.reduce((map, row) => {
      map[row._id] = row;
      return map;
    }, {}),
    columns: existingTableData.columns || [],
  };
}

