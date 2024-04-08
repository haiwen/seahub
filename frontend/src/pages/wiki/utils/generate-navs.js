class TreeNode {

  constructor({ name, href, parentNode }) {
    this.name = name;
    this.href = href;
    this.parentNode = parentNode || null;
    this.children = [];
  }

  setParent(parentNode) {
    this.parentNode = parentNode;
  }

  addChildren(nodeList) {
    // nodeList.forEach((node) => {
    //   node.setParent(this);
    // });
    this.children = nodeList;
  }
}

const setNodePath = (node, parentNodePath) => {
  let name = node.name;
  let path = parentNodePath === '/' ? parentNodePath + name : parentNodePath + '/' + name;
  node.path = path;
  if (node.children.length > 0) {
    node.children.forEach(child => {
      setNodePath(child, path);
    });
  }
};

// translate slate_paragraph_node to treeNode
const transParagraph = (paragraphNode) => {
  let treeNode;
  if (paragraphNode.children[1] && paragraphNode.children[1].type === 'link') {
    // paragraph node is a link node
    const linkNode = paragraphNode.children[1];
    const textNode = linkNode.children[0];
    const name = textNode ? textNode.text : '';
    treeNode = new TreeNode({ name: name, href: linkNode.url });
  } else if (paragraphNode.children[0]) {
    // paragraph first child node is a text node, then get node name
    const textNode = paragraphNode.children[0];
    const name = textNode.text ? textNode.text : '';
    treeNode = new TreeNode({ name: name, href: '' });
  } else {
    treeNode = new TreeNode({ name: '', href: '' });
  }
  return treeNode;
};

// slateNodes is list items of an unordered list or ordered list, translate them to treeNode and add to parentTreeNode
const transSlateToTree = (slateNodes, parentTreeNode) => {
  let treeNodes = slateNodes.map((slateNode) => {
    // item has children(unordered list)
    if (slateNode.children.length === 2 && (slateNode.children[1].type === 'unordered_list' || slateNode.children[1].type === 'ordered_list')) {
      // slateNode.nodes[0] is paragraph, create TreeNode, set name and href
      const paragraphNode = slateNode.children[0];
      const treeNode = transParagraph(paragraphNode);
      // slateNode.nodes[1] is list, set it as TreeNode's children
      const listNode = slateNode.children[1];
      // Add sub list items to the tree node
      return transSlateToTree(listNode.children, treeNode);
    } else {
      // item doesn't have children list
      if (slateNode.children[0] && (slateNode.children[0].type === 'paragraph')) {
        return transParagraph(slateNode.children[0]);
      } else {
        // list item contain table/code_block/blockqupta
        return new TreeNode({ name: '', href: '' });
      }
    }
  });
  parentTreeNode.addChildren(treeNodes);
  return parentTreeNode;
};

export const generateNavItems = (slateNodes) => {
  let treeRoot = new TreeNode({ name: '', href: '' });
  slateNodes.forEach((node) => {
    if (node.type === 'unordered_list' || node.type === 'ordered_list') {
      treeRoot = transSlateToTree(node.children, treeRoot);
      setNodePath(treeRoot, '/');
    }
  });
  return treeRoot;
};



