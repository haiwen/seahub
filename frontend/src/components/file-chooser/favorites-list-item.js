import React from 'react';
import classNames from 'classnames';
import { Utils } from '../../utils/utils';
import Icon from '../icon';

const FavoritesListItem = ({ item, isSelected, onItemClick }) => {

  const handleItemClick = () => {
    onItemClick(item);
  };

  const itemName = item.obj_name;
  return (
    <li>
      <div
        className={classNames('item-info', { 'item-active': isSelected })}
        onClick={handleItemClick}
        tabIndex={0}
        role="treeitem"
        aria-selected={isSelected}
        onKeyDown={Utils.onKeyDown}
      >
        <div className="item-left-icon ml-2 mr-1">
          <i className="tree-node-icon">
            <span className="tree-node-icon"><Icon symbol="folder" /></span>
          </i>
        </div>
        <div className="item-text">
          <span className="name user-select-none ellipsis" title={itemName}>{itemName}</span>
        </div>
        {isSelected &&
          <div className="item-right-icon">
            <Icon symbol="check" color="currentColor" />
          </div>
        }
      </div>
    </li>
  );
};

export default FavoritesListItem;
