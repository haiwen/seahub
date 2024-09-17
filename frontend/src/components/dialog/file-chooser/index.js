import React, { useState, useEffect } from 'react';
import RepoListView from '../../file-chooser/repo-list-view';
import RecentlyUsedListView from '../../file-chooser/recently-used-list-view';

import '../../../css/file-chooser.css';

const FileChooser = ({ mode, repoList, currentRepoInfo, currentPath, selectedRepo, selectedPath, selectedSearchedItem, onRepoItemClick, onDirentItemClick, isBrowsing, browsingPath }) => {
  const [recentlyUsedList, setRecentlyUsedList] = useState([]);

  useEffect(() => {
    if (mode === 'recently_used') {
      const recentlyUsedList = JSON.parse(localStorage.getItem('recently-used-list')) || [];
      setRecentlyUsedList(recentlyUsedList);
    }
    return () => {
      setRecentlyUsedList([]);
    };
  }, [mode]);

  const onScroll = (event) => {
    event.stopPropagation();
  };

  return (
    <div className='file-chooser-scroll-wrapper' onScroll={onScroll}>
      <div className="file-chooser-container user-select-none">
        {mode === 'only_current_library' && (
          <div className="list-view">
            <RepoListView
              initToShowChildren={true}
              currentRepoInfo={currentRepoInfo}
              currentPath={currentPath}
              selectedRepo={selectedRepo}
              selectedPath={selectedPath}
              onRepoItemClick={onRepoItemClick}
              onDirentItemClick={onDirentItemClick}
              selectedItemInfo={selectedSearchedItem}
              isBrowsing={isBrowsing}
              browsingPath={browsingPath}
            />
          </div>
        )}
        {mode === 'only_other_libraries' && (
          <div className="list-view">
            <RepoListView
              initToShowChildren={false}
              repoList={repoList.filter(repo => repo.repo_id !== currentRepoInfo.repo_id)}
              selectedRepo={selectedRepo}
              selectedPath={selectedPath}
              onRepoItemClick={onRepoItemClick}
              onDirentItemClick={onDirentItemClick}
              selectedItemInfo={selectedSearchedItem}
              isBrowsing={isBrowsing}
              browsingPath={browsingPath}
            />
          </div>
        )}
        {mode === 'recently_used' && (
          <div className="list-view">
            <RecentlyUsedListView
              recentlyUsedList={recentlyUsedList}
              onDirentItemClick={onDirentItemClick}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default FileChooser;
