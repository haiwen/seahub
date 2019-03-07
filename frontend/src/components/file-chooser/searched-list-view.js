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
      <table className="table-thead-hidden">
        <thead>
          <tr>
            <th width="8%"></th>
            <th width="92%"></th>
          </tr>
        </thead>
        <tbody>
          {this.props.searchedResult.map((item, index) => {
            return (<SearchedListItem key={index} item={item} onItemClick={this.props.onItemClick} />);
          })}
        </tbody>
      </table>
    );
  }
}

SearchedListView.propTypes = propTypes;

export default SearchedListView;
