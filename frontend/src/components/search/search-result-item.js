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
