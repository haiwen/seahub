class Workflow {

  constructor(object) {
    this.id = object.id || '';
    this.name = object.name || '';
    this.graph = object.graph || '';
    this.is_valid = object.is_valid || false;
    this.repo_id = object.repo_id || '';
    this.trigger_from = object.trigger_from || '';
    this.created_at = object.created_at || '';
    this.created_by = object.created_by || '';
    this.updated_at = object.updated_at || '';
    this.updated_by = object.updated_by || '';
  }
}

export default Workflow;
