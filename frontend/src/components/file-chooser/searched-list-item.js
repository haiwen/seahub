import React from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../utils/utils';

const propTypes = {
  onItemClick: PropTypes.func.isRequired,
};

class SearchedListItem extends React.Component {

  onClick = () => {
    let item = this.props.item;
    this.props.onItemClick(item);
  }

  render() {
    let item = this.props.item;
    let fileIconUrl = item.is_dir ? Utils.getFolderIconUrl(false, 24) : Utils.getFileIconUrl(item.name, 24);
    return (
      <li className='file-chooser-search-item' onClick={this.onClick}>
        <img className="item-img" src={fileIconUrl} alt="" />
        <span className="item-link ellipsis">{item.repo_name}/{item.link_content}</span>
      </li>
    );
  }
}

SearchedListItem.propTypes = propTypes;

export default SearchedListItem;
