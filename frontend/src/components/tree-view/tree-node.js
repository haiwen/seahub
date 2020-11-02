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

  clone(parentNode) {
    let treeNode = new TreeNode({
      path: this.path,
      object: this.object.clone(),
      isLoaded: this.isLoaded,
      isPreload: this.isPreload,
      isExpanded: this.isExpanded,
      parentNode: parentNode || null,
    });
    treeNode.children = this.children.map(child => {
      let newChild = child.clone(treeNode);
      return newChild;
    });

    return treeNode;
  }

  setParent(parentNode) {
    this.path = this.generatePath(parentNode);
    this.parentNode = parentNode;
    this.isLoaded = false;  // update parentNode need loaded data again;
  }

  hasChildren() {
    return this.children.length !== 0;
  }

  addChild(node) {
    node.setParent(this);
    let children = this.children;
    if (node.object.isDir()) {
      this.children.unshift(node);
    } else {
      let index = -1;
      for (let i = 0; i < children.length; i++) {
        if (!children[i].object.isDir()) {
          index = i;
          break;
        }
      }
      if (index === -1) { // -1: all the node object is dir;
        this.children.push(node);
      } else if (index === 0) { // 0: all the node object is file
        this.children.unshift(node);
      } else {
        this.children.splice(index, 0, node);
      }
    }
  }

  addChildren(nodeList) {
    nodeList.forEach(node => {
      node.setParent(this);
    });
    this.children = nodeList;
  }

  deleteChild(node) {
    let children = this.children.filter(item => {
      return item !== node;
    });
    this.children = children;
  }

  rename(newName) {
    this.object.name = newName;
    this.path = this.generatePath(this.parentNode);
    if (this.isExpanded) {
      this.updateChildrenPath(this);
    } else {
      this.isLoaded = false;
    }
  }

  updateChildrenPath(node) {
    let children = node.children;
    children.forEach(child => {
      child.path = child.generatePath(child.parentNode);
      if (child.isExpanded) {
        child.updateChildrenPath(child);
      } else {
        child.isLoaded = false;
      }
    });
  }

  updateObjectProperties(keys, newValues) {
    if (Array.isArray(keys) && Array.isArray(newValues)) {
      keys.forEach((key, index) => {
        this.object[key] = newValues[index];
      });
    } else {
      this.object[keys] = newValues;
    }
  }

  generatePath(parentNode) {
    return parentNode.path === '/' ? parentNode.path + this.object.name : parentNode.path + '/' + this.object.name;
  }

  serializeToJson() {
    let children = [];
    if (this.hasChildren) {
      children = this.children.map(m => m.serializeToJson());
    }

    const treeNode = {
      path: this.path,
      object: this.object.clone(),
      isLoaded: this.isLoaded,
      isPreload: this.isPreload,
      isExpanded: this.isExpanded,
      parentNode: this.parentNode,
      children: children,
    };

    return treeNode;
  }

  static deserializefromJson(json) {
    let { path, object, isLoaded, isPreload, isExpanded, parentNode, children = [] } = json;
    object = object.clone();

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
