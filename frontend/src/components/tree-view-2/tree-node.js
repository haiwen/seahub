class TreeNode {

  constructor({id, object, isLoaded = false, isPreload = false, isExpanded = false}) {
    if (!object) {
      throw new Error("The object parameter is required.");
    }
    this.id = id || object.name,  // The default setting is the object name, which is set to a relative path when the father is set.
    this.object = object;
    this.loadUrl = this.id;
    this.isLoaded = isLoaded;
    this.isPreload = isPreload;
    this.isExpanded = isExpanded;
    this.children = [];
    this.parentNode = null;
  }

  clone() {
    let treeNode = new TreeNode({
      id: this.id,
      object: this.object,
      loadUrl: this.loadUrl,
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

  isLoaded() {
    return this.isLoaded;
  }

  setLoaded(isLoaded) {
    this.isLoaded = isLoaded;
  }

  isPreload() {
    return this.isPreload;
  }

  setPreLoad(isPreload) {
    this.isPreload = isPreload;
  }

  isExpanded() {
    return this.isExpanded;
  }

  setExpanded(isExpanded) {
    this.isExpanded = isExpanded;
  }

  getParentNode() {
    return this.parentNode;
  }

  setParentNode(parentNode) {

    this.id = this.generatorId(parentNode);
    this.loadUrl = this.id;
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
    this.children = this.children.filter(item => {
      return item.id !== node.id;
    });
  }

  rename(newName) {
    this.object.name = newName;
    this.id = this.generatorId(this.parentNode);
    this.loadUrl = this.id;
    
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

  generatorId(parentNode) {
    return parentNode.id === '/' ? parentNode.id + this.object.name : parentNode.id + '/' + this.object.name;
  }

  serializeToJson() {
    let children = [];
    if (this.hasChildren) {
      children = this.children.map(m => m.serializeToJson());
    }

    const treeNode = {
      id: this.id,
      object: this.object,
      loadUrl: this.loadUrl,
      isLoaded: this.isLoaded,
      isPreload: this.isPreload,
      isExpanded: this.isExpanded,
      parentNode: this.parentNode,
      children: children,
    }

    return treeNode;
  }

  static deserializefromJson(object) {
    let { id, object, loadUrl, isLoaded, isExpanded, parentNode, children = [] } = object;

    const treeNode = new TreeNode({
      id,
      parentId,
      object,
      loadUrl,
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
