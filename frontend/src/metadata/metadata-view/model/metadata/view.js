import { VIEW_NOT_DISPLAY_COLUMN_KEYS } from '../../_basic';

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
    this.columns = this.available_columns.filter(column => !VIEW_NOT_DISPLAY_COLUMN_KEYS.includes(column.key));
  }

}

export default View;
