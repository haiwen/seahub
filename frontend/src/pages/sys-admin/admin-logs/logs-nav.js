import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import { siteRoot, gettext } from '../../../utils/constants';

const propTypes = {
  currentItem: PropTypes.string.isRequired
};

class LogsNav extends React.Component {

  constructor(props) {
    super(props);
    this.navItems = [
      { name: 'operation', urlPart: 'admin-logs/operation', text: gettext('Admin Operation Logs') },
      { name: 'login', urlPart: 'admin-logs/login', text: gettext('Admin Login Logs') },
    ];
    this.itemRefs = [];
    this.itemWidths = [];
  }

  componentDidMount() {
    this.itemWidths = this.itemRefs.map(ref => ref?.offsetWidth || 0);
  }

  render() {
    const { currentItem } = this.props;
    const activeIndex = this.navItems.findIndex(item => item.name === currentItem) || 0;
    const indicatorWidth = this.itemWidths[activeIndex] || 167;
    const indicatorOffset = this.itemWidths.slice(0, activeIndex).reduce((prev, cur) => prev + cur, 0);
    return (
      <div className="cur-view-path tab-nav-container">
        <ul
          className="nav nav-indicator-container position-relative"
          style={{
            '--indicator-width': `${indicatorWidth}px`,
            '--indicator-offset': `${indicatorOffset}px`
          }}
        >
          {this.navItems.map((item, index) => {
            return (
              <li
                className="nav-item"
                key={index}
                ref={el => this.itemRefs[index] = el}
              >
                <Link to={`${siteRoot}sys/${item.urlPart}/`} className={`nav-link${currentItem == item.name ? ' active' : ''}`}>{item.text}</Link>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
}

LogsNav.propTypes = propTypes;

export default LogsNav;
