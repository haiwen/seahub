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

    this.hasMore = object.hasMore || false;
    this.recordsCount = object.recordsCount || this.row_ids.length;
    this.page = 1;
    this.perPageCount = 1000;
  }

  extendRows = (rows) => {
    if (!Array.isArray(rows) || rows.length === 0) {
      this.hasMore = false;
      return;
    }

    this.rows.push(...rows);
    rows.forEach(record => {
      this.row_ids.push(record._id);
      this.id_row_map[record._id] = record;
    });
  };

}

export default Metadata;
