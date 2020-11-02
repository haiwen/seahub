import React from 'react';
import PropTypes from 'prop-types';
import SearchedListItem from './searched-list-item';

const propTypes = {
  searchResults: PropTypes.array.isRequired,
  onItemClick: PropTypes.func.isRequired,
  onSearchedItemDoubleClick: PropTypes.func.isRequired,
};

class SearchedListView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      currentItem: null,
    };
  }

  onItemClick = (item) => {
    this.setState({currentItem: item});
    this.props.onItemClick(item);
  }

  render() {
    return (
      <table className="table-thead-hidden file-chooser-table" rules="node" frame="void">
        <thead>
          <tr>
            <th width="8%"></th>
            <th width="92%"></th>
          </tr>
        </thead>
        <tbody>
          {this.props.searchResults.map((item, index) => {
            return (
              <SearchedListItem
                key={index}
                item={item}
                currentItem={this.state.currentItem}
                onItemClick={this.onItemClick}
                onSearchedItemDoubleClick={this.props.onSearchedItemDoubleClick}
              />);
          })}
        </tbody>
      </table>
    );
  }
}

SearchedListView.propTypes = propTypes;

export default SearchedListView;
