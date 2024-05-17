import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import { siteRoot, gettext } from '../../../utils/constants';
import { getNavMessage } from '../utils';

const propTypes = {
  username: PropTypes.string,
  currentNav: PropTypes.string,
  onNavClick: PropTypes.func,
};

const UsersNav = () => {
  const { username } = getNavMessage(window.location.href);

  return (
    <div>
      <div className="cur-view-path">
        <h3 className="sf-heading"><Link className='sf-link' to={`${siteRoot}inst/useradmin/`}>{gettext('Users')}</Link>{username ? ' / ' + username : ''}</h3>
      </div>
    </div>
  );
};

UsersNav.propTypes = propTypes;

export default UsersNav;
