import React from 'react';
import PropTypes from 'prop-types';
import NavItemIcon from '../view-structure/nav-item-icon';
import './index.css';

function WikiTopNav({ config, currentPageId }) {
  const { navigation, pages } = config;
  const folder = navigation.find(item => {
    return item.type === 'folder' && item.children && item.children.find(item => item.id === currentPageId);
  });
  const page = pages.find(page => page.id === currentPageId);
  return (
    <div className="wiki2-top-nav d-flex">
      {folder &&
        <>
          <div className='wiki2-top-nav-item d-flex'>
            <NavItemIcon symbol={'wiki-folder'} disable={true} />
            {folder.name}
          </div>
          <div>/</div>
        </>
      }
      {page &&
        <div className='wiki2-top-nav-item d-flex'>
          <NavItemIcon symbol={'file'} disable={true} />
          {page.name}
        </div>
      }
    </div>
  );
}

WikiTopNav.propTypes = {
  config: PropTypes.object,
  currentPageId: PropTypes.string,
};

export default WikiTopNav;
