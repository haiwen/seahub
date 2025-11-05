import React from 'react';
import PropTypes from 'prop-types';
import { isPro, gettext, showLogoutIcon, SF_COLOR_MODE } from '../../utils/constants';
import Search from '../search/search';
import SearchByName from '../search/search-by-name';
import Notification from '../common/notification';
import Account from '../common/account';
import Logout from '../common/logout';
import { EVENT_BUS_TYPE } from '../common/event-bus-type';
import tagsAPI from '../../tag/api';
import IconBtn from '../icon-btn';
import { getColorScheme, Utils } from '../../utils/utils';

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
      isTagEnabled: false,
      tagsData: [],
      colorMode: getColorScheme(),
    };
  }

  componentDidMount() {
    if (this.props.eventBus) {
      this.unsubscribeLibChange = this.props.eventBus.subscribe(EVENT_BUS_TYPE.CURRENT_LIBRARY_CHANGED, this.onRepoChange);
      this.unsubscribeTagStatus = this.props.eventBus.subscribe(EVENT_BUS_TYPE.TAG_STATUS, (status) => this.onTagStatus(status));
      this.unsubscribeTagsChanged = this.props.eventBus.subscribe(EVENT_BUS_TYPE.TAGS_CHANGED, (tags) => this.setState({ tagsData: tags }));
    }
    this.initializeColorMode();
  }

  componentWillUnmount() {
    this.unsubscribeLibChange && this.unsubscribeLibChange();
    this.unsubscribeMetadataStatus && this.unsubscribeMetadataStatus();
    this.unsubscribeTagsChanged && this.unsubscribeTagsChanged();
  }

  initializeColorMode() {
    const colorMode = localStorage.getItem(SF_COLOR_MODE);
    if (colorMode) {
      this.setState({ colorMode });
      document.body.setAttribute('data-bs-theme', colorMode);
    }
  }

  onTagStatus = (status) => {
    this.setState({ isTagEnabled: status });
    if (status) {
      tagsAPI.getTags(this.state.repoID).then((res) => {
        const tags = res?.data?.results || [];
        this.setState({ tagsData: tags });
      });
    }
  };

  onSelectTag = (tag) => {
    this.props.eventBus.dispatch(EVENT_BUS_TYPE.SELECT_TAG, tag);
  };

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

  onColorModeChange = () => {
    const colorMode = this.state.colorMode === 'light' ? 'dark' : 'light';
    this.setState({ colorMode });
    localStorage.setItem(SF_COLOR_MODE, colorMode);
    document.body.setAttribute('data-bs-theme', colorMode);
  };

  renderSearch = () => {
    const { repoID, repoName, isLibView, path, isViewFile, isTagEnabled, tagsData } = this.state;
    const { searchPlaceholder } = this.props;
    const placeholder = searchPlaceholder || gettext('Search files');

    if (isPro) {
      return (
        <Search
          repoID={repoID}
          placeholder={placeholder}
          onSearchedClick={this.onSearchedClick}
          isViewFile={isViewFile}
          isPublic={false}
          path={path}
          isTagEnabled={isTagEnabled}
          tagsData={tagsData}
          onSelectTag={this.onSelectTag}
        />
      );
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
    const { colorMode } = this.state;
    const symbol = colorMode === 'light' ? 'dark-mode' : 'light-mode';
    const title = colorMode === 'light' ? gettext('Dark mode') : gettext('Light mode');
    return (
      <div className="common-toolbar">
        {showSearch && this.renderSearch()}
        <IconBtn
          symbol={symbol}
          size={32}
          className="sf-icon-color-mode"
          title={title}
          onClick={this.onColorModeChange}
          tabIndex={0}
          role="button"
          aria-label={title}
          onKeyDown={Utils.onKeyDown}
        />
        <Notification />
        <Account />
        {showLogoutIcon && (<Logout />)}
      </div>
    );
  }
}

CommonToolbar.propTypes = propTypes;

export default CommonToolbar;
