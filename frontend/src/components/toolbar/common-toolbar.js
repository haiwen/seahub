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
  path: PropTypes.string,
  repoName: PropTypes.string,
  isLibView: PropTypes.bool,
  onSearchedClick: PropTypes.func,
  searchPlaceholder: PropTypes.string,
  currentRepoInfo: PropTypes.object,
  isViewFile: PropTypes.bool,
  showSearch: PropTypes.bool
};

class CommonToolbar extends React.Component {

  renderSearch = () => {
    const { repoID, repoName, isLibView, searchPlaceholder, path, isViewFile } = this.props;
    const placeholder = searchPlaceholder || gettext('Search files');

    if (isPro) {
      if (enableSeafileAI) {
        return (
          <AISearch
            repoID={repoID}
            path={path}
            isViewFile={isViewFile}
            placeholder={placeholder}
            onSearchedClick={this.props.onSearchedClick}
            repoName={repoName}
            currentRepoInfo={this.props.currentRepoInfo}
            isLibView={isLibView}
          />
        );
      } else {
        return (
          <Search
            repoID={repoID}
            placeholder={placeholder}
            onSearchedClick={this.props.onSearchedClick}
            isViewFile={isViewFile}
            isPublic={false}
            path={path}
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
    const { showSearch = true } = this.props;
    return (
      <div className="common-toolbar">
        {showSearch && this.renderSearch()}
        <Notification />
        <Account />
        {showLogoutIcon && (<Logout />)}
      </div>
    );
  }
}

CommonToolbar.propTypes = propTypes;

export default CommonToolbar;
