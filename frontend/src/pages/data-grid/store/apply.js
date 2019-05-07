import OperationTypes from './operation-types';
import GridColumn from '../model/grid-column';
import GridRow from '../model/grid-row';

function apply(value, op) {

  let { type } = op;
  let next = value.slice(0);  // clone a copy

  switch(type) {
    case OperationTypes.DELETE_ROW : {
      let { rowIdx } = op;
      next.splice(rowIdx, 1);
      return next;
    }

    case OperationTypes.INSERT_ROW : {
      let { newRowIdx } = op;
      let row = new GridRow({newRowIdx});
      next.push(row);
      return next;
    }

    case OperationTypes.DELETE_COLUMN : {
      let { idx } = op;
      next.splice(idx, 1);
      return next;
    }

    case OperationTypes.INSERT_COLUMN : {
      let { idx, columnName, columnType } = op;
      let column = new GridColumn({idx, columnName, columnType});
      next.push(column);
      return next;
    }

    case OperationTypes.MODIFY_CELL : {
      let { rowIdx, key, newValue } = op;
      next[rowIdx][key] = newValue;
      return next;
    }

    case OperationTypes.MODIFY_COLUMN : {
      let { idx, newColumnName } = op;
      next[idx]['key'] = newColumnName;
      next[idx]['name'] = newColumnName;
      return next;
    }

    case OperationTypes.RESIZE_COLUMN : {
      let { idx, width } = op;
      next[idx].width = width;

      return next;
    }
  }
}

export default apply;
