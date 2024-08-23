import { getColumnByKey, VIEW_NOT_DISPLAY_COLUMN_KEYS } from '../../_basic';

class View {
  constructor(object, columns) {

    this._id = object._id || '';
    this.type = object.type || 'table';

    // filter
    this.filters = object.filters || [];
    this.filter_conjunction = object.filter_conjunction || 'Or';

    // sort
    this.sorts = object.sorts || [];

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
