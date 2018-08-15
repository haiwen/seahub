import React, { Component } from 'react';

class SearchResultItem extends React.Component {

  onClickHandler = () => {
    this.refs.itemlink.click();
  }

  render() {
    let item = this.props.item;
    return (
      <li className="search-result-item" onClick={this.onClickHandler}>
          <a className="wiki-content wiki-name">{item.name}</a>
          <a ref="itemlink" className="wiki-content wiki-link" href={item.link}>{item.link_content}</a>
          <p className="wiki-content highlight-content">{item.content}</p>
      </li>
    )
  }
}

export default SearchResultItem;