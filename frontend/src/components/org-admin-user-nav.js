import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import { siteRoot, gettext } from '../utils/constants';

const propTypes = {
  email: PropTypes.string.isRequired,
  currentItem: PropTypes.string.isRequired
};

class OrgAdminUserNav extends React.Component {

  render() {
    const { email, currentItem } = this.props;
    const urlBase = `${siteRoot}org/useradmin/info/${encodeURIComponent(email)}/`;
    return (
      <div className="cur-view-path org-admin-user-nav">
        <ul className="nav">
          <li className="nav-item">
            <Link to={urlBase} className={`nav-link${currentItem == 'profile' ? ' active' : ''}`}>{gettext('Profile')}</Link>
          </li>
          <li className="nav-item">
            <Link to={`${urlBase}repos/`} className={`nav-link${currentItem == 'owned-repos' ? ' active' : ''}`}>{gettext('Owned Libraries')}</Link>
          </li>
          <li className="nav-item">
            <Link to={`${urlBase}shared-repos/`} className={`nav-link${currentItem == 'shared-repos' ? ' active' : ''}`}>{gettext('Shared Libraries')}</Link>
          </li>
        </ul>
      </div>
    );
  }
}

OrgAdminUserNav.propTypes = propTypes;

export default OrgAdminUserNav;
