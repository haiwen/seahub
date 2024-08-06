import React, { useState } from 'react';
import RecentlyUsedListItem from './recently-used-list-item';

const RecentlyUsedListView = ({ recentlyUsedList, onDirentItemClick }) => {
  const [selectedItem, setSelectedItem] = useState(null);

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
