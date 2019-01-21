import { Utils } from '../../utils/utils';
import Tree from './tree';
import TreeNode from './tree-node';

class TreeHelper {

  expandNode(tree, node) {  // This tree has been cloned
    tree.expandNode(node);
  }

  collapseNode(tree, node) {
    let treeCopy = tree.clone();
    node = treeCopy.getNodeByPath(node.path);
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
    tree.addNodeToParentNode(node, parentNode);
    return tree;
  }

  addNodeListToParent(tree, nodeList, parentNode) {
    tree.addNodeListToParent(nodeList, parentNode);
    return tree;
  }

  addNodeToParentByPath(tree, node, parentPath) {
    let treeCopy = tree.clone();
    let parentNode = treeCopy.getNodeByPath(parentPath);
    if (parentNode.hasExpanded()) {
      treeCopy.addNodeToParent(node, parentNode);
    }
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
    if (destNode && node) { // node has loaded
      treeCopy.moveNode(node, destNode);
    }
    if (!destNode && node){
      treeCopy.deleteNode(node);
    }
    return treeCopy;
  }

  moveNodeListByPaths(tree, nodePaths, destPath) {
    let treeCopy = tree.clone();
    let destNode = treeCopy.getNodeByPath(destPath);
    if (destNode) {
      nodePaths.forEach(nodePath => { 
        let node = treeCopy.getNodeByPath(nodePath);
        treeCopy.moveNode(node, destNode);
      })
    } else {
      nodePaths.forEach(nodePath=> {
        let node = treeCopy.getNodeByPath(nodePath);
        treeCopy.delete(node);
      });
    }
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
    if (destNode) {
      nodePaths.forEach(nodePath => {
        let node = treeCopy.getNodeByPath(nodePath);
          treeCopy.copyNode(node, destNode);
        });
    }
    return treeCopy;
  }

  parseDirentListToTree(direntList) {
    let tree = new Tree();
    let object = {name: '/'};
    let root = new TreeNode({object, isLoaded: true, isExpanded: true});
    tree.setRoot(root);

    let nodeList = direntList.map(dirent => {
      let object = dirent;
      return new TreeNode({object});
    });

    return this.addNodeListToParent(tree, nodeList, root);
  }

}

let treeHelper = new TreeHelper();

export default treeHelper;
