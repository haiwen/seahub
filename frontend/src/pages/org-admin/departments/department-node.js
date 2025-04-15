class DepartmentNode {

  constructor(props) {
    this.id = props.id || '';
    this.name = props.name || '';
    this.children = props.children || [];
    this.parentNode = props.parentNode || null;
    this.orgId = props.orgId || '';
    this.quota = props.quota || -2;
  }

  findNodeById(nodeId) {
    if (this.id === nodeId) return this;
    const s = [...this.children];
    while (s.length > 0) {
      const node = s.shift();
      if (node.id === nodeId) return node;
      s.push(...node.children);
    }
  }

  addChildren(nodes) {
    this.children.push(...nodes);
  }

  setChildren(nodes) {
    this.children = nodes;
  }

  hasChildren() {
    return this.children.length > 0;
  }

  deleteChildById(nodeId) {
    this.children = this.children.filter(nodeItem => nodeItem.id !== nodeId);
  }
}

export default DepartmentNode;
