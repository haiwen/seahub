import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import { siteRoot, gettext } from '../../../utils/constants';

const propTypes = {
  currentItem: PropTypes.string.isRequired
};

class Nav extends React.Component {

  constructor(props) {
    super(props);
    this.navItems = [
      {name: 'fileStatistic', urlPart: 'statistics/file', text: gettext('File')},
      {name: 'storageStatistic', urlPart: 'statistics/storage', text: gettext('Storage')},
      {name: 'usersStatistic', urlPart: 'statistics/user', text: gettext('Users')},
      {name: 'trafficStatistic', urlPart: 'statistics/traffic', text: gettext('Traffic')},
      {name: 'reportsStatistic', urlPart: 'statistics/reports', text: gettext('Reports')},
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
