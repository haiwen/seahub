class Column {
  constructor(object) {
    this.key = object.key || '';
    this.data = object.data || null;
    this.name = object.name || [];
    this.type = object.type || [];
    this.width = object.width || [];
    this.editable = object.editable || [];
  }

}

export default Column;
