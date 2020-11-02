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
    let objects = node.children.map(item => {
      let object = item.object;
      return object;
    });
    return objects;
  }

  addNodeToParent(node, parentNode) {
    parentNode.addChild(node);
  }

  addNodeListToParent(nodeList, parentNode) {
    nodeList.forEach(node => {
      parentNode.addChild(node);
    });
  }

  deleteNode(node) {
    let parentNode = this.getNodeByPath(node.parentNode.path);
    parentNode.deleteChild(node);
  }

  deleteNodeList(nodeList) {
    nodeList.forEach(node => {
      this.deleteNode(node);
    });
  }

  renameNode(node, newName) {
    node.rename(newName);
  }

  updateNode(node, keys, newValues) {
    node.updateObjectParam(keys, newValues);
  }

  moveNode(node, destNode) {
    this.deleteNode(node);
    destNode.addChild(node);
  }

  copyNode(node, destNode) {
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
    node.isExpanded = true;
    while (node.parentNode) {
      node.parentNode.isExpanded = true;
      node = node.parentNode;
    }
  }

  collapseNode(node) {
    node.isExpanded = false;
  }

  isNodeChild(node, parentNode) {
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
