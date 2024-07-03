import {
  SORT_TYPE,
  isValidSort,
} from '../../../_basic';

export const SORT_OPERATION = {
  ADD_SORT: 'add_sort',
  DELETE_SORT: 'delete_sort',
  MODIFY_SORT_COLUMN: 'modify_sort_column',
  MODIFY_SORT_TYPE: 'modify_sort_type',
};

export const getDisplaySorts = (sorts, columns) => {
  if (!Array.isArray(sorts) || !Array.isArray(columns)) {
    return [];
  }
  return sorts.filter((sort) => !sort.column_key || isValidSort(sort, columns));
};

export const isSortsEmpty = (sorts) => {
  return !sorts || sorts.length === 0;
};

export const execSortsOperation = (action, payload) => {
  const { sorts: updatedSorts } = payload;
  switch (action) {
    case SORT_OPERATION.ADD_SORT: {
      const newSort = {
        column_key: null,
        sort_type: SORT_TYPE.UP,
      };
      updatedSorts.push(newSort);
      return updatedSorts;
    }
    case SORT_OPERATION.DELETE_SORT: {
      const { index } = payload;
      updatedSorts.splice(index, 1);
      return updatedSorts;
    }
    case SORT_OPERATION.MODIFY_SORT_COLUMN: {
      const { index, column_key } = payload;
      const newSort = {
        column_key: column_key,
        sort_type: SORT_TYPE.UP,
      };
      updatedSorts[index] = newSort;
      return updatedSorts;
    }
    case SORT_OPERATION.MODIFY_SORT_TYPE: {
      const { index, sort_type } = payload;
      const updatedSort = updatedSorts[index];
      const newSort = {
        column_key: updatedSort.column_key,
        sort_type: sort_type,
      };
      updatedSorts[index] = newSort;
      return updatedSorts;
    }
    default: {
      return updatedSorts;
    }
  }
};
