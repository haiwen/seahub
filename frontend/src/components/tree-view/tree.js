import Node from './node';
import moment from 'moment';
import { Utils } from '../../utils/utils';

const lang = window.app.config.lang;
moment.locale(lang);

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
    let newNode = node.clone();
    newNode.parent = parentNode;
    parentNode.children.push(newNode);
    return newNode;
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

  deleteNodeByPath(path) {
    let node = this.getNodeByPath(path);
    this.deleteNode(node);
  }

  moveNode(node, moveToNode, isDestroy) {
    this.addNodeToParent(node, moveToNode);
    if (isDestroy) {
      this.deleteNode(node);
    }
  }

  moveNodeByPath(path, moveToPath, isDestroy) {
    let node = this.getNodeByPath(path);
    let moveToNode = this.getNodeByPath(moveToPath);
    this.moveNode(node, moveToNode, isDestroy);
  }

  updateNodeParam(node, param, newValue) {
    let treeNode = this.findNodeFromTree(node);
    if (treeNode && treeNode[param]) {
      treeNode[param] = newValue;
      return true;
    }
    return false;
  }

  updateNodeParamByPath(path, param, newValue) {
    let node = this.getNodeByPath(path);
    this.updateNodeParam(node, param, newValue);
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

  expandNode(node) {
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

  collapseNode(node) {
    let treeNode = this.findNodeFromTree(node);
    if (treeNode) {
      treeNode.isExpanded = false;
      return true;
    }
    return false;
  }

  resetTreeState() {
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

  isNodeChild(parentNode, node) {
    let isChild = false;
    while(node.parent){
      if(node.parent.path === parentNode.path){
        isChild = true;
        break;
      }
      node = node.parent;
    }
    return isChild;
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
      name: model.name,
      type: model.type,
      size: Utils.bytesToSize(model.size),
      last_update_time: moment.unix(model.last_update_time).fromNow(),
      permission: model.permission,
      parent_path: model.parent_path,
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
      return parentPath === '/' ? (parentPath + nodeName) : (parentPath + '/' + nodeName);
    }

    let root = new Node({name: '/', type: 'dir', isExpanded: true});
    this.root = root;

    let map = new Map();
    map.set(root.name, root);
    let treeNodeList = [];
    for (let nodeObj of nodeList) {
      let node = new Node({
        name: nodeObj.name,
        type: nodeObj.type,
        size: Utils.bytesToSize(nodeObj.size),
        last_update_time: moment.unix(nodeObj.last_update_time).fromNow(),
        permission: nodeObj.permission,
        parent_path: nodeObj.parent_path,
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
        /* eslint-disable */
        console.log('warning: node ' + node.parent_path + ' not exist');
        /* eslint-enable */
      } else {
        this.addNodeToParent(node, p);
      }
    }

  }

  parseNodeToTree(node) {
    var newNode = new Node({
      name: node.name,
      type: node.type,
      size: Utils.bytesToSize(node.size),
      last_update_time: moment.unix(node.last_update_time).fromNow(),
      permission: node.permission,
      parent_path: node.parent_path,
      isExpanded: false
    });
    if (node.children instanceof Array) {
      for (let child of node.children) {
        this.addNodeToParent(this.parseNodeToTree(child), newNode);
      }
    }
    return newNode;
  }

}

export default Tree;
