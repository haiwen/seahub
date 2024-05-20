import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import { gettext, siteRoot } from '../../../utils/constants';

const NAV_ITEMS = [
  {name: 'info', urlPart: '', text: gettext('Info')},
  {name: 'owned-repos', urlPart: 'owned-libraries', text: gettext('Owned Libraries')},
  {name: 'groups', urlPart: 'groups', text: gettext('Groups')}
];

const UserContent = ({ children, ...rest }) => {
  const nav = rest['*'];
  const username = rest.email;
  return (
    <>
      <ul className="nav border-bottom mx-4">
        {NAV_ITEMS.map((item, index) => {
          return (
            <li className="nav-item mr-2" key={index}>
              <Link to={`${siteRoot}inst/useradmin/${encodeURIComponent(username)}/${item.urlPart}`} className={`nav-link ${nav == item.urlPart ? ' active' : ''}`}>{item.text}</Link>
            </li>
          );
        })}
      </ul>
      <div className="cur-view-content">
        {children}
      </div>
    </>
  );
};

UserContent.propTypes = {
  children: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
};

export default UserContent;