import { normalizeColumnData } from '../../utils/column-utils';
import { CellType, PRIVATE_COLUMN_KEYS, EDITABLE_PRIVATE_COLUMN_KEYS } from '../../_basic';

class Column {
  constructor(object) {
    this.key = object.key || '';
    this.name = object.name || '';
    this.type = object.type || '';
    this.data = object.data || null;
    this.width = object.width || 200;
    this.editable = this.enable_edit(this.key, this.type);
    this.data = normalizeColumnData(this);
  }

  enable_edit = (key, type) => {
    if (PRIVATE_COLUMN_KEYS.includes(key)) return EDITABLE_PRIVATE_COLUMN_KEYS.includes(key);
    return type !== CellType.LONG_TEXT;
  };

}

export default Column;
