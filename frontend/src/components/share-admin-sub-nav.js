import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import {
  gettext, siteRoot, canAddRepo, canShareRepo, canGenerateShareLink, canGenerateUploadLink
} from '../utils/constants';

const propTypes = {
  currentTab: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  tabItemClick: PropTypes.func.isRequired,
};

const NAV_ITEMS = [
  {
    id: 'share-admin-libs',
    title: gettext('Libraries'),
    path: 'share-admin-libs/',
    showCondition: () => canAddRepo && canShareRepo,
  },
  {
    id: 'share-admin-folders',
    title: gettext('Folders'),
    path: 'share-admin-folders/',
    showCondition: () => canShareRepo,
  },
  {
    id: 'share-admin-share-links',
    title: gettext('Links'),
    path: 'share-admin-share-links/',
    showCondition: () => canGenerateShareLink,
  },
  {
    id: 'share-admin-upload-links',
    title: gettext('Links'),
    path: 'share-admin-upload-links/',
    showCondition: () => !canGenerateShareLink && canGenerateUploadLink,
  },
];

const ShareAdminSubNav = ({ currentTab, tabItemClick }) => {

  const getActiveClass = (tab) => {
    return currentTab === tab ? 'active' : '';
  };

  const handleTabClick = (e, id) => {
    tabItemClick(e, id);
  };

  const renderNavItem = (navItem) => {
    const { id, title, path } = navItem;
    const activeClass = getActiveClass(id);

    return (
      <li key={id} className={`nav-item ${activeClass}`}>
        <Link
          to={`${siteRoot}${path}`}
          className={`nav-link ellipsis ${activeClass}`}
          title={title}
          onClick={(e) => handleTabClick(e, id)}
        >
          <span aria-hidden="true" className="sharp">#</span>
          <span className="nav-text">{title}</span>
        </Link>
      </li>
    );
  };

  return (
    <>
      {NAV_ITEMS.filter(item => item.showCondition()).map(renderNavItem)}
    </>
  );
};

ShareAdminSubNav.propTypes = propTypes;

export default ShareAdminSubNav;
