import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { seafileAPI } from '../../utils/seafile-api';
import FavoritesListItem from './favorites-list-item';

const FavoritesListView = ({ currentRepoInfo, repoList, onDirentItemClick }) => {
  const [favoritesList, setFavoritesList] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    let list = [];
    const allRepos = [...repoList, currentRepoInfo];
    seafileAPI.listStarredItems().then((res) => {
      list = res.data.starred_item_list.filter(item => !item.deleted && item.is_dir)
        .map(item => {
          const { repo_id, path, obj_name } = item;
          return { repo_id, path, obj_name };
        });

      list = list
        .map(item => {
          const repo = allRepos.find(repo => repo.repo_id === item.repo_id);
          if (repo) {
            item.repo = repo;
            return item;
          }
          return null;
        })
        .filter(item => item !== null);
      setFavoritesList(list);
    }).catch((error) => {
    });
  }, [currentRepoInfo, repoList]);

  const onItemClick = (item) => {
    setSelectedItem(item);
    onDirentItemClick(item.repo, item.path);
  };

  const isItemSelected = (item) => selectedItem && selectedItem.path === item.path && selectedItem.repo.repo_id === item.repo.repo_id;

  return (
    <ul className="list-view-content file-chooser-item">
      {favoritesList.length > 0 && favoritesList.map((item, index) => {
        return (
          <FavoritesListItem
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

FavoritesListView.propTypes = {
  currentRepoInfo: PropTypes.object.isRequired,
  repoList: PropTypes.array.isRequired,
  onDirentItemClick: PropTypes.func.isRequired,
};

export default FavoritesListView;
