import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import { siteRoot, gettext, isPro } from '../../../utils/constants';

const propTypes = {
  currentItem: PropTypes.string.isRequired
};

class Nav extends React.Component {

  constructor(props) {
    super(props);
    this.navItems = [
      {name: 'desktop', urlPart:'desktop-devices', text: gettext('Desktop')},
      {name: 'mobile', urlPart:'mobile-devices', text: gettext('Mobile')}
    ];
    if (isPro) {
      this.navItems.push({name: 'errors', urlPart:'device-errors', text: gettext('Errors')});
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
