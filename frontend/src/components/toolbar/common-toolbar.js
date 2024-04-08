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
  searchPlaceholder: PropTypes.string,
  currentRepoInfo: PropTypes.object,
};

class CommonToolbar extends React.Component {

  renderSearch = () => {
    const { repoID, repoName, isLibView, searchPlaceholder } = this.props;
    const placeholder = searchPlaceholder || gettext('Search files');

    if (isPro) {
      if (enableSeafileAI && isLibView) {
        return (
          <AISearch
            repoID={repoID}
            placeholder={placeholder}
            onSearchedClick={this.props.onSearchedClick}
            repoName={repoName}
            currentRepoInfo={this.props.currentRepoInfo}
          />
        );
      } else {
        return (
          <Search
            repoID={repoID}
            placeholder={placeholder}
            onSearchedClick={this.props.onSearchedClick}
            isPublic={false}
          />
        );
      }
    } else {
      if (isLibView) {
        return (
          <SearchByName repoID={repoID} repoName={repoName} />
        );
      }
      return null;
    }
  };

  render() {
    return (
      <div className="common-toolbar">
        {this.renderSearch()}
        <Notification />
        <Account />
        {showLogoutIcon && (<Logout />)}
      </div>
    );
  }
}

CommonToolbar.propTypes = propTypes;

export default CommonToolbar;
