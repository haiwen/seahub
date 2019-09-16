import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@reach/router';
import { siteRoot, gettext } from '../../../utils/constants';

const propTypes = {
  currentItem: PropTypes.string.isRequired
};

class Nav extends React.Component {

  constructor(props) {
    super(props);
    this.navItems = [
      {name: 'users', urlPart: 'organization/' + this.props.orgID + '/users', text: gettext('Members')},
      {name: 'groups', urlPart: 'organization/' + this.props.orgID + '/groups', text: gettext('Groups')},
      {name: 'repos', urlPart: 'organization/' + this.props.orgID + '/libraries', text: gettext('Libraries')},
      //{name: 'traffic', urlPart: 'organization/' + this.props.orgID + '/traffic', text: gettext('traffic')},
      {name: 'settings', urlPart: 'organization/' + this.props.orgID + '/settings', text: gettext('Settings')}
    ];
  }

  render() {
    const { currentItem } = this.props;
    return (
      <div className="cur-view-path tab-nav-container">
        <ul className="nav">
          {this.navItems.map((item, index) => {
            return (
              <li className="nav-item" key={index}>
                <Link to={`${siteRoot}sys/${item.urlPart}/`} className={`nav-link ${currentItem == item.name ? ' active' : ''}`}>{item.text}</Link>
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
