import View from './view';

class Metadata {
  constructor(object) {
    this.columns = object.columns || [];
    this.rows = object.rows || [];
    this.id_row_map = {};
    this.row_ids = [];
    this.rows.forEach(record => {
      this.row_ids.push(record._id);
      this.id_row_map[record._id] = record;
    });

    this.hasMore = true;
    this.recordsCount = this.row_ids.length;
    this.view = new View(object.view || {}, this.columns);
  }

}

export default Metadata;
