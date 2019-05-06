import OperationTypes from './OperationTypes';
import GridColumn from '../model/GridColumn';
import GridRow from '../model/GridRow';

function apply(value, op) {

  let { type } = op;
  value = value.slice(0);  // clone a copy

  switch(type) {
    case OperationTypes.DELETE_ROW : {
      let { rowIdx } = op;
      let next = value.splice(rowIdx, 1);
      return next;
    }

    case OperationTypes.INSERT_ROW : {
      let { newRowIdx } = op;
      let row = new GridRow({newRowIdx});
      let next = value.push(row);
      return next;
    }

    case OperationTypes.DELETE_COLUMN : {
      let { idx } = op;
      let next = value.splice(idx, 1);
      return next;
    }

    case OperationTypes.INSERT_COLUMN : {
      let { idx, columnName, columnType } = op;
      let column = new GridColumn({idx, columnName, columnType});
      let next = value.push(column);
      return next;
    }

    case OperationTypes.MODIFY_CELL : {
      let { rowIdx, key, newCellValue } = op;
      let next = value;
      next[rowIdx][key] = newCellValue;
      return next;
    }

    case OperationTypes.MODIFY_COLUMN : {
      let { idx, newColumnName } = op;
      let next = value;
      next[idx]['key'] = newColumnName;
      next[idx]['name'] = newColumnName;
      return next;
    }
  }
}

export default apply;
