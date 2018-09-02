import Node from './node';

class Tree {
  
  constructor() {
    this.root = null;
  }

  clone() {
    var t = new Tree();
    if (this.root)
      t.root = this.root.clone();
    return t;
  }

  setRoot(node) {
    this.root = node;
  }

  addNodeToParent(node, parentNode) {
    node.parent = parentNode;
    parentNode.children.push(node);
    return node;
  }

  removeNodeFromParent(node, parentNode) {
    let children = parentNode.children;
    let removeNode = null;
    let index = null;
    for (let i = 0; i < children.length; i++) {
      if (node.path === children[i].path) {
        removeNode = children[i];
        index = i;
        break;
      }
    }
    node.parent = null;
    parentNode.children.splice(index, 1);
    return removeNode ? removeNode : null;
  }

  addNode(node) {
    let treeNodeParent = this.findNodeParentFromTree(node);
    if (treeNodeParent) {
      this.addNodeToParent(node, treeNodeParent);
      return true;
    }
    return false;
  }

  deleteNode(node) {
    let treeNodeParent = this.findNodeParentFromTree(node);
    if (treeNodeParent) {
      this.removeNodeFromParent(node, treeNodeParent);
      return true;
    }
    return false;
  }

  updateNodeParam(node, param, newValue) {
    let treeNode = this.findNodeFromTree(node);
    if (treeNode && treeNode[param]) {
      treeNode[param] = newValue;
      return true;
    }
    return false;
  }

  findNode(node) {
    return this.findNodeFromTree(node);
  }

  findNodeFromTree(node) {
    let findNode = this.getNodeByPath(node.path);
    return findNode;
  }

  findNodeParentFromTree(node) {
    let parentNode = node.parent;
    let findNode = null;
    function cb(treeNode) {
      if (treeNode.path === parentNode.path) {
        findNode = treeNode;
        return true;
      }
      return false;
    }
    this.traverseDF(cb);
    return findNode;
  }

  setNodeToActivated(node) {
    this.setTreeToUnActivated();
    let treeNode = this.findNodeFromTree(node);
    if (treeNode) {
      treeNode.isExpanded = true;
      while (treeNode.parent) {
        treeNode.parent.isExpanded = true;
        treeNode = treeNode.parent;
      }
      return true;
    }
    return false;
  }

  setTreeToUnActivated() {
    function cb(treeNode) {
      treeNode.isExpanded = false;
      return false;
    }
    this.traverseBF(cb);
    this.root.isExpanded = true;
    return true;
  }

  getNodeByPath(path) {
    let findNode = null;
    function cb(treeNode) {
      if (treeNode.path === path) {
        findNode = treeNode;
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

  parseModelToTree(model) {
    var node = new Node({
      id: model.id,
      name: model.name,
      type: model.type,
      username: model.username,
      slug: model.slug,
      permission: model.permission,
      created_at: model.created_at,
      updated_at: model.updated_at,
      isExpanded: false
    });
    if (model.children instanceof Array) {
      for (let child of model.children) {
        this.addNodeToParent(this.parseNodeToTree(child), node);
      }
    }
    return node;
  }

  parseListToTree(nodeList) {
    
    function getNodePath(parentPath, nodeName) {
      return parentPath === "/" ? (parentPath + nodeName) : (parentPath + "/" + nodeName);
    }

    let root = new Node({name: '/', type: 'dir', isExpanded: true});
    this.root = root;

    let map = new Map();
    map.set(root.name, root);
    let treeNodeList = [];
    for (let nodeObj of nodeList) {
      let node = new Node({
        id: nodeObj.id,
        name: nodeObj.name,
        type: nodeObj.type,
        username: nodeObj.username,
        slug: nodeObj.slug,
        permission: nodeObj.permission,
        created_at: nodeObj.created_at,
        updated_at: nodeObj.updated_at,
        isExpanded: false
      });
      node.parent_path = nodeObj.parent_path;
      treeNodeList.push(node);
      if (node.isDir()) {
        map.set(getNodePath(node.parent_path, node.name), node);
      }
    }

    for (let node of treeNodeList) {
      let p = map.get(node.parent_path);
      if (p === undefined) {
        console.log("warning: node " + node.parent_path + " not exist");
      } else {
        this.addNodeToParent(node, p);
      }
    }

  }

  parseNodeToTree(node) {
    var node = new Node({
      id: node.id,
      name: node.name,
      type: node.type,
      username: node.username,
      slug: node.slug,
      permission: node.permission,
      created_at: node.created_at,
      updated_at: node.updated_at,
      isExpanded: false
    });
    if (node.children instanceof Array) {
      for (let child of node.children) {
        this.addNodeToParent(this.parseNodeToTree(child), node);
      }
    }
    return node;
  }

}

export default Tree;
