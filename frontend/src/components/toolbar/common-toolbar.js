import React from 'react';
import PropTypes from 'prop-types';
import { isPro, gettext, showLogoutIcon, enableSeasearch, enableElasticsearch } from '../../utils/constants';
import Search from '../search/search';
import AISearch from '../search/ai-search';
import SearchByName from '../search/search-by-name';
import Notification from '../common/notification';
import Account from '../common/account';
import Logout from '../common/logout';
import { EVENT_BUS_TYPE } from '../common/event-bus-type';

const propTypes = {
  repoID: PropTypes.string,
  path: PropTypes.string,
  repoName: PropTypes.string,
  isLibView: PropTypes.bool,
  onSearchedClick: PropTypes.func,
  searchPlaceholder: PropTypes.string,
  currentRepoInfo: PropTypes.object,
  eventBus: PropTypes.object,
  isViewFile: PropTypes.bool,
  showSearch: PropTypes.bool
};

class CommonToolbar extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      repoID: props.repoID,
      repoName: props.repoName,
      isLibView: props.isLibView,
      path: props.path,
      isViewFile: props.isViewFile,
      currentRepoInfo: props.currentRepoInfo,
    };
  }

  componentDidMount() {
    if (this.props.eventBus) {
      this.unsubscribeLibChange = this.props.eventBus.subscribe(EVENT_BUS_TYPE.CURRENT_LIBRARY_CHANGED, this.onRepoChange);
    }
  }

  componentWillUnmount() {
    this.unsubscribeLibChange && this.unsubscribeLibChange();
  }

  onRepoChange = ({ repoID, repoName, isLibView, path, isViewFile, currentRepoInfo }) => {
    this.setState({ repoID, repoName, isLibView, path, isViewFile, currentRepoInfo });
  };

  onSearchedClick = (searchedItem) => {
    // If search result is current library, use libContentView.onSearchedClick; else use app.onSearchedClick
    if (this.state.isLibView && this.state.repoID === searchedItem.repo_id) {
      this.props.eventBus.dispatch(EVENT_BUS_TYPE.SEARCH_LIBRARY_CONTENT, searchedItem);
    } else {
      this.props.onSearchedClick(searchedItem);
    }
  };

  renderSearch = () => {
    const { repoID, repoName, isLibView, path, isViewFile, currentRepoInfo } = this.state;
    const { searchPlaceholder } = this.props;
    const placeholder = searchPlaceholder || gettext('Search files');

    if (isPro) {
      if (enableSeasearch && !enableElasticsearch) {
        return (
          <AISearch
            repoID={repoID}
            path={path}
            isViewFile={isViewFile}
            placeholder={placeholder}
            currentRepoInfo={currentRepoInfo}
            onSearchedClick={this.onSearchedClick}
            isLibView={isLibView}
          />
        );
      } else {
        return (
          <Search
            repoID={repoID}
            placeholder={placeholder}
            onSearchedClick={this.onSearchedClick}
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
