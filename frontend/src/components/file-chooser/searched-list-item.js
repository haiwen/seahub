import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Utils } from '../../utils/utils';
import './searched-list-item.css';

const propTypes = {
  currentItem: PropTypes.object,
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
    let { item, currentItem } = this.props;
    return (
      <tr
        className={classnames('searched-list-item', {
          'tr-active': currentItem && item.repo_id === currentItem.repo_id && item.path === currentItem.path,
          'searched-dir': item.is_dir,
        })}
        onClick={this.onClick}
        onDoubleClick={this.searchItemDoubleClick}
        tabIndex={0}
        aria-selected={!!(currentItem && item.repo_id === currentItem.repo_id && item.path === currentItem.path)}
        onKeyDown={Utils.onKeyDown}
      >
        <td className="text-center searched-item-icon">
          {item.is_dir ?
            <span className="icon sf3-font sf3-font-folder tree-node-icon"></span>
            :
            <img className="item-img" src={Utils.getFileIconUrl(item.name)} alt="" width="24"/>
          }
        </td>
        <td className='searched-item-link'>
          <span className="item-link">{item.repo_name}/{item.link_content}</span>
        </td>
      </tr>
    );
  }
}

SearchedListItem.propTypes = propTypes;

export default SearchedListItem;
