import { getColumnDisplayName, normalizeColumnData } from '../utils/column';
import { PRIVATE_COLUMN_KEYS, EDITABLE_PRIVATE_COLUMN_KEYS, PRIVATE_COLUMN_KEY } from '../constants';

class Column {
  constructor(object) {
    this.key = object.key || '';
    this.name = getColumnDisplayName(this.key, object.name) || '';
    this.type = object.type || '';
    this.data = object.data || null;
    this.width = object.width || this.getDefaultWidth(this.key);
    this.editable = this.enable_edit(this.key, this.type);
    this.data = normalizeColumnData(this);
    this.frozen = this.is_frozen(this.key) || object.frozen || false;
  }

  getDefaultWidth = (key) => {
    return key == PRIVATE_COLUMN_KEY.FILE_NAME ? 250 : 200;
  };

  is_frozen = (key) => {
    return key === PRIVATE_COLUMN_KEY.FILE_NAME;
  };

  enable_edit = (key, type) => {
    if (PRIVATE_COLUMN_KEYS.includes(key)) return EDITABLE_PRIVATE_COLUMN_KEYS.includes(key);
    return true;
  };

}

export default Column;
