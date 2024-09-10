import { getColumnByKey, VIEW_NOT_DISPLAY_COLUMN_KEYS, VIEW_TYPE_DEFAULT_BASIC_FILTER, VIEW_TYPE, VIEW_TYPE_DEFAULT_SORTS } from '../../_basic';

class View {
  constructor(object, columns) {

    this._id = object._id || '';
    this.type = object.type || 'table';

    if (this.type === 'image') {
      this.type = VIEW_TYPE.GALLERY;
    }

    // filter
    this.filters = object.filters || [];
    this.filter_conjunction = object.filter_conjunction || 'Or';

    this.basic_filters = object.basic_filters && object.basic_filters.length > 0 ? object.basic_filters : VIEW_TYPE_DEFAULT_BASIC_FILTER[this.type];

    // sort
    this.sorts = object.sorts && object.sorts.length > 0 ? object.sorts : VIEW_TYPE_DEFAULT_SORTS[this.type];

    // group
    this.groupbys = object.groupbys || [];
    this.groups = object.groups;

    // hidden columns
    this.hidden_columns = object.hidden_columns || [];

    // rows
    this.rows = object.rows || [];

    // columns
    this.available_columns = columns || [];
    this.display_available_columns = this.available_columns.filter(column => !VIEW_NOT_DISPLAY_COLUMN_KEYS.includes(column.key));
    this.columns = this.display_available_columns;

    // order
    let columnsKeys = object.columns_keys || [];
    if (columnsKeys.length === 0) {
      this.columns_keys = this.display_available_columns.map(c => c.key);
    } else {
      let columns = columnsKeys.map(key => getColumnByKey(this.display_available_columns, key)).filter(c => c);
      this.display_available_columns.forEach(column => {
        if (!getColumnByKey(columns, column.key)) {
          columns.push(column);
        }
      });
      this.columns_keys = columns.map(c => c.key);
      this.columns = columns;
    }
  }

}

export default View;
