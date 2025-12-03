import React from 'react';
import PropTypes from 'prop-types';
import RepoListView from './repo-list-view';
import RecentlyUsedListView from './recently-used-list-view';
import { gettext } from '../../utils/constants';
import SearchedListView from './searched-list-view';
import { SearchStatus } from './searcher';
import { MODE_TYPE_MAP } from '../../constants';
import Loading from '../loading';
import Icon from '../icon';

const RepoListWrapper = (props) => {
  const {
    mode, isShowFile = true, fileSuffixes = [], currentPath, isCurrentRepoShow, currentRepoInfo, selectedRepo,
    selectedPath, isOtherRepoShow, selectedItemInfo, repoList,
    searchStatus, searchResults, onSearchedItemClick, onSearchedItemDoubleClick, selectedSearchedRepo, newFolderName, initToShowChildren
  } = props;

  const onScroll = (event) => {
    event.stopPropagation();
  };

  const renderSearchResults = () => {
    switch (searchStatus) {
      case SearchStatus.LOADING:
        return <Loading />;
      case SearchStatus.RESULTS:
        return (
          <>
            {searchResults.length === 0 ? (
              <div className='search-results-none text-center'>{gettext('No results matching')}</div>
            ) : (
              <SearchedListView
                searchResults={searchResults}
                onItemClick={onSearchedItemClick}
                onSearchedItemDoubleClick={onSearchedItemDoubleClick}
              />
            )}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className='file-chooser-scroll-wrapper' onScroll={onScroll}>
      <div className="file-chooser-container user-select-none">
        {mode === MODE_TYPE_MAP.CURRENT_AND_OTHER_REPOS && (
          <>
            <div className="list-view">
              <div className="file-chooser-list-view-header">
                <span className="item-toggle tree-node-icon icon" onClick={props.onCurrentRepoToggle}>
                  <Icon symbol="down" className={isCurrentRepoShow ? '' : 'rotate-270'} />
                </span>
                <span className="library">{gettext('Current Library')}</span>
              </div>
              {(isCurrentRepoShow && currentRepoInfo) &&
                <RepoListView
                  initToShowChildren
                  currentRepoInfo={currentRepoInfo}
                  currentPath={currentPath}
                  selectedRepo={selectedRepo}
                  selectedPath={selectedPath}
                  isShowFile={isShowFile}
                  fileSuffixes={fileSuffixes}
                  selectedItemInfo={selectedItemInfo}
                  onRepoItemClick={props.handleClickRepo}
                  onDirentItemClick={props.handleClickDirent}
                />
              }
            </div>
            <div className="list-view">
              <div className="file-chooser-list-view-header">
                <span className="item-toggle tree-node-icon icon" onClick={props.onOtherRepoToggle}>
                  <Icon symbol="down" className={isOtherRepoShow ? '' : 'rotate-270'} />
                </span>
                <span className="library">{gettext('Other Libraries')}</span>
              </div>
              {isOtherRepoShow &&
                <RepoListView
                  initToShowChildren
                  repoList={repoList}
                  selectedRepo={selectedRepo}
                  selectedPath={selectedPath}
                  isShowFile={isShowFile}
                  fileSuffixes={fileSuffixes}
                  selectedItemInfo={selectedItemInfo}
                  onRepoItemClick={props.handleClickRepo}
                  onDirentItemClick={props.handleClickDirent}
                />
              }
            </div>
          </>
        )}
        {mode === MODE_TYPE_MAP.ONLY_CURRENT_LIBRARY && (
          <div className="list-view">
            <RepoListView
              initToShowChildren={true}
              currentRepoInfo={currentRepoInfo}
              currentPath={currentPath}
              selectedRepo={selectedRepo}
              selectedPath={selectedPath}
              isShowFile={isShowFile}
              fileSuffixes={fileSuffixes}
              selectedItemInfo={selectedItemInfo}
              onRepoItemClick={props.handleClickRepo}
              onDirentItemClick={props.handleClickDirent}
              selectedSearchedRepo={selectedSearchedRepo}
              newFolderName={newFolderName}
            />
          </div>
        )}
        {mode === MODE_TYPE_MAP.ONLY_ALL_REPOS && (
          <div className="file-chooser-container">
            <div className="list-view">
              <div className="file-chooser-list-view-header">
                <span className="item-toggle tree-node-icon icon" onClick={props.onOtherRepoToggle}>
                  <Icon symbol="down" className={isOtherRepoShow ? '' : 'rotate-270'} />
                </span>
                <span className="library">{gettext('Libraries')}</span>
              </div>
              <RepoListView
                initToShowChildren={false}
                repoList={repoList}
                selectedRepo={selectedRepo}
                selectedPath={selectedPath}
                isShowFile={isShowFile}
                fileSuffixes={fileSuffixes}
                selectedItemInfo={selectedItemInfo}
                onRepoItemClick={props.handleClickRepo}
                onDirentItemClick={props.handleClickDirent}
              />
            </div>
          </div>
        )}
        {mode === MODE_TYPE_MAP.ONLY_OTHER_LIBRARIES && (
          <div className="list-view">
            <RepoListView
              initToShowChildren={initToShowChildren}
              repoList={repoList}
              selectedRepo={selectedRepo}
              selectedPath={selectedPath}
              isShowFile={isShowFile}
              fileSuffixes={fileSuffixes}
              selectedItemInfo={selectedItemInfo}
              onRepoItemClick={props.handleClickRepo}
              onDirentItemClick={props.handleClickDirent}
              selectedSearchedRepo={selectedSearchedRepo}
              newFolderName={newFolderName}
            />
          </div>
        )}
        {mode === MODE_TYPE_MAP.RECENTLY_USED && (
          <div className="list-view">
            <RecentlyUsedListView
              currentRepoInfo={currentRepoInfo}
              repoList={repoList}
              onDirentItemClick={props.handleClickDirent}
            />
          </div>
        )}
        {mode === MODE_TYPE_MAP.SEARCH_RESULTS && (
          <div className="list-view">
            {renderSearchResults()}
          </div>
        )}
      </div>
    </div>
  );
};

RepoListWrapper.propTypes = {
  mode: PropTypes.string,
  currentPath: PropTypes.string,
  isShowFile: PropTypes.bool,
  fileSuffixes: PropTypes.array,
  selectedItemInfo: PropTypes.object,
  currentRepoInfo: PropTypes.object,
  selectedRepo: PropTypes.object,
  isCurrentRepoShow: PropTypes.bool,
  isOtherRepoShow: PropTypes.bool,
  selectedPath: PropTypes.string,
  repoList: PropTypes.array,
  onCurrentRepoToggle: PropTypes.func,
  onOtherRepoToggle: PropTypes.func,
  handleClickRepo: PropTypes.func,
  handleClickDirent: PropTypes.func,
  searchStatus: PropTypes.string,
  searchResults: PropTypes.array,
  onSearchedItemClick: PropTypes.func,
  onSearchedItemDoubleClick: PropTypes.func,
  selectedSearchedRepo: PropTypes.object,
  newFolderName: PropTypes.string,
  initToShowChildren: PropTypes.bool,
};

export default RepoListWrapper;
