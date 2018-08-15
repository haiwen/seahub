import React, { Component } from 'react';

class SearchResultItem extends React.Component {

  onClickHandler = () => {
    this.refs.itemlink.click();
  }

  render() {
    let item = this.props.item;
    return (
      <li className="search-result-item" onClick={this.onClickHandler}>
          <a className="item-content item-name">{item.name}</a>
          <a className="item-content item-link" ref="itemlink"  href={item.link}>{item.link_content}</a>
          <p className="item-content item-text">{item.content}</p>
      </li>
    )
  }
}

export default SearchResultItem;