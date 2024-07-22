import { VIEW_NOT_DISPLAY_COLUMN_KEYS } from '../../_basic';

class View {
  constructor(object, columns) {
    this.filters = object.filters || [];
    this.filter_conjunction = object.filter_conjunction || 'Or';
    this.sorts = object.sorts || [];
    this.groupbys = object.groupbys || [];
    this.groups = object.groups;
    this.rows = object.rows || [];
    this.available_columns = columns || [];
    this.columns = this.available_columns.filter(column => !VIEW_NOT_DISPLAY_COLUMN_KEYS.includes(column.key));
  }

}

export default View;
