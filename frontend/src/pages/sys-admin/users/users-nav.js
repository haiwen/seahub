import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@reach/router';
import { siteRoot, gettext, haveLDAP } from '../../../utils/constants';

const propTypes = {
  currentItem: PropTypes.string.isRequired
};

class Nav extends React.Component {

  constructor(props) {
    super(props);
    this.navItems = [
      {name: 'database', urlPart:'users-all', text: gettext('Database')}, 
      {name: 'admin', urlPart:'users-admin', text: gettext('Admin')}
    ];
    if (haveLDAP) {
      this.navItems.splice(1, 0, 
        {name: 'ldapimport', urlPart:'users-ldap-import', text: gettext('LDAP(imported)')}
      );
      this.navItems.splice(1, 0, 
        {name: 'ldap', urlPart:'users-ldap', text: gettext('LDAP')}
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
