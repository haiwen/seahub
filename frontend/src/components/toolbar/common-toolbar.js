import React from 'react';
import PropTypes from 'prop-types';
import { isPro, gettext, showLogoutIcon } from '../../utils/constants';
import Search from '../search/search';
import SearchByName from '../search/search-by-name';
import Notification from '../common/notification';
import Account from '../common/account';
import Logout from '../common/logout';

const propTypes = {
  repoID: PropTypes.string,
  repoName: PropTypes.string,
  isLibView: PropTypes.bool,
  onSearchedClick: PropTypes.func.isRequired,
  searchPlaceholder: PropTypes.string
};

class CommonToolbar extends React.Component {

  render() {
    const { repoID, repoName } = this.props;
    return (
      <div className="common-toolbar">
        {isPro && (
          <Search
            repoID={repoID}
            placeholder={this.props.searchPlaceholder || gettext('Search files')}
            onSearchedClick={this.props.onSearchedClick}
            isLibView={this.props.isLibView}
            repoName={repoName}
          />
        )}
        {this.props.isLibView && !isPro &&
          <SearchByName
            repoID={repoID}
            repoName={repoName}
          />
        }
        <Notification />
        <Account />
        {showLogoutIcon && (<Logout />)}
      </div>
    );
  }
}

CommonToolbar.propTypes = propTypes;

export default CommonToolbar;
