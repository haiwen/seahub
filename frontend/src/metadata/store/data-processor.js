import { isTableRows } from '../utils/row';
import { getColumnByKey } from '../utils/column';
import { getFilteredRows } from '../utils/filter';
import { getGroupRows } from '../utils/group';
import { sortTableRows } from '../utils/sort';
import { getRowsByIds } from '../utils/table';
import { isGroupView } from '../utils/view';
import { username } from '../../utils/constants';
import { OPERATION_TYPE } from './operations';
import { CellType } from '../constants';

// const DEFAULT_COMPUTER_PROPERTIES_CONTROLLER = {
//   isUpdateSummaries: true,
//   isUpdateColumnColors: true,
// };

// generate formula_rows
// get rendered rows depend on filters/sorts etc.
class DataProcessor {

  static getFilteredRows(table, rows, filterConjunction, filters) {
    const tableRows = isTableRows(rows) ? rows : getRowsByIds(table, rows);
    const { row_ids } = getFilteredRows(table, tableRows, filterConjunction, filters, { username });
    return row_ids;
  }

  static getSortedRows(table, rows, sorts, { collaborators }) {
    const tableRows = isTableRows(rows) ? rows : getRowsByIds(table, rows);
    return sortTableRows(table, tableRows, sorts, { collaborators });
  }

  static getGroupedRows(table, rows, groupbys, { collaborators }) {
    const tableRows = isTableRows(rows) ? rows : getRowsByIds(table, rows);
    const groups = getGroupRows(table, tableRows, groupbys, { collaborators });
    return groups;
  }

  static updateSummaries(table, rows) {
    // const tableRows = isTableRows(rows) ? rows : getRowsByIds(table, rows);
    // todo
  }

  static hasRelatedFilters = (filters, updatedColumnKeyMap) => {
    return filters.some(filter => updatedColumnKeyMap[filter.column_key]);
  };

  static hasRelatedSort = (sorts, updatedColumnKeyMap) => {
    return sorts.some(sort => updatedColumnKeyMap[sort.column_key]);
  };

  static hasRelatedGroupby(groupbys, updatedColumnKeyMap) {
    return groupbys.some(groupby => updatedColumnKeyMap[groupby.column_key]);
  }

  static deleteGroupRows(groups, idDeletedRecordMap) {
    groups.forEach(group => {
      const { subgroups, row_ids } = group;
      if (Array.isArray(subgroups) && subgroups.length > 0) {
        this.deleteGroupRows(subgroups, idDeletedRecordMap);
      } else if (row_ids) {
        group.row_ids = row_ids.filter(rowId => !idDeletedRecordMap[rowId]);
      }
    });
  }

  static deleteEmptyGroups = (groups) => {
    return groups.filter(group => {
      const { subgroups, row_ids } = group;
      if (subgroups && subgroups.length > 0) {
        const validSubGroups = this.deleteEmptyGroups(subgroups);
        if (validSubGroups.length === 0) {
          return false;
        }
        return true;
      }
      if (!row_ids || row_ids.length === 0) {
        return false;
      }
      return true;
    });
  };

  static run(table, { collaborators }) {
    const rows = table.rows;
    const { groupbys } = table.view;
    const availableColumns = table.view.available_columns || table.columns;
    const _isGroupView = isGroupView({ groupbys }, availableColumns);
    if (!_isGroupView) {
      table.view.rows = table.rows.map(row => row._id);
      return;
    }
    let renderedRows = rows;
    const groups = _isGroupView ? this.getGroupedRows(table, renderedRows, groupbys, { collaborators }) : [];
    const row_ids = isTableRows(renderedRows) ? renderedRows.map(row => row._id) : renderedRows;
    table.view.rows = row_ids;
    table.view.groups = groups;
  }

  static updateDataWithModifyRecords(table, relatedColumnKeyMap, rowIds, { collaborators }) {
    const { available_columns, groupbys, rows } = table.view;
    const _isGroupView = isGroupView({ groupbys }, available_columns);
    const isRegroup = _isGroupView && this.hasRelatedGroupby(groupbys, relatedColumnKeyMap);
    if (isRegroup) {
      table.view.groups = this.getGroupedRows(table, rows, groupbys, { collaborators });
    }
    // todo update sort and filter and ui change
  }

  static handleReloadedRecords(table, reloadedRecords, relatedColumnKeyMap) {
    const idReloadedRecordMap = reloadedRecords.reduce((map, record) => {
      map[record._id] = record;
      return map;
    }, {});
    table.rows.forEach((row, index) => {
      const rowId = row._id;
      const reloadedRecord = idReloadedRecordMap[rowId];
      const newRecord = Object.assign({}, table.rows[index], reloadedRecord);
      if (reloadedRecord) {
        table.rows[index] = newRecord;
        table.id_row_map[rowId] = newRecord;
      }
    });

    this.updateDataWithModifyRecords();
    this.updateSummaries();
  }

