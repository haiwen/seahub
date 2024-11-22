import Column from '../../metadata/model/column';

class TagsData {
  constructor(object) {
    const columns = object.columns || [];
    this.columns = columns.map(column => new Column(column));
    this.key_column_map = {};
    this.columns.forEach(column => {
      this.key_column_map[column.key] = column;
    });

    this.rows = object.rows || [];
    this.id_row_map = {};
    this.row_ids = [];
    this.rows.forEach(record => {
      this.row_ids.push(record._id);
      this.id_row_map[record._id] = record;
    });
  }

}

export default TagsData;