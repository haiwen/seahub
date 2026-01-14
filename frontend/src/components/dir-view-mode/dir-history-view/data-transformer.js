/**
 * Data transformation utilities for repository history table
 * Converts API response format to SFTable expected format
 */

/**
 * Transform commits array from API to SFTable data structure
 * @param {Array} commits - Array of commit objects from API
 * @param {string} repoID - Repository ID
 * @returns {Object} SFTable compatible data structure
 */
export function transformCommitsToTableData(commits, repoID) {
  if (!commits || !Array.isArray(commits)) {
    return {
      _id: `repo_history_${repoID}`,
      rows: [],
      row_ids: [],
      id_row_map: {},
      columns: [],
    };
  }

  const id_row_map = {};
  const rows = commits.map((commit) => {
    const row = {
      ...commit,
      _id: commit.commit_id,
    };
    id_row_map[row._id] = row;
    return row;
  });

  return {
    _id: `repo_history_${repoID}`,
    rows,
    row_ids: rows.map(r => r._id),
    id_row_map,
    columns: [],
  };
}

