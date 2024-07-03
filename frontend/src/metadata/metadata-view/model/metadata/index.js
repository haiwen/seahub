import { PER_PAGE_COUNT } from '../../constants';
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

    this.hasMore = this.rows.length === PER_PAGE_COUNT;

    this.recordsCount = object.recordsCount || this.row_ids.length;
    this.view = new View(object.view || {});
  }

}

export default Metadata;
