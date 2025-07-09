import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import { siteRoot, gettext } from '../../../utils/constants';
import { NAV_ITEM_MARGIN } from '../../../constants';

const propTypes = {
  email: PropTypes.string,
  userName: PropTypes.string,
  currentItem: PropTypes.string.isRequired
};

class Nav extends React.Component {

  constructor(props) {
    super(props);
    this.navItems = [
      { name: 'info', urlPart: '', text: gettext('Info') },
      { name: 'owned-repos', urlPart: 'owned-libraries', text: gettext('Owned Libraries') },
      { name: 'shared-repos', urlPart: 'shared-libraries', text: gettext('Shared Libraries') },
      { name: 'links', urlPart: 'shared-links', text: gettext('Shared Links') },
      { name: 'groups', urlPart: 'groups', text: gettext('Groups') }
    ];
    this.itemRefs = [];
  }

  componentDidMount() {
    this.forceUpdate();
  }

  render() {
    const { currentItem, email, userName } = this.props;
    const activeIndex = this.navItems.findIndex(item => item.name === currentItem) || 0;
    const itemWidths = this.itemRefs.map(ref => ref?.offsetWidth);
    const indicatorWidth = itemWidths[activeIndex];
    const indicatorOffset = itemWidths.slice(0, activeIndex).reduce((a, b) => a + b, 0) + (2 * activeIndex + 1) * NAV_ITEM_MARGIN;
    return (
      <div>
        <div className="cur-view-path">
          <h3 className="sf-heading"><Link to={`${siteRoot}sys/users/`}>{gettext('Users')}</Link> / {userName}</h3>
        </div>
        <ul
          className="nav nav-indicator-container position-relative mx-4"
          style={{
            '--indicator-width': `${indicatorWidth}px`,
            '--indicator-offset': `${indicatorOffset}px`
          }}
        >
          {this.navItems.map((item, index) => {
            return (
              <li
                className="nav-item mx-3"
                key={index}
                ref={el => this.itemRefs[index] = el}
              >
                <Link to={`${siteRoot}sys/user/${encodeURIComponent(email)}/${item.urlPart}`} className={`nav-link m-0 ${currentItem == item.name ? ' active' : ''}`}>{item.text}</Link>
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
