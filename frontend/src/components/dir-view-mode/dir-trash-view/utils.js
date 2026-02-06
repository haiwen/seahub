import CTimeFormatter from '../../../metadata/components/cell-formatter/ctime';
import NumberFormatter from '../../../metadata/components/cell-formatter/number';
import TextFormatter from '../../../metadata/components/cell-formatter/text';
import { gettext } from '../../../utils/constants';

export function createHistoryColumns() {

  let baseColumns = [
    {
      key: 'obj_name',
      name: gettext('File Name'),
      display_name: gettext('File Name'),
      icon_name: 'text',
      type: 'text',
      width: 350,
      frozen: true,
      editable: false,
      resizable: true,
      is_name_column: true,
      is_private: true,
      formatter: <TextFormatter />,
    },
    {
      key: 'parent_dir',
      name: gettext('Source path'),
      display_name: gettext('Source path'),
      icon_name: 'text',
      type: 'text',
      width: 200,
      editable: false,
      resizable: true,
      is_private: true,
      formatter: <TextFormatter />,
    },
    {
      key: 'deleted_time',
      name: gettext('Deleted time'),
      display_name: gettext('Deleted time'),
      icon_name: 'date',
      type: 'date',
      width: 200,
      editable: false,
      resizable: true,
      is_private: true,
      formatter: <CTimeFormatter />,
    },
    {
      key: 'size',
      name: gettext('Size'),
      display_name: gettext('Size'),
      icon_name: 'number',
      type: 'number',
      width: 200,
      editable: false,
      resizable: true,
      is_private: true,
      formatter: <NumberFormatter />,
    },
  ];

  return baseColumns;
}


const generateTrashColumns = () => {
  let cols = createHistoryColumns();

  let left = 0;
  cols = cols.map((column, idx) => {
    const width = column.width;
    const updatedColumn = { ...column, width, left, idx };
    left += width;
    return updatedColumn;
  });

  return cols;
};

export function transformTrashListToTableData(trashList, repoID) {
  const columns = generateTrashColumns();

  if (!trashList || !Array.isArray(trashList)) {
    return {
      _id: `repo_trash_${repoID}`,
      rows: [],
      row_ids: [],
      id_row_map: {},
      columns: columns,
    };
  }

  const id_row_map = {};
  const rows = trashList.map((trash, index) => {
    const row = {
      ...trash,
      _id: `${trash.commit_id}_${index}`,
    };
    id_row_map[row._id] = row;
    return row;
  });

  return {
    _id: `repo_trash_${repoID}`,
    rows,
    row_ids: rows.map(r => r._id),
    id_row_map,
    columns: columns,
  };
}

export const isFiltersValid = (filters) => {
  let count = 0;
  if (filters.date && filters.date.value) count++;
  if (filters.creators && filters.creators.length > 0) count++;
  if (filters.tags && filters.tags.length > 0) count++;
  if (filters.suffixes) count++;
  return count;
};
