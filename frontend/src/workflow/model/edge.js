class WorkflowEdge {

  constructor(object) {
    this.id = object.id || '';
    this.source = object.source || '';
    this.sourceHandle = object.sourceHandle || '';
    this.target = object.target || '';
  }
}

export default WorkflowEdge;
