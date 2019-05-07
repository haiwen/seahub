import Operation from './operation';
import OperationTypes from './operation-types';
import editorFactory from '../utils/editor-factory';
// todo Immutable
// Implement the current version with an array

export default class DTableStore {

  constructor() {
    this.value = {};
    this.value.columns = [];
    this.value.rows = [];
    this.operations = [];
  }

  serializeGridData() {

    let value = this.value;
    let columns = value.columns.map(column => {
      delete column.editor; // delete editor attr;
      return column;
    });

    value.columns = columns;

    return JSON.stringify(value);
  }

  deseralizeGridData(gridData) {

    gridData = JSON.parse(gridData);
    let columns = gridData.columns;
    let rows = gridData.rows;

    columns = columns.map(column => {
      if (column.type) {
        let editor = editorFactory.createEditor(column.type);
        column.editor = editor;
      }
      return column;
    });

    this.value.columns = columns;
    this.value.rows = rows;

    return this.value;
  }

  createOperation(op) {
    return new Operation(op);
  }

  deleteRow(rowIdx) {
    let type = OperationTypes.DELETE_ROW;
    let operation = this.createOperation({type, rowIdx});
    let next = operation.apply(this.value.rows);

    this.operations.push(operation);
    this.value.rows = next;

    return this.value;
  }

  insertRow(newRowIdx) {
    let type = OperationTypes.INSERT_ROW;
    let operation = this.createOperation({type, newRowIdx});
    let next = operation.apply(this.value.rows);

    this.operations.push(operation);
    this.value.rows = next;

    return this.value;
  }

  deleteColumn(idx) {
    let type = OperationTypes.DELETE_COLUMN;
    let operation = this.createOperation({type, idx});
    let next = operation.apply(this.value.columns);

    this.operations.push(operation);
    this.value.columns = next;

    return this.value;
  }

  insertColumn(idx, columnName, columnType) {
    let type = OperationTypes.INSERT_COLUMN;
    let operation = this.createOperation({type, idx, columnName, columnType});
    let next = operation.apply(this.value.columns);

    this.operations.push(operation);
    this.value.columns = next;

    let value = this.serializeGridData();
    this.deseralizeGridData(value);

    return this.value;
  }

  modifyColumn(idx, oldColumnName, newColumnName) {
    let type = OperationTypes.MODIFY_COLUMN;
    let operation = this.createOperation({type, idx, oldColumnName, newColumnName});
    let next = operation.apply(this.value.columns);

    this.operations.push(operation);
    this.value.columns = next;

    return this.value;
  }

  modifyCell(rowIdx, key, newValue) {
    let type = OperationTypes.MODIFY_CELL;
    let operation = this.createOperation({type, rowIdx, key, newValue});
    let next = operation.apply(this.value.rows);

    this.operations.push(operation);
    this.value.rows = next;

    return this.value;
  }

  resizeColumn(idx, width) {
    let type = OperationTypes.RESIZE_COLUMN;
    let operation = this.createOperation({type, idx, width});
    let next = operation.apply(this.value.columns);

    this.operations.push(operation);
    this.value.columns = next;

    return this.value;
  }

}
