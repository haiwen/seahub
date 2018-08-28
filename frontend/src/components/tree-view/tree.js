import { Node } from './node'

class Tree {

  constructor() {
    this.root = null;
  }

  copy() {
    var t = new Tree();
    if (this.root)
      t.root = this.root.copy();
    return t;
  }

  setRoot(dir) {
    this.root = dir;
  }

  addChildToNode(node, child) {
    child.parent = node;
    node.children.push(child);
    return child;
  }

  addChild(node, child, insertIndex) {
    if (!(child instanceof Node)) {
      throw new TypeError('Child must be of type Node.');
    }
    if (insertIndex < 0 || insertIndex > node.children.length) {
      throw new Error('Invalid index.');
    }

    child.parent = node;
    node.children.splice(insertIndex, 0, child);
  }

  removeChildNode(node, child) {
    let children = node.children;
    let removeNode = null;
    let index = null;
    for (let i = 0; i < children.length; i++) {
      if (child.path === children[i].path) {
        removeNode = children[i];
        index = i;
        break;
      }
    }
    child.parent = null;
    node.children.splice(index, 1);
    return removeNode ? removeNode : null;
  }

  addNodeToTree(node) {
    let parentNode = this.getNodeParentFromTree(node);
    this.addChildToNode(parentNode, node);
  }

  removeNodeFromTree(node) {
    let parentNode = this.getNodeParentFromTree(node);
    this.removeChildNode(parentNode, node);
  }

  getNodeParentFromTree(node) {
    let parentNode = node.parent;
    let findNode = null;
    function cb(node) {
      if(parentNode.path === node.path){
        findNode = node;
        return true;
      }
      return false;
    }
    this.traverseBF(cb);
    return findNode;
  }

  getNodeByPath(path) {
    let findNode = null;
    function cb(node){
      if (node.path === path) {
        findNode = node;
        return true;
      }
      return false;
    }
    this.traverseBF(cb);
    return findNode;
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

  setOneNodeToActived({node}) {
    this.setNoneNodeActived();
    let root = this.root;
    root.isExpanded = true;
    let layer2 = root.hasChildren() ? root.children : null; // direct to replace root child;
    let isLayer2 = false;
    for (let i = 0; i < layer2.length; i++) {
      if (node.path === layer2[i].path) {
        isLayer2 = true;
        break;
      }
    }
    if (isLayer2) {
      return;
    }
    let replaceNode = null;
    let needReplacedNode = null;
    while (node.parent) {
      let flag = false;
      node.parent.isExpanded = true;
      for (let i = 0; i < layer2.length; i++) {
        if (node.parent.path === layer2[i].path) {
          replaceNode = node.parent;
          needReplacedNode = layer2[i];
          flag = true;
          break;
        }
      }
      if (flag) {
        break;
      }
      node = node.parent;
    }

    this.removeChildNode(root, needReplacedNode);
    this.addChildToNode(root, replaceNode);
  }

  setNoneNodeActived() {
    function setNodeToDeactived(node) {
      if (node.isExpanded) {
        node.isExpanded = false;
        if (node.hasChildren()) {
          let children = node.children;
          children.forEach(function(child) {
            setNodeToDeactived(child);
          })
        }
      }
    }
    setNodeToDeactived(this.root);
    this.root.isExpanded = true; // default to show;
    return true;
  }

  /*
  * parse tree from javascript object
  */
  parse(model) {
    var node = new Node({
      name: model.name,
      type: model.type,
      isExpanded: model.isExpanded
    });
    this.root = node;
    for (let child of model.children) {
      this.addChildToNode(node, this.parseNode(child));
    }
  }

  parseFromList(rootObj, nodeList) {
    var root = new Node({
      name: rootObj.name,
      type: rootObj.type,
      isExpanded: rootObj.isExpanded
    });
    this.root = root;

    var map = new Map();
    map.set(root.name, root);

    function joinPath(parent_path, name) {
      if (parent_path === "/")
        return parent_path + name;
      else
        return parent_path + "/" + name;
    }

    var treeNodeList = []
    for (let nodeObj of nodeList) {
      var node = new Node({
        name: nodeObj.name,
        type: nodeObj.type,
        isExpanded: false
      });
      node.parent_path = nodeObj.parent_path;
      treeNodeList.push(node);
      if (nodeObj.type === "dir") {
        map.set(joinPath(nodeObj.parent_path, nodeObj.name), node);
      }
    }

    for (let node of treeNodeList) {
      let p = map.get(node.parent_path);
      if (p === undefined) {
        console.log("warning: node " + node.parent_path + " not exist");
      } else {
        this.addChildToNode(p, node);
      }
    }
  }

  parseNode(model) {
    var node = new Node({
      name: model.name,
      type: model.type,
      isExpanded: model.isExpanded
    });
    if (model.children instanceof Array) {
      for (let child of model.children) {
        this.addChildToNode(node, this.parseNode(child));
      }
    }
    return node;
  }


}

export default Tree;
