import React from 'react';
import PropTypes from 'prop-types';
import { isPro, gettext, showLogoutIcon } from '../../utils/constants';
import Search from '../search/search';
import Notification from '../common/notification';
import Account from '../common/account';
import Logout from '../common/logout';

const propTypes = {
  repoID: PropTypes.string,
  onSearchedClick: PropTypes.func.isRequired,
  searchPlaceholder: PropTypes.string
};

class  CommonToolbar extends React.Component {
  render() {
    let searchPlaceholder = this.props.searchPlaceholder || gettext('Search Files');
    return (
      <div className="common-toolbar">
        {isPro && (
          <Search 
            repoID={this.props.repoID}
            placeholder={searchPlaceholder}
            onSearchedClick={this.props.onSearchedClick} 
          />
        )}
        <Notification  />
        <Account />
        {showLogoutIcon && (<Logout />)}
      </div>
    );
  }
}

CommonToolbar.propTypes = propTypes;

export default CommonToolbar;