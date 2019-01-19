class TreeNode {

  constructor({ path, object, isLoaded, isPreload, isExpanded, parentNode }) {
    this.path = path || object.name,  // The default setting is the object name, which is set to a relative path when the father is set.
    this.object = object;
    this.isLoaded = isLoaded || false;
    this.isPreload = isPreload || false;
    this.isExpanded = isExpanded || false;
    this.children = [];
    this.parentNode = parentNode || null;
  }

  clone() {
    let treeNode = new TreeNode({
      path: this.path,
      object: this.object,
      isLoaded: this.isLoaded,
      isPreload: this.isPreload,
      isExpanded: this.isExpanded,
      parentNode: this.parentNode,
    });
    treeNode.children = this.children.map(child => {
      let newChild = child.clone();
      return newChild;
    });

    return treeNode;
  }

  hasLoaded() {
    return this.isLoaded;
  }

  setLoaded(isLoaded) {
    this.isLoaded = isLoaded;
  }

  hasPreload() {
    return this.isPreload;
  }

  setPreLoad(isPreload) {
    this.isPreload = isPreload;
  }

  hasExpanded() {
    return this.isExpanded;
  }

  setExpanded(isExpanded) {
    this.isExpanded = isExpanded;
  }

  getParentNode() {
    return this.parentNode;
  }

  setParentNode(parentNode) {
    this.path = this.generatorPath(parentNode);
    this.parentNode = parentNode;
    this.isLoaded = false;  // update parentNode need loaded data again;
  }

  hasChildren() {
    return this.children.length;
  }

  addChild(node) {
    node.setParentNode(this);
    this.children.push(node);
  }

  deleteChild(node) {
    let children = this.children.filter(item => {
      return item.path !== node.path;
    });
    this.children = children;
  }

  rename(newName) {
    this.object.name = newName;
    this.path = this.generatorPath(this.parentNode); 
    this.isLoaded = false;  // rename node need loaded children again
  }

  updateObjectParam(keys, newValues) {
    if (Array.isArray(keys) && Array.isArray(newValues)) {
      keys.forEach((key, index) => {
        this.object[key] = newValues[index];
      });
    } else {
      this.object[keys] = newValues;
    }
  }

  generatorPath(parentNode) {
    return parentNode.path === '/' ? parentNode.path + this.object.name : parentNode.path + '/' + this.object.name;
  }

  serializeToJson() {
    let children = [];
    if (this.hasChildren) {
      children = this.children.map(m => m.serializeToJson());
    }

    const treeNode = {
      path: this.path,
      object: this.object,
      isLoaded: this.isLoaded,
      isPreload: this.isPreload,
      isExpanded: this.isExpanded,
      parentNode: this.parentNode,
      children: children,
    }

    return treeNode;
  }

  static deserializefromJson(json) {
    let { path, object, isLoaded, isPreload, isExpanded, parentNode, children = [] } = json;

    const treeNode = new TreeNode({
      path,
      object,
      isLoaded,
      isPreload,
      isExpanded,
      parentNode,
      children: children.map(item => TreeNode.deserializefromJson(item))
    });
    return treeNode;
  }
}

export default TreeNode;
