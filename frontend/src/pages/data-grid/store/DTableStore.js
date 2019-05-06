import Operation from './Operation';
import OperationTypes from './OperationTypes';
// todo Immutable
// Implement the current version with an array
export default class DTableStore {

  constructor(value) {
    this.operations = [];
    this.columns = value.columns || [];
    this.rows = value.rows || [];
  }

  updateStoreValues({ columns, rows }) {
    this.columns = columns;
    this.rows = rows;
  }

  createOperation(op) {
    return new Operation(op);
  }

  deleteRow(rowIdx) {
    let type = OperationTypes.DELETE_ROW;
    let operation = this.createOperation({type, rowIdx});
    let next = operation.apply(this.rows);

    this.operations.push(operation);
    this.rows = next;

    return next;
  }

  insertRow(newRowIdx) {
    let type = OperationTypes.INSERT_ROW;
    let operation = this.createOperation({type, newRowIdx});
    let next = operation.apply(this.rows);

    this.operations.push(operation);
    this.rows = next;

    return next;
  }

  deleteColumn(idx) {
    let type = OperationTypes.DELETE_COLUMN;
    let operation = this.createOperation({type, idx});
    let next = operation.apply(this.columns);

    this.operations.push(operation);
    this.columns = next;

    return next;
  }

  insertColumn(idx, columnName, columnType) {
    let type = OperationTypes.INSERT_COLUMN;
    let operation = this.createOperation({type, idx, columnName, columnType});
    let next = operation.apply(this.columns);

    this.operations.push(operation);
    this.columns = next;

    return next;
  }

  modifyColumn(idx, oldColumnName, newColumnName) {
    let type = OperationTypes.MODIFY_COLUMN;
    let operation = this.createOperation({type, idx, oldColumnName, newColumnName});
    let next = operation.apply(this.columns);

    this.operations.push(operation);
    this.columns = next;

    return next;
  }

  modifyCell(idx, rowIdx, oldCellValue, newCellValue) {
    let type = OperationTypes.MODIFY_CELL;
    let key = this.columns[idx].key;
    let operation = this.createOperation({type, rowIdx, key, oldCellValue, newCellValue});
    let next = operation.apply(this.rows);

    this.operations.push(operation);
    this.rows = next;

    return next;
  }

}