  static handleNotExistRecords(table, idRecordNotExistMap) {
    let notExistRecords = [];
    let existRecords = [];
    table.rows.forEach((record) => {
      const recordId = record._id;
      if (idRecordNotExistMap[recordId]) {
        notExistRecords.push(record);
        delete table.id_row_map[recordId];
      } else {
        existRecords.push(record);
      }
    });
    table.rows = table.rows.filter((record) => !idRecordNotExistMap[record._id]);
    table.view.rows = table.rows.filter((recordId) => !idRecordNotExistMap[recordId]);

    this.updateSummaries();
  }

  static syncOperationOnData(table, operation, { collaborators }) {
    switch (operation.op_type) {
      case OPERATION_TYPE.MODIFY_RECORD:
      case OPERATION_TYPE.MODIFY_RECORDS: {
        const { available_columns } = table.view;
        const { id_original_row_updates, row_ids } = operation;
        let relatedColumnKeyMap = {};
        let relatedColumnKeys = [];
        row_ids.forEach(rowId => {
          const id_original_row_update = id_original_row_updates[rowId];
          if (id_original_row_update) {
            relatedColumnKeys.push(...Object.keys(id_original_row_update));
          }
        });
        relatedColumnKeys.forEach(columnKey => {
          if (!relatedColumnKeyMap[columnKey]) {
            const column = getColumnByKey(available_columns, columnKey);
            if (column) {
              relatedColumnKeyMap[columnKey] = true;
            }
          }
        });
        this.updateDataWithModifyRecords(table, relatedColumnKeyMap, row_ids, { collaborators });
        this.updateSummaries();
        break;
      }
      case OPERATION_TYPE.MODIFY_RECORD_VIA_BUTTON: {
        const { available_columns } = table.view;
        const { original_updates } = operation;
        const relatedColumnKeyMap = {};
        for (let columnKey in original_updates) {
          const column = getColumnByKey(available_columns, columnKey);
          if (column) {
            relatedColumnKeyMap[columnKey] = true;
          }
        }
        this.updateDataWithModifyRecords();
        this.updateSummaries();
        break;
      }
      case OPERATION_TYPE.RESTORE_RECORDS: {
        const { rows_data, upper_row_ids } = operation;
        const { rows } = table.view;
        const insertRowIds = rows_data.map(recordData => recordData._id);
        let updatedRowIds = [...rows];
        if (!Array.isArray(upper_row_ids) || upper_row_ids.length === 0) {
          updatedRowIds.push(...insertRowIds);
        } else {
          upper_row_ids.forEach((upperRowId, index) => {
            const insertRowId = insertRowIds[index];
            const upperRowIndex = updatedRowIds.indexOf(upperRowId);
            if (upperRowIndex < 0) {
              updatedRowIds.push(insertRowId);
            } else {
              updatedRowIds.splice(upperRowIndex + 1, 0, insertRowId);
            }
          });
        }
        table.view.rows = updatedRowIds;
        this.updateDataWithModifyRecords(table, { collaborators });
        this.updateSummaries();
        break;
      }
      case OPERATION_TYPE.MODIFY_GROUPBYS: {
        const { available_columns, groupbys, rows } = table.view;
        if (!isGroupView({ groupbys }, available_columns)) {
          table.view.groups = [];
          break;
        }
        table.view.groups = this.getGroupedRows(table, rows, groupbys, { collaborators });
        break;
      }
      case OPERATION_TYPE.MODIFY_COLUMN_DATA: {
        const { column_key, new_data, old_data } = operation;
        const column = getColumnByKey(table.columns, column_key);
        if (column && (column.type === CellType.SINGLE_SELECT || column.type === CellType.MULTIPLE_SELECT)) {
          table.rows.forEach(row => {
            const cellValue = row[column.name];
            if (cellValue !== null && cellValue !== undefined) {
              row[column.name] = this.applyColumnDataToCell(column.type, cellValue, new_data.options, old_data.options);
            }
          });

          table.id_row_map = table.rows.reduce((map, row) => {
            map[row._id] = row;
            return map;
          }, {});
        }
        break;
      }
      default: {
        break;
      }
    }
  }

  static applyColumnDataToCell(columnType, cellValue, newOptions, oldOptions) {
    if (cellValue === null || cellValue === undefined) {
      return cellValue;
    }

    if (columnType === CellType.SINGLE_SELECT) {
      const oldOption = oldOptions.find(option => option.name === cellValue);
      if (oldOption) {
        const newOption = newOptions.find(option => option.id === oldOption.id);
        return newOption ? newOption.name : cellValue;
      }
    } else if (columnType === CellType.MULTIPLE_SELECT) {
      const newValues = cellValue.map(value => {
        const oldOption = oldOptions.find(option => option.name === value);
        if (oldOption) {
          const newOption = newOptions.find(option => option.id === oldOption.id);
          return newOption ? newOption.name : value;
        }
        return value;
      });
      return newValues;
    }

    return cellValue;
  }
}

export default DataProcessor;
