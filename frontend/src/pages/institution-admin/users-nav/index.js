import React from 'react';
import PropTypes from 'prop-types';
import { Link, useMatch } from '@gatsbyjs/reach-router';
import { siteRoot, gettext } from '../../../utils/constants';

const propTypes = {
  username: PropTypes.string,
  currentNav: PropTypes.string,
  onNavClick: PropTypes.func,
};

const NAV_ITEMS = [
  {name: 'info', urlPart: '', text: gettext('Info')},
  {name: 'owned-repos', urlPart: 'owned-libraries', text: gettext('Owned Libraries')},
  {name: 'groups', urlPart: 'groups', text: gettext('Groups')}
];

const UsersNav = () => {
  const match1 = useMatch('/inst/useradmin/:email/');
  const match2 = useMatch('/inst/useradmin/:email/:nav');
  let username = '';
  let nav = '';
  if (match1) {
    username = match1.email;
  }
  if (match2) {
    username = decodeURIComponent(match2.email);
    nav = match2.nav;
  }

  return (
    <div>
      <div className="cur-view-path">
        <h3 className="sf-heading"><Link className='sf-link' to={`${siteRoot}inst/useradmin/`}>{gettext('Users')}</Link>{username ? ' / ' + username : ''}</h3>
      </div>
      {username && (
        <ul className="nav border-bottom mx-4">
          {NAV_ITEMS.map((item, index) => {
            return (
              <li className="nav-item mr-2" key={index}>
                <Link to={`${siteRoot}inst/useradmin/${encodeURIComponent(username)}/${item.urlPart}`} className={`nav-link ${nav == item.urlPart ? ' active' : ''}`}>{item.text}</Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

UsersNav.propTypes = propTypes;

export default UsersNav;
