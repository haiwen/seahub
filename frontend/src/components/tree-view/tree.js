import TreeNode from './tree-node';

class Tree {

  constructor() {
    this.root = null;
  }

  clone() {
    let tree = new Tree();
    if (this.root) {
      tree.root = this.root.clone();
    }
    return tree;
  }

  setRoot(node) {
    this.root = node;
  }

  getNodeByPath(path) {
    if (!path || !this.root) return null;
    let findNode = null;
    function callback(currentNode) {
      if (currentNode.path === path) {
        findNode = currentNode;
        return true;
      }
      return false;
    }
    this.traverseDF(callback);
    return findNode;
  }

  getNodeChildrenObject(node) {
    if (!node || !node.children) return [];
    let objects = node.children.map(item => {
      let object = item.object;
      return object;
    });
    return objects;
  }

  addNodeToParent(node, parentNode) {
    if (!node || !parentNode) return;
    parentNode.addChild(node);
  }

  addNodeListToParent(nodeList, parentNode) {
    if (!nodeList || !Array.isArray(nodeList) || !parentNode) return false;
    nodeList.forEach(node => {
      parentNode.addChild(node);
    });
  }

  deleteNode(node) {
    if (!node || !node.parentNode) return false;
    let parentNode = this.getNodeByPath(node.parentNode.path);
    parentNode.deleteChild(node);
  }

  deleteNodeList(nodeList) {
    if (!nodeList || !Array.isArray(nodeList)) return false;
    nodeList.forEach(node => {
      this.deleteNode(node);
    });
  }

  renameNode(node, newName) {
    if (!node || !newName || typeof newName !== 'string') return false;
    node.rename(newName);
  }

  updateNode(node, keys, newValues) {
    if (!node || !keys || !newValues) return false;
    if (!Array.isArray(keys) || !Array.isArray(newValues)) return false;
    if (keys.length !== newValues.length) return false;
    node.updateObjectProperties(keys, newValues);
  }

  moveNode(node, destNode) {
    if (!node || !destNode) return false;
    if (node === destNode) return false;
    this.deleteNode(node);
    destNode.addChild(node);
  }

  copyNode(node, destNode) {
    if (!node || !destNode) return false;
    destNode.addChild(node);
  }

  traverseDF(callback) {
    let stack = [];
    let found = false;
    stack.unshift(this.root);
    let currentNode = stack.shift();
    while (!found && currentNode) {
      found = callback(currentNode) == true ? true : false;
      if (!found) {
        stack.unshift(...currentNode.children);
        currentNode = stack.shift();
      }
    }
  }

  traverseBF(callback) {
    let queue = [];
    let found = false;
    queue.push(this.root);
    let currentNode = queue.shift();
    while (!found && currentNode) {
      found = callback(currentNode) === true ? true : false;
      if (!found) {
        queue.push(...currentNode.children);
        currentNode = queue.shift();
      }
    }
  }

  expandNode(node) {
    if (!node) return false;
    node.isExpanded = true;
    while (node.parentNode) {
      node.parentNode.isExpanded = true;
      node = node.parentNode;
    }
  }

  collapseNode(node) {
    if (!node) return false;
    node.isExpanded = false;
  }

  isNodeChild(node, parentNode) {
    if (!node || !parentNode || !parentNode.children) return false;
    return parentNode.children.some(item => {
      return item.path === node.path;
    });
  }

  serializeToJson() {
    return this.root.serializeToJson();
  }

  deserializefromJson(json) {
    let root = TreeNode.deserializefromJson(json);
    let tree = new Tree();
    tree.setRoot(root);
    return tree;
  }

}

export default Tree;
