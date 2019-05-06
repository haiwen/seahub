export default class GridColumn {

  constructor(object) {
    this.key = object.columnName || object.name;
    this.name = object.columnName || object.name;
    this.type = object.columnType || null;
    this.editable = object.editable || true;
    this.width = object.width || 200;
    this.resizable = object.resizable || true;
  }

}
