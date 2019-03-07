import React from 'react';
import PropTypes from 'prop-types';
import SearchedListItem from './searched-list-item';

const propTypes = {
  searchedResult: PropTypes.array.isRequired,
  onItemClick: PropTypes.func.isRequired,
};

class SearchedListView extends React.Component {

  render() {
    return (
      <ul className="file-chooser-search-list">
        {this.props.searchedResult.map((item, index) => {
          return (<SearchedListItem key={index} item={item} onItemClick={this.props.onItemClick} />);
        })}
      </ul>
    );
  }
}

SearchedListView.propTypes = propTypes;

export default SearchedListView;
