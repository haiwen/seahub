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

  getNode(node) {
    let findNode = null;
    function callback(currentNode) {
      if (currentNode.id === node.id) {
        findNode = currentNode;
        return true;
      }
      return false;
    }
    this.traverseDF(callback);
    return findNode;
  }

  getNodeByPath(path) { 
    // id ==== path
    let id = path;
    let findNode = null;
    function callback(currentNode) {
      if (currentNode.id === id) {
        findNode = currentNode;
        return true;
      }
      return false;
    }
    this.traverseDF(callback);
    return findNode;
  }

  getNodeParent(node) {
    let node = this.getNode(node);
    return node.parentNode;
  }

  getNodeChildren(node) {
    let node = this.getNode();
    return node.children;
  }

  getNodeChildrenObject(node) {
    let node = this.getNode();
    let objects = node.children.map(item => {
      let object = item.object;
      return object;
    });
    return objects;
  }

  addNodeToParent(node, parentNode) {
    parentNode = this.getNode(parentNode);
    parentNode.addChild(node);
  }

  addNodeListToParent(nodeList, parentNode) {
    parentNode = this.getNode(parentNode);
    nodeList.forEach(node => {
      parentNode.addCihld(node);
    });
  }

  deleteNode(node) {
    let parentNode = this.getNode(node.parentNode);
    parentNode.deleteChild(node);
  }

  deleteNodeList(nodeList) {
    nodeList.forEach(node => {
      this.deleteNode(node);
    });
  }

  renameNode(node, newName) {
    node = this.getNode(node);
    node.rename(newName);
  }

  updateNode(node, keys, newValues) {
    node = this.getNode(node);
    node.updateObjectParam(keys, newValues);
  }

  moveNode(node, destNode) {
    let nodeCopy = node.clone();

    // add
    destNode = this.getNode(destNode);
    destNode.addChild(node);

    // delete
    let parentNode = this.getNode(nodeCopy.parentNode);
    parentNode.deleteChild(nodeCopy);
  }

  copyNode(node, destNode) {
    // add
    destNode = this.getNode(destNode);
    destNode.addChild(node);
  }

  traverseDF() {
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

  traverseBF() {
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

  expandNode(node, isExpandedAncestor) {
    node = this.getNode(node);
    node.setExpanded(true);

    if (isExpandedAncestor) { // exparent current node all ancestor
      while (node.parentNode) {
        node.parentNode.setExpanded(true);
        node = node.parentNode;
      }
    }
  }
  
  collapseNode(node) {
    node = this.getNode(node);
    node.setExpanded(false);
  }

  isNodeChild(node, parentNode) {
    node = this.getNode(node);
    parentNode = this.getNode(parentNode);
    return parentNode.children.some(item => {
      return item.id === node.id;
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
