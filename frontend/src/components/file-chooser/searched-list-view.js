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
      currentItem: props.searchResults.length > 0 ? props.searchResults[0] : null,
      currentIndex: props.searchResults.length > 0 ? 0 : -1,
    };
    this.itemRef = React.createRef();
  }

  componentDidMount() {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  handleKeyDown = (event) => {
    const { searchResults } = this.props;
    const { currentIndex } = this.state;

    if (event.key === 'ArrowDown') {
      const nextIndex = (currentIndex + 1) % searchResults.length;
      this.setState({
        currentItem: searchResults[nextIndex],
        currentIndex: nextIndex,
      });
    } else if (event.key === 'ArrowUp') {
      const prevIndex = (currentIndex - 1 + searchResults.length) % searchResults.length;
      this.setState({
        currentItem: searchResults[prevIndex],
        currentIndex: prevIndex,
      });
    } else if (event.key === 'Enter') {
      this.onItemClick(searchResults[currentIndex], currentIndex);
      this.props.onSearchedItemDoubleClick(searchResults[currentIndex]);
    }
  };

  onItemClick = (item, index) => {
    this.setState({ currentItem: item, currentIndex: index });
    this.props.onItemClick(item);
  };

  render() {
    return (
      <table className="table-thead-hidden file-chooser-table" rules="node" frame="void">
        <thead>
          <tr>
            <th width="2%">{/* indent */}</th>
            <th width="6%">{/* icon */}</th>
            <th width="92%">{/* link */}</th>
          </tr>
        </thead>
        <tbody>
          {this.props.searchResults.map((item, index) => {
            return (
              <SearchedListItem
                key={index}
                ref={this.itemRef}
                item={item}
                currentItem={this.state.currentItem}
                onItemClick={() => this.onItemClick(item, index)}
                onSearchedItemDoubleClick={this.props.onSearchedItemDoubleClick}
                initToShowChildren={false}
              />
            );
          })}
        </tbody>
      </table>
    );
  }
}

SearchedListView.propTypes = propTypes;

export default SearchedListView;
