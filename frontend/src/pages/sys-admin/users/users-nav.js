import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import { siteRoot, gettext, haveLDAP, isDefaultAdmin } from '../../../utils/constants';
import SortMenu from '../../../components/sort-menu';

const propTypes = {
  currentItem: PropTypes.string.isRequired,
  sortBy: PropTypes.string,
  sortOrder: PropTypes.string,
  sortItems: PropTypes.func
};

class Nav extends React.Component {

  constructor(props) {
    super(props);
    this.navItems = [
      { name: 'database', urlPart: 'users', text: gettext('Database') }
    ];
    if (haveLDAP) {
      this.navItems.push(
        { name: 'ldap', urlPart: 'users/ldap', text: gettext('LDAP') },
        { name: 'ldap-imported', urlPart: 'users/ldap-imported', text: gettext('LDAP(imported)') }
      );
    }
    if (isDefaultAdmin) {
      this.navItems.push(
        { name: 'admin', urlPart: 'users/admins', text: gettext('Admin') }
      );
    }

    this.sortOptions = [
      { value: 'quota_usage-asc', text: gettext('Ascending by space used') },
      { value: 'quota_usage-desc', text: gettext('Descending by space used') }
    ];
  }

  onSelectSortOption = (item) => {
    const [sortBy, sortOrder] = item.value.split('-');
    this.props.sortItems(sortBy, sortOrder);
  };

  render() {
    const { currentItem, sortBy, sortOrder } = this.props;
    const showSortIcon = currentItem == 'database' || currentItem == 'ldap-imported';
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
        {showSortIcon &&
          <SortMenu
            sortBy={sortBy}
            sortOrder={sortOrder}
            sortOptions={this.sortOptions}
            onSelectSortOption={this.onSelectSortOption}
          />
        }
      </div>
    );
  }
}

Nav.propTypes = propTypes;

export default Nav;
