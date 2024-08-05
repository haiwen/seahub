import React, { useState } from 'react';
import RecentlyUsedListItem from './recently-used-list-item';

const RecentlyUsedListView = ({ recentlyUsedList, selectedRepo, onDirentItemClick }) => {
  const [selectedItem, setSelectedItem] = useState(null);

  const onItemClick = (path) => {
    setSelectedItem(path);
    onDirentItemClick(selectedRepo, path);
  };

  return (
    <ul className="list-view-content file-chooser-item" >
      {recentlyUsedList.length > 0 && recentlyUsedList.map((path, index) => {
        return (
          <RecentlyUsedListItem
            key={index}
            path={path}
            isSelected={selectedItem === path}
            onItemClick={onItemClick}
          />
        );
      })}
    </ul>
  );
};

export default RecentlyUsedListView;
