import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import { siteRoot, gettext } from '../../../utils/constants';
import { NAV_ITEM_MARGIN } from '../../../constants';

const propTypes = {
  currentItem: PropTypes.string.isRequired
};

class Nav extends React.Component {

  constructor(props) {
    super(props);
    this.navItems = [
      { name: 'loginLogs', urlPart: 'logs/login', text: gettext('Login') },
      { name: 'fileAccessLogs', urlPart: 'logs/file-access', text: gettext('File Access') },
      { name: 'fileUpdateLogs', urlPart: 'logs/file-update', text: gettext('File Update') },
      { name: 'sharePermissionLogs', urlPart: 'logs/share-permission', text: gettext('Permission') },
      { name: 'fileTransfer', urlPart: 'logs/repo-transfer', text: gettext('Repo Transfer') },
      { name: 'groupMember', urlPart: 'logs/group-member-audit', text: gettext('Group Member') },
    ];
    this.itemRefs = [];
  }

  componentDidMount() {
    this.forceUpdate();
  }

  render() {
    const { currentItem } = this.props;
    const activeIndex = this.navItems.findIndex(item => item.name === currentItem) || 0;
    const itemWidths = this.itemRefs.map(ref => ref?.offsetWidth);
    const indicatorWidth = itemWidths[activeIndex];
    const leftOffset = itemWidths.slice(0, activeIndex).reduce((prev, cur) => prev + cur, 0) + (2 * activeIndex + 1) * NAV_ITEM_MARGIN;
    return (
      <div className="cur-view-path tab-nav-container">
        <ul
          className="nav nav-indicator-container position-relative"
          style={{
            '--indicator-width': `${indicatorWidth}px`,
            '--indicator-offset': `${leftOffset}px`
          }}
        >
          {this.navItems.map((item, index) => {
            return (
              <li
                className="nav-item mx-3"
                key={index}
                ref={el => this.itemRefs[index] = el}
              >
                <Link to={`${siteRoot}sys/${item.urlPart}/`} className={`m-0 nav-link${currentItem == item.name ? ' active' : ''}`}>{item.text}</Link>
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
