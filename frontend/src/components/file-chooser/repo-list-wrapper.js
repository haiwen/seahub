import React from 'react';
import PropTypes from 'prop-types';
import RepoListView from './repo-list-view';
import RecentlyUsedListView from './recently-used-list-view';
import { gettext } from '../../utils/constants';

export const MODE_TYPE_MAP = {
  CURRENT_AND_OTHER_REPOS: 'current_repo_and_other_repos',
  ONLY_CURRENT_LIBRARY: 'only_current_library',
  ONLY_ALL_REPOS: 'only_all_repos',
  ONLY_OTHER_LIBRARIES: 'only_other_libraries',
  RECENTLY_USED: 'recently_used',
};

const RepoListWrapper = (props) => {
  const {
    mode, isShowFile, fileSuffixes, currentPath, isBrowsing, browsingPath, isCurrentRepoShow, currentRepoInfo, selectedRepo,
    selectedPath, isOtherRepoShow, selectedItemInfo, repoList,
  } = props;

  const renderRecentlyUsed = () => {
    let recentlyUsedList = JSON.parse(localStorage.getItem('recently-used-list')) || [];
    recentlyUsedList = recentlyUsedList.filter(item => !!item);
    return (
      <div className="list-view">
        <RecentlyUsedListView
          recentlyUsedList={recentlyUsedList}
          onDirentItemClick={props.handleClickDirent}
        />
      </div>
    );
  };

  const onScroll = (event) => {
    event.stopPropagation();
  };

  return (
    <div className='file-chooser-scroll-wrapper' onScroll={onScroll}>
      <div className="file-chooser-container user-select-none">
        {mode === MODE_TYPE_MAP.CURRENT_AND_OTHER_REPOS && (
          <>
            <div className="list-view">
              <div className="file-chooser-list-view-header">
                <span className={`item-toggle sf3-font ${isCurrentRepoShow ? 'sf3-font-down' : 'sf3-font-down rotate-270 d-inline-block'}`} onClick={props.onCurrentRepoToggle}></span>
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
                <span className={`item-toggle sf3-font ${isOtherRepoShow ? 'sf3-font-down' : 'sf3-font-down rotate-270 d-inline-block'}`} onClick={props.onOtherRepoToggle}></span>
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
              initToShowChildren
              currentRepoInfo={currentRepoInfo}
              currentPath={currentPath}
              selectedRepo={selectedRepo}
              selectedPath={selectedPath}
              isShowFile={isShowFile}
              fileSuffixes={fileSuffixes}
              selectedItemInfo={selectedItemInfo}
              isBrowsing={isBrowsing}
              browsingPath={browsingPath}
              onRepoItemClick={props.handleClickRepo}
              onDirentItemClick={props.handleClickDirent}
            />
          </div>
        )}
        {mode === MODE_TYPE_MAP.ONLY_ALL_REPOS && (
          <div className="file-chooser-container">
            <div className="list-view">
              <div className="file-chooser-list-view-header">
                <span className="item-toggle sf3-font sf3-font-down"></span>
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
              initToShowChildren={false}
              repoList={repoList}
              selectedRepo={selectedRepo}
              selectedPath={selectedPath}
              isShowFile={isShowFile}
              fileSuffixes={fileSuffixes}
              selectedItemInfo={selectedItemInfo}
              isBrowsing={isBrowsing}
              browsingPath={browsingPath}
              onRepoItemClick={props.handleClickRepo}
              onDirentItemClick={props.handleClickDirent}
            />
          </div>
        )}
        {mode === MODE_TYPE_MAP.RECENTLY_USED && renderRecentlyUsed()}
      </div>
    </div>
  );
};

RepoListWrapper.propTypes = {
  mode: PropTypes.string,
  currentPath: PropTypes.string,
  isShowFile: PropTypes.bool,
  fileSuffixes: PropTypes.array,
  isBrowsing: PropTypes.bool,
  browsingPath: PropTypes.string,
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
};

RepoListWrapper.defaultProps = {
  isShowFile: false,
  fileSuffixes: [],
};

export default RepoListWrapper;
