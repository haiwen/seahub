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
