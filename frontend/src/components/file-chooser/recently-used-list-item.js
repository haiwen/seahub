import React from 'react';

const RecentlyUsedListItem = ({ item, isSelected, onItemClick }) => {
  const title = item.path === '/' ? item.path : item.path.split('/').pop();

  const handleItemClick = () => {
    onItemClick(item.repo, item.path);
  };

  return (
    <li>
      <div className={`${isSelected ? 'item-active' : ''} item-info recently-used`} onClick={handleItemClick}>
        <div className="item-left-icon">
          <i className="tree-node-icon">
            <span className="icon sf3-font sf3-font-folder tree-node-icon"></span>
          </i>
        </div>
        <div className="item-text">
          <span className="name user-select-none ellipsis" title={title}>{title}</span>
        </div>
      </div>
    </li>
  );
};

export default RecentlyUsedListItem;
