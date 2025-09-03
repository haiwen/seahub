
export const addDataToTree = (treeData, indexId, childrenData, path) => {
  for (let i = 0; i < treeData.length; i ++) {
    if (treeData[i].indexId === indexId) {
      treeData[i].children = childrenData;
      treeData[i].children.forEach((child) => {
        child.path = path + `/${child.name}`;
      });
      break;
    }

    if (treeData[i]?.children) {
      addDataToTree(treeData[i]?.children, indexId, childrenData, path);
    }
  }
  return treeData;
};
