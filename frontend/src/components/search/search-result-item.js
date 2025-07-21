import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Utils } from '../../utils/utils';
import { gettext } from '../../utils/constants';

const propTypes = {
  item: PropTypes.object.isRequired,
  idx: PropTypes.number.isRequired,
  onItemClickHandler: PropTypes.func.isRequired,
  isHighlight: PropTypes.bool,
  setRef: PropTypes.func,
  onHighlightIndex: PropTypes.func,
  timer: PropTypes.number,
  onSetTimer: PropTypes.func,
  onDeleteItem: PropTypes.func,
};

class SearchResultItem extends React.Component {

  constructor(props) {
    super(props);
    this.controller = null;
  }

  onClickHandler = () => {
    this.props.onItemClickHandler(this.props.item);
  };

  onMouseEnter = () => {
    if (this.props.isHighlight) return;
    if (this.controller) {
      this.controller.abort();
    }
    this.controller = new AbortController();

    if (this.props.onHighlightIndex) {
      this.props.onHighlightIndex(this.props.idx);
    }
  };

  deleteItem = (e) => {
    e.stopPropagation();
    this.props.onDeleteItem(this.props.item);
  };

  render() {
    const { item, onDeleteItem, isHighlight, setRef = (() => {}) } = this.props;
    let folderIconUrl = item.link_content ? Utils.getFolderIconUrl(false, 192) : Utils.getDefaultLibIconUrl();
    let fileIconUrl = item.is_dir ? folderIconUrl : Utils.getFileIconUrl(item.name);
    let showName = item.repo_name + '/' + item.link_content;
    showName = showName.endsWith('/') ? showName.slice(0, showName.length - 1) : showName;

    if (item.thumbnail_url) {
      fileIconUrl = item.thumbnail_url;
    }

    return (
      <li
        className={classnames('search-result-item', { 'search-result-item-highlight': isHighlight })}
        onClick={this.onClickHandler}
        ref={ref => setRef(ref)}
        onMouseEnter={this.onMouseEnter}
      >
        <img className={item.link_content ? 'item-img' : 'lib-item-img'} src={fileIconUrl} alt="" />
        <div className="item-content">
          <div className="item-name ellipsis" title={item.name}>{item.name}</div>
          <div className="item-link ellipsis" title={showName}>{showName}</div>
          <div className="item-text ellipsis" dangerouslySetInnerHTML={{ __html: item.content }}></div>
        </div>
        {isHighlight && onDeleteItem && (
          <button
            type="button"
            className="search-icon-right sf3-font sf3-font-x-01"
            onClick={this.deleteItem}
            aria-label={gettext('Delete')}
          >
          </button>
        )}
      </li>
    );
  }
}

SearchResultItem.propTypes = propTypes;

export default SearchResultItem;
