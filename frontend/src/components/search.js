import React, { Component } from 'react';

const repoID = window.wiki.config.repoId;
const siteRoot = window.app.config.siteRoot;

class Search extends Component {
  render() {
    return (
      <form id="top-search-form" method="get" action={siteRoot + 'search/'} className="hidden-sm-down search-form">
        <input
          type="text" className="search-input" name="q"
          placeholder="Search files in this wiki"
        />
        <input type="hidden" name="search_repo" value={repoID} />
        <button type="submit" className="search-submit" aria-label="Submit"><span className="icon-search"></span></button>
      </form>
    )
  }
}

export default Search;
