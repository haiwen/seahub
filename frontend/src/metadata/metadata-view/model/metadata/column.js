import { normalizeColumnData, getColumnName } from '../../utils/column-utils';
import { CellType, PRIVATE_COLUMN_KEYS, EDITABLE_PRIVATE_COLUMN_KEYS, PRIVATE_COLUMN_KEY } from '../../_basic';

class Column {
  constructor(object) {
    this.key = object.key || '';
    this.name = getColumnName(this.key, object.name) || '';
    this.type = object.type || '';
    this.data = object.data || null;
    this.width = object.width || 200;
    this.editable = this.enable_edit(this.key, this.type);
    this.data = normalizeColumnData(this);
    this.frozen = this.is_frozen(this.key) || object.frozen || false;
  }

  is_frozen = (key) => {
    return key === PRIVATE_COLUMN_KEY.FILE_NAME;
  };

  enable_edit = (key, type) => {
    if (PRIVATE_COLUMN_KEYS.includes(key)) return EDITABLE_PRIVATE_COLUMN_KEYS.includes(key);
    return type !== CellType.LONG_TEXT;
  };

}

export default Column;
