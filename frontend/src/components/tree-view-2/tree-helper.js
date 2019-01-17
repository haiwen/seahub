import { Utils } from '../utils/utils';

class TreeHelper {

  expandNode(tree, node) {  // This tree has been cloned
    tree.expandNode(node);
  }

  collapseNode(tree, node) {
    let treeCopy = tree.clone();
    treeCopy.collapseNode(node);
    return treeCopy;
  }

  findNodeByPath(tree, nodePath) {
    let treeCopy = tree.clone();
    let node = treeCopy.getNodeByPath(nodePath);
    return node;
  }

  getNodeChildrenObject(tree, node, sortType = 'name', order = 'asc') {
    let objects = tree.getNodeChildrenObject(node);
    objects = Utils.sortDirents(objects, sortType, order);
    return objects;
  }

  addNodeToParent(tree, node, parentNode) {
    let treeCopy = tree.clone();
    treeCopy.addNodeToParentNode(node, parentNode);
    return treeCopy;
  }

  addNodeListToParent(tree, nodeList, parentNode) {
    let treeCopy = tree.clone();
    treeCopy.addNodeListToParent(nodeList, parentNode);
    return treeCopy;
  }

  deleteNodeByPath(tree, nodePath) {
    let treeCopy = tree.clone();
    let node = treeCopy.getNodeByPath(nodePath);
    treeCopy.deleteNode(node);
    return treeCopy;
  }

  deleteNodeListByPaths(tree, nodePaths) {
    let treeCopy = tree.clone();
    nodePaths.forEach(nodePath => {
      let node = treeCopy.getNodeByPath(nodePath);
      treeCopy.deleteNode(node);
    });
    return treeCopy;
  }

  renameNodeByPath(tree, nodePath, newName) {
    let treeCopy = tree.clone();
    let node = treeCopy.getNodeByPath(nodePath);
    treeCopy.renameNode(node, newName);
    return treeCopy;
  }

  updateNodeByPath(tree, nodePath, keys, newValues) {
    let treeCopy = tree.clone();
    let node = treeCopy.getNodeByPath(nodePath);
    treeCopy.updateNode(node, keys, newValues);
    return treeCopy;
  }

  moveNodeByPath(tree, nodePath, destPath) {
    let treeCopy = tree.clone();
    let node = treeCopy.getNodeByPath(nodePath);
    let destNode = treeCopy.getNodeByPath(destPath);
    if (destNode) {
      treeCopy.moveNode(node, destNode);
    } else {
      treeCopy.deleteNode(node);
    }
    return treeCopy;
  }

  moveNodeListByPaths(tree, nodePaths, destPath) {
    let treeCopy = tree.clone();
    let destNode = treeCopy.getNodeByPath(destPath);
    nodePaths.forEach(nodePath => { 
      if (destNode) {
        let node = treeCopy.getNodeByPath(nodePath);
        treeCopy.moveNode(node, destNode);
      } else {
        treeCopy.delete(node);
      }
    });
    return treeCopy;
  }

  copyNodeByPath(tree, nodePath, destPath) {
    let treeCopy = tree.clone();
    let node = treeCopy.getNodeByPath(nodePath);
    let destNode = treeCopy.getNodeByPath(destPath);
    if (destNode) {
      treeCopy.copyNode(node, destNode);
    }
    return treeCopy;
  }
  
  copyNodeListByPaths(tree, nodePaths, destPath) {
    let treeCopy = tree.clone();
    let destNode = treeCopy.getNodeByPath(destPath);
    nodePaths.forEach(nodePath => {
      let node = treeCopy.getNodeByPath(nodePath);
      if (destNode) {
        treeCopy.copyNode(node, destNode);
      }
    });
    return treeCopy;
  }

}

let treeHelper = new TreeHelper();

export default treeHelper;
