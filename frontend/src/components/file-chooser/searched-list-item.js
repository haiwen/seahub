import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Utils } from '../../utils/utils';
import Icon from '../icon';

import './searched-list-item.css';

const propTypes = {
  isSelected: PropTypes.bool,
  isKeyboardSelected: PropTypes.bool,
  onItemClick: PropTypes.func.isRequired,
  onSearchedItemDoubleClick: PropTypes.func.isRequired,
  item: PropTypes.object,
};

class SearchedListItem extends React.Component {

  onClick = () => {
    this.props.onItemClick(this.props.item);
  };

  searchItemDoubleClick = () => {
    this.props.onSearchedItemDoubleClick(this.props.item);
  };

  render() {
    let { item, isSelected, isKeyboardSelected } = this.props;
    let { path, repo_name } = item;
    return (
      <tr
        className={classnames('searched-list-item', {
          'searched-dir': item.is_dir,
          'searched-list-item-keyboard-selected': isKeyboardSelected,
        })}
        onClick={this.onClick}
        onDoubleClick={this.searchItemDoubleClick}
        tabIndex={0}
        aria-selected={isSelected}
        onKeyDown={Utils.onKeyDown}
      >
        <td className="searched-item-cell" colSpan={3}>
          <div className="searched-item-content">
            <span className="searched-item-icon">
              {item.is_dir ?
                <span className="tree-node-icon"><Icon symbol="folder" /></span>
                :
                <img className="item-img" src={Utils.getFileIconUrl(item.name)} alt="" width="24" />
              }
            </span>
            <span className="searched-item-link">
              <span className="item-link">{repo_name}{path === '/' ? '' : path}</span>
            </span>
            <span className={classnames('searched-item-check', { invisible: !isSelected })}>
              <Icon symbol="check" />
            </span>
          </div>
        </td>
      </tr>
    );
  }
}

SearchedListItem.propTypes = propTypes;

export default SearchedListItem;
