import React, { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import RecentlyUsedListItem from './recently-used-list-item';
import { RECENTLY_USED_LIST_KEY } from '../../constants';

const RecentlyUsedListView = ({ currentRepoInfo, repoList, onDirentItemClick }) => {
  const [selectedItem, setSelectedItem] = useState(null);

  const recentlyUsedList = useMemo(() => {
    const list = JSON.parse(localStorage.getItem(RECENTLY_USED_LIST_KEY)) || [];
    const allRepos = [...repoList, currentRepoInfo];

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

  const onItemClick = (item) => {
    setSelectedItem(item);
    onDirentItemClick(item.repo, item.path);
  };

  const isItemSelected = (item) => selectedItem && selectedItem.path === item.path && selectedItem.repo.repo_id === item.repo.repo_id;

  return (
    <ul className="list-view-content file-chooser-item">
      {recentlyUsedList.length > 0 && recentlyUsedList.map((item, index) => {
        return (
          <RecentlyUsedListItem
            key={index}
            item={item}
            isSelected={isItemSelected(item)}
            onItemClick={onItemClick}
          />
        );
      })}
    </ul>
  );
};

RecentlyUsedListView.propTypes = {
  currentRepoInfo: PropTypes.object.isRequired,
  repoList: PropTypes.array.isRequired,
  onDirentItemClick: PropTypes.func.isRequired,
};

export default RecentlyUsedListView;
