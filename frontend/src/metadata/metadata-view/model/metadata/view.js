class View {
  constructor(object) {
    this.filters = object.filters || [];
    this.filter_conjunction = object.filter_conjunction || 'Or';
    this.sorts = object.sorts || [];
    this.groupbys = object.groupbys || [];
    this.groups = object.groups;
    this.rows = object.rows || [];
    // this.available_columns = object.available_columns || [];
  }

}

export default View;
