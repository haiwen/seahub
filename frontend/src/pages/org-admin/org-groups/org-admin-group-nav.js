import React from 'react';
import { Link } from '@gatsbyjs/reach-router';
import PropTypes from 'prop-types';
import { siteRoot, gettext } from '@/utils/constants';

const propTypes = {
  groupID: PropTypes.string,
  currentItem: PropTypes.string.isRequired
};

class OrgAdminGroupNav extends React.Component {

  render() {
    const { groupID, currentItem } = this.props;
    const urlBase = `${siteRoot}org/groupadmin/${groupID}/`;
    return (
      <div className="cur-view-path org-admin-user-nav">
        <ul className="nav gap-6">
          <li className="nav-item">
            <Link to={urlBase} className={`nav-link m-0${currentItem == 'info' ? ' active' : ''}`}>{gettext('Group info')}</Link>
          </li>
          <li className="nav-item">
            <Link to={`${urlBase}repos/`} className={`nav-link m-0${currentItem == 'repos' ? ' active' : ''}`}>{gettext('Libraries')}</Link>
          </li>
          <li className="nav-item">
            <Link to={`${urlBase}members/`} className={`nav-link m-0${currentItem == 'members' ? ' active' : ''}`}>{gettext('Members')}</Link>
          </li>
        </ul>
      </div>
    );
  }
}

OrgAdminGroupNav.propTypes = propTypes;

export default OrgAdminGroupNav;
