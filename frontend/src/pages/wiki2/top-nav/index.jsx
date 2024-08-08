import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import NavItemIcon from '../common/nav-item-icon';
import CustomIcon from '../custom-icon';

import './index.css';

// Find the path array from the root to the leaf based on the currentPageId (leaf)
function getPaths(navigation, currentPageId, pages) {
  let idPageMap = {};
  pages.forEach(page => idPageMap[page.id] = page);
  navigation.forEach(item => {
    if (!idPageMap[item.id]) {
      idPageMap[item.id] = item;
    }
  });
  let pathStr = null;
  function runNode(node) {
    const newPath = node._path ? (node._path + '-' + node.id) : node.id;
    if (node.id === currentPageId) {
      pathStr = newPath;
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
  return pathStr.split('-').map(id => idPageMap[id]);
}

function WikiTopNav({ config, currentPageId }) {
  const { navigation, pages } = config;
  const paths = getPaths(navigation, currentPageId, pages);

  return (
    <div className="wiki2-top-nav d-flex">
      {paths.map((item, index) => {
        return (
          <Fragment key={item.id}>
            <div className='wiki2-top-nav-item d-flex'>
              {item.icon ? <CustomIcon icon={item.icon} /> : <NavItemIcon symbol={'file'} disable={true} />}
              <span className='text-truncate'>{item.name}</span>
            </div>
            {index !== paths.length - 1 && <div>/</div>}
          </Fragment>
        );
      })}
    </div>
  );
}

WikiTopNav.propTypes = {
  config: PropTypes.object,
  currentPageId: PropTypes.string,
};

export default WikiTopNav;
