import { serviceURL, mediaUrl } from '../../../utils/constants';
import { generatorBase64Code } from '../../../utils/utils';

const generateUniqueId = (navigation = [], length = 4) => {
  let idMap = {};
  function recurseItem(item) {
    if (!item) return;
    idMap[item.id] = true;
    if (Array.isArray(item.children)) {
      item.children.forEach(item => {
        recurseItem(item);
      });
    }
  }
  navigation.forEach(item => recurseItem(item));

  let _id = generatorBase64Code(length);
  while (idMap[_id]) {
    _id = generatorBase64Code(length);
  }
  return _id;
};

const isObjectNotEmpty = (obj) => {
  return obj && Object.keys(obj).length > 0;
};

const getIconURL = (repoId, fileName) => {
  if (!fileName) {
    return null;
  }
  if (fileName === 'default') {
    return `${mediaUrl}img/wiki/default.png`;
  }
  return serviceURL + '/lib/' + repoId + '/file/_Internal/Wiki/Icon/' + fileName + '?raw=1';
};

const getCurrentPageConfig = (pages, pageId) => {
  return pages.filter(page => page.id === pageId)[0];
};

const getWikPageLink = (pageId) => {
  let { origin, pathname } = window.location;
  let pathArr = pathname.split('/');
  // pathname is like `/wikis/${wikiId}/{pageId}/`
  pathArr[3] = pageId;
  pathname = pathArr.join('/');
  return `${origin}${pathname}`;
};

const throttle = (fn, delay) => {
  let timer;
  return function () {
    let _this = this;
    let args = arguments;
    if (timer) {
      return;
    }
    timer = setTimeout(function () {
      fn.apply(_this, args);
      timer = null;
    }, delay);
  };
};

// Find the path array from the root to the leaf based on the currentPageId (leaf)
const getPaths = (navigation, currentPageId, pages, isGetPathStr) => {
  let idPageMap = {};
  pages.forEach(page => idPageMap[page.id] = page);
  navigation.forEach(item => {
    if (!idPageMap[item.id]) {
      idPageMap[item.id] = item;
    }
  });
  let pathStr = null;
  let curNode = null;
  function runNode(node) {
    const newPath = node._path ? (node._path + '-' + node.id) : node.id;
    if (node.id === currentPageId) {
      pathStr = newPath;
      curNode = node;
      return;
    }
    if (node.children) {
      node.children.forEach(child => {
        if (child) {
          child._path = newPath;
          runNode(child);
        }
      });
    }
  }
  let root = {};
  root.id = '';
  root._path = '';
  root.children = navigation;
  runNode(root);
  if (!pathStr) return [];
  if (isGetPathStr) return {
    paths: pathStr,
    curNode
  };
  const pathIds = pathStr.split('-');
  const result = [];
  for (const id of pathIds) {
    const page = idPageMap[id];
    if (!page) return result;
    result.push(page);
  }
  return result;
};

const getNamePaths = (config, pageId) => {
  const { navigation, pages } = config;
  const { paths, curNode } = getPaths(navigation, pageId, pages, true);
  if (!paths || !curNode) {
    return { path: null, isDir: false };
  }
  const pathArr = paths.split('-');
  const nameArr = [];
  if (pathArr.length > 1) {
    pathArr.forEach(pid => {
      const page = pages.find((item) => item.id === pid);
      if (page) {
        const { name } = page;
        nameArr.push(name);
      }
    });
  }
  return {
    path: nameArr.length === 0 ? '' : nameArr.slice(0, -1).join(' / '),
    isDir: curNode?.children?.length ? true : false
  };
};

const isPageInSubtree = (navigation, targetPageId, currentPageId) => {
  let found = false;
  function traverse(node) {
    if (node.id === targetPageId) {
      function checkSubtree(subNode) {
        if (subNode.id === currentPageId) {
          found = true;
          return;
        }
        if (subNode.children) {
          subNode.children.forEach(child => {
            if (child) checkSubtree(child);
          });
        }
      }
      checkSubtree(node);
      return;
    }
    if (node.children) {
      node.children.forEach(child => {
        if (child) traverse(child);
      });
    }
  }
  navigation.forEach(item => traverse(item));
  return found;
};

export {
  generatorBase64Code,
  generateUniqueId,
  isObjectNotEmpty,
  getIconURL,
  getCurrentPageConfig,
  getWikPageLink,
  throttle,
  getPaths,
  getNamePaths,
  isPageInSubtree
};
