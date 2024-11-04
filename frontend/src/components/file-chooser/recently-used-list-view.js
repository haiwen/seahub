import React, { useState, useMemo } from 'react';
import RecentlyUsedListItem from './recently-used-list-item';

const RecentlyUsedListView = ({ currentRepoInfo, repoList, onDirentItemClick }) => {
  const [selectedItem, setSelectedItem] = useState(null);

  const recentlyUsedList = useMemo(() => {
    const list = JSON.parse(localStorage.getItem('recently-used-list')) || [];
    const allRepos = [currentRepoInfo, ...repoList];
    // list: [{repo_id: 'xxx', path: 'xxx'}, ...], replace repo_id with repo object
    return list
      .map(item => {
        const repo = allRepos.find(repo => repo.repo_id === item.repo_id);
        if (repo) {
          return { path: item.path, repo: repo };
        }
        return null;
      })
      .filter(item => item !== null);
  }, [currentRepoInfo, repoList]);

  const onItemClick = (repo, path) => {
    setSelectedItem(path);
    onDirentItemClick(repo, path);
  };

  return (
    <ul className="list-view-content file-chooser-item" >
      {recentlyUsedList.length > 0 && recentlyUsedList.map((item, index) => {
        return (
          <RecentlyUsedListItem
            key={index}
            item={item}
            isSelected={selectedItem === item.path}
            onItemClick={onItemClick}
          />
        );
      })}
    </ul>
  );
};

export default RecentlyUsedListView;
