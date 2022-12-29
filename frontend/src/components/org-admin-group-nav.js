import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import { siteRoot, gettext } from '../utils/constants';

const propTypes = {
  groupID: PropTypes.string.isRequired,
  currentItem: PropTypes.string.isRequired
};

class OrgAdminGroupNav extends React.Component {

  render() {
    const { groupID, currentItem } = this.props;
    const urlBase = `${siteRoot}org/groupadmin/${groupID}/`;
    return (
      <div className="cur-view-path org-admin-user-nav">
        <ul className="nav">
          <li className="nav-item">
            <Link to={urlBase} className={`nav-link${currentItem == 'info' ? ' active' : ''}`}>{gettext('Group Info')}</Link>
          </li>
          <li className="nav-item">
            <Link to={`${urlBase}repos/`} className={`nav-link${currentItem == 'repos' ? ' active' : ''}`}>{gettext('Libraries')}</Link>
          </li>
          <li className="nav-item">
            <Link to={`${urlBase}members/`} className={`nav-link${currentItem == 'members' ? ' active' : ''}`}>{gettext('Members')}</Link>
          </li>
        </ul>
      </div>
    );
  }
}

OrgAdminGroupNav.propTypes = propTypes;

export default OrgAdminGroupNav;
