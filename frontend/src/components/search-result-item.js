import React, { Component } from 'react';

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
    )
  }
}

export default SearchResultItem;
