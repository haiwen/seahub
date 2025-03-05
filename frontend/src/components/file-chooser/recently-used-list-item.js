import React from 'react';
import classNames from 'classnames';
import { Utils } from '../../utils/utils';

const RecentlyUsedListItem = ({ item, isSelected, onItemClick }) => {
  if (!item || typeof item.path !== 'string') {
    return '';
  }

  const title = Utils.getFileName(item.path) || item.repo.repo_name;

  const handleItemClick = () => {
    onItemClick(item);
  };

  return (
    <li>
      <div className={classNames('item-info recently-used', { 'item-active': isSelected })} onClick={handleItemClick}>
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
