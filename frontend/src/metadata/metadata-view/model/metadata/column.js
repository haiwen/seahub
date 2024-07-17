class Column {
  constructor(object) {
    this.key = object.key || '';
    this.data = object.data || null;
    this.name = object.name || [];
    this.type = object.type || [];
    this.width = object.width || 200;
    this.editable = object.editable || !this.key.startsWith('_') || false;
  }

}

export default Column;
