import React from 'react';
import PropTypes from 'prop-types';
import { isPro, gettext, showLogoutIcon, enableSeafileAI } from '../../utils/constants';
import Search from '../search/search';
import AISearch from '../search/ai-search';
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
    const { repoID, repoName, isLibView } = this.props;
    return (
      <div className="common-toolbar">
        {isPro && !(enableSeafileAI && isLibView) &&(
          <Search
            repoID={repoID}
            placeholder={this.props.searchPlaceholder || gettext('Search files')}
            onSearchedClick={this.props.onSearchedClick}
            isPublic={false}
          />
        )}
        {isPro && enableSeafileAI && isLibView && (
          <AISearch
            repoID={repoID}
            placeholder={this.props.searchPlaceholder || gettext('Search files')}
            onSearchedClick={this.props.onSearchedClick}
            repoName={repoName}
          />
        )}
        {!isPro && isLibView &&
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
