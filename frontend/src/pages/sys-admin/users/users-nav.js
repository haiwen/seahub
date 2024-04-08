import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import { siteRoot, gettext, haveLDAP, isDefaultAdmin } from '../../../utils/constants';

const propTypes = {
  currentItem: PropTypes.string.isRequired
};

class Nav extends React.Component {

  constructor(props) {
    super(props);
    this.navItems = [
      {name: 'database', urlPart: 'users', text: gettext('Database')}
    ];
    if (haveLDAP) {
      this.navItems.push(
        {name: 'ldap', urlPart: 'users/ldap', text: gettext('LDAP')},
        {name: 'ldap-imported', urlPart: 'users/ldap-imported', text: gettext('LDAP(imported)')}
      );
    }
    if (isDefaultAdmin) {
      this.navItems.push(
        {name: 'admin', urlPart: 'users/admins', text: gettext('Admin')}
      );
    }
  }

  render() {
    const { currentItem } = this.props;
    return (
      <div className="cur-view-path tab-nav-container">
        <ul className="nav">
          {this.navItems.map((item, index) => {
            return (
              <li className="nav-item" key={index}>
                <Link to={`${siteRoot}sys/${item.urlPart}/`} className={`nav-link${currentItem == item.name ? ' active' : ''}`}>{item.text}</Link>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
}

Nav.propTypes = propTypes;

export default Nav;
