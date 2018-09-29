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
        <span className="item-content item-name">{item.name}</span>
        <span className="item-content item-link">{item.link_content}</span>
        <div className="item-content item-text" dangerouslySetInnerHTML={{__html: item.content}}></div>
      </li>
    );
  }
}

SearchResultItem.propTypes = propTypes;

export default SearchResultItem;
