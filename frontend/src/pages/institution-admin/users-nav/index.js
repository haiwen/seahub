import React from 'react';
import { Link } from '@gatsbyjs/reach-router';
import { siteRoot, gettext } from '../../../utils/constants';
import { getNavMessage } from '../utils';

const UsersNav = () => {
  const { username } = getNavMessage(window.location.href);

  return (
    <div>
      <div className="cur-view-path">
        <h3 className="sf-heading word-break-all"><Link className='sf-link' to={`${siteRoot}inst/useradmin/`}>{gettext('Users')}</Link>{username ? ' / ' + username : ''}</h3>
      </div>
    </div>
  );
};

export default UsersNav;
