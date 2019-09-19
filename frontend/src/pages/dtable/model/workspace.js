class Workspace {

  constructor(obj) {
    this.id = obj.id || '';
    this.owner_name = obj.owner_name || '';
    this.owner_type = obj.owner_type || '';
    this.table_list = obj.table_list || [];
  }

}

export default Workspace;