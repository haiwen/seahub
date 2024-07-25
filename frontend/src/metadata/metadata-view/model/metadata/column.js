import { normalizeColumnData } from '../../utils/column-utils';
import { CellType } from '../../_basic';

class Column {
  constructor(object) {
    this.key = object.key || '';
    this.name = object.name || '';
    this.type = object.type || '';
    this.data = object.data || null;
    this.width = object.width || 200;
    this.editable = object.editable || !this.key.startsWith('_') && this.type !== CellType.LONG_TEXT || false;
    this.data = normalizeColumnData(this);
  }

}

export default Column;
