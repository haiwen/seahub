import { normalizeColumnData } from '../../utils/column-utils';

class Column {
  constructor(object) {
    this.key = object.key || '';
    this.name = object.name || '';
    this.type = object.type || '';
    this.data = object.data || null;
    this.width = object.width || 200;
    this.editable = object.editable || !this.key.startsWith('_') || false;
    this.data = normalizeColumnData(this);
  }

}

export default Column;
