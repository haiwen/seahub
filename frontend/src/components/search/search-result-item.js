import React from 'react';
import PropTypes from 'prop-types';
import { siteRoot } from '../../utils/constants';
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
    let fileIconSize = Utils.isHiDPI() ? 48 : 24;
    let fileIconUrl = item.is_dir ? siteRoot + 'media/img/folder-192.png' : Utils.getFileIconUrl(item.name, fileIconSize);
    return (
      <li className="search-result-item" onClick={this.onClickHandler}>
        <span className="item-content item-name">
          <img src={fileIconUrl} alt="" />{item.name}
        </span>
        <span className="item-content item-link">{item.repo_name}/{item.link_content}</span>
        <div className="item-content item-text" dangerouslySetInnerHTML={{__html: item.content}}></div>
      </li>
    );
  }
}

SearchResultItem.propTypes = propTypes;

export default SearchResultItem;
