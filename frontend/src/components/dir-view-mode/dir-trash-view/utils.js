import { v4 } from 'uuid';
import CTimeFormatter from '../../../metadata/components/cell-formatter/ctime';
import NumberFormatter from '../../../metadata/components/cell-formatter/number';
import TextFormatter from '../../../metadata/components/cell-formatter/text';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import FileName from './formatter/file-name';

export function createHistoryColumns({ repoID }) {

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
      formatter: <FileName repoID={repoID} />,
    },
    {
      key: 'parent_dir',
      name: gettext('Original path'),
      display_name: gettext('Original path'),
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


const generateTrashColumns = ({ repoID }) => {
  let cols = createHistoryColumns({ repoID });

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
  const columns = generateTrashColumns({ repoID });

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
    const path = Utils.joinPath(trash.parent_dir, trash.obj_name);
    const row = {
      ...trash,
      _id: path,
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
  if (filters.date && (filters.date.value || (filters.data.to || filters.data.from))) count++;
  if (filters.creators && filters.creators.length > 0) count++;
  if (filters.tags && filters.tags.length > 0) count++;
  if (filters.suffixes) count++;
  return count;
};

export const ensureLeadingSlash = (str) => {
  if (!str) return '/';

  return str.startsWith('/') ? str : '/' + str;
};

export const removeTrailingSlash = (str) => {
  if (!str || str === '/') return '';

  return str.endsWith('/') ? str.slice(0, -1) : str;
};

export const getTrashPath = () => {
  const url = window.location.href;
  const searchParam = new URLSearchParams(url);
  const path = searchParam.get('path');
  if (path && path === '/') return '/';
  let currentPath = ensureLeadingSlash(path);
  if (currentPath !== '/') {
    currentPath = removeTrailingSlash(currentPath);
  }
  return currentPath;
};

export const generateTrashItem = (rootItem, currentPath) => {
  const pathList = currentPath.split('/');
  // eg: '/folder'
  if (pathList.length === 2) return rootItem;

  // eg: subFolder '/folder/.../sub-folder' or ‘/folder/.../sub_folder/’
  const trashName = pathList[pathList.length - 1];
  return {
    id: v4(),
    commit_id: rootItem.commit_id,
    is_dir: true,
    obj_name: trashName,
    deleted_time: rootItem.deleted_time,
    parent_dir: ensureLeadingSlash(pathList.slice(0, -1).join('/'))
  };
};
