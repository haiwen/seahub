import React from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../utils/utils';

const propTypes = {
  item: PropTypes.object.isRequired,
  onItemClickHandler: PropTypes.func.isRequired,
};

class SearchResultItem extends React.Component {

  onClickHandler = () => {
    var item = this.props.item;
    this.props.onItemClickHandler(item);
  }

  render() {
    let item = this.props.item;
    let fileIconUrl = item.is_dir ? Utils.getFolderIconUrl(false, 192) : Utils.getFileIconUrl(item.name, 192);
    return (
      <li className="search-result-item" onClick={this.onClickHandler}>
        <img className="item-img" src={fileIconUrl} alt="" />
        <div className="item-content">
          <dt className="item-name ellipsis">{item.name}</dt>
          <dd className="item-link ellipsis">{item.repo_name}/{item.link_content}</dd>
          <dd className="item-text ellipsis" dangerouslySetInnerHTML={{__html: item.content}}></dd>
        </div>
      </li>
    );
  }
}

SearchResultItem.propTypes = propTypes;

export default SearchResultItem;
