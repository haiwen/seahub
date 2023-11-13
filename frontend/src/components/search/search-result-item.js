import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Utils } from '../../utils/utils';

const propTypes = {
  item: PropTypes.object.isRequired,
  onItemClickHandler: PropTypes.func.isRequired,
  isHighlight: PropTypes.bool,
  setRef: PropTypes.func,
};

class SearchResultItem extends React.Component {

  static defaultProps = {
    setRef: () => {},
  };

  onClickHandler = () => {
    var item = this.props.item;
    this.props.onItemClickHandler(item);
  };

  render() {
    let item = this.props.item;
    let folderIconUrl = item.link_content ? Utils.getFolderIconUrl(false, 192) : Utils.getDefaultLibIconUrl(true);
    let fileIconUrl = item.is_dir ? folderIconUrl : Utils.getFileIconUrl(item.name, 192);

    if (item.thumbnail_url !== '') {
      fileIconUrl = item.thumbnail_url;
    }

    return (
      <li
        className={classnames('search-result-item', {'search-result-item-highlight': this.props.isHighlight })}
        onClick={this.onClickHandler}
        ref={ref => this.props.setRef(ref)}
      >
        <img className={item.link_content ? 'item-img' : 'lib-item-img'} src={fileIconUrl} alt="" />
        <div className="item-content">
          <div className="item-name ellipsis">{item.name}</div>
          <div className="item-link ellipsis">{item.repo_name}/{item.link_content}</div>
          <div className="item-text ellipsis" dangerouslySetInnerHTML={{__html: item.content}}></div>
        </div>
      </li>
    );
  }
}

SearchResultItem.propTypes = propTypes;

export default SearchResultItem;
