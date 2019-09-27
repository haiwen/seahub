import React from 'react';
import PropTypes from 'prop-types';

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
    return (
      <li className="search-result-item" onClick={this.onClickHandler}>
        <span className="sf3-font sf3-font-table"></span>
        <div className="item-content">
          <div className="item-name ellipsis">{item.name}</div>
          {/* <div className="item-link ellipsis">{item.repo_name}/{item.link_content}</div> */}
          {/* <div className="item-text ellipsis" dangerouslySetInnerHTML={{__html: item.content}}></div> */}
        </div>
      </li>
    );
  }
}

SearchResultItem.propTypes = propTypes;

export default SearchResultItem;
