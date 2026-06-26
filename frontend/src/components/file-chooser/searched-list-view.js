import React from 'react';
import PropTypes from 'prop-types';
import SearchedListItem from './searched-list-item';

const propTypes = {
  searchResults: PropTypes.array.isRequired,
  onItemClick: PropTypes.func.isRequired,
  onSearchedItemDoubleClick: PropTypes.func.isRequired,
  selectedItemInfo: PropTypes.object,
  currentIndex: PropTypes.number,
  enableDocumentKeyboardNavigation: PropTypes.bool,
  isKeyboardSelectionActive: PropTypes.bool,
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
    if (this.props.enableDocumentKeyboardNavigation !== false) {
      document.addEventListener('keydown', this.handleKeyDown);
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.enableDocumentKeyboardNavigation !== this.props.enableDocumentKeyboardNavigation) {
      if (this.props.enableDocumentKeyboardNavigation === false) {
        document.removeEventListener('keydown', this.handleKeyDown);
      } else {
        document.addEventListener('keydown', this.handleKeyDown);
      }
    }

    if (prevProps.searchResults !== this.props.searchResults) {
      this.setState({
        currentItem: this.props.searchResults.length > 0 ? this.props.searchResults[0] : null,
        currentIndex: this.props.searchResults.length > 0 ? 0 : -1,
      });
    }
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  handleKeyDown = (event) => {
    const { searchResults } = this.props;
    const currentIndex = typeof this.props.currentIndex === 'number' ? this.props.currentIndex : this.state.currentIndex;

    if (searchResults.length === 0) return;

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
      if (currentIndex < 0 || !searchResults[currentIndex]) return;
      this.onItemClick(searchResults[currentIndex], currentIndex);
      this.props.onSearchedItemDoubleClick(searchResults[currentIndex]);
    }
  };

  onItemClick = (item, index) => {
    this.setState({ currentItem: item, currentIndex: index });
    this.props.onItemClick(item, index);
  };

  render() {
    const selectedItemInfo = this.props.selectedItemInfo;

    return (
      <table className="table-thead-hidden file-chooser-table" rules="node" frame="void">
        <thead>
          <tr>
            <th width="0%">{/* indent */}</th>
            <th width="5%">{/* icon */}</th>
            <th width="95%">{/* link */}</th>
          </tr>
        </thead>
        <tbody>
          {this.props.searchResults.map((item, index) => {
            const selectedRepoId = selectedItemInfo && (selectedItemInfo.repo_id || selectedItemInfo.repoID);
            const selectedPath = selectedItemInfo && (selectedItemInfo.path || selectedItemInfo.filePath);
            const isSelected = !!(selectedRepoId && selectedPath && item.repo_id === selectedRepoId && item.path === selectedPath);
            const isKeyboardSelected = isSelected && this.props.isKeyboardSelectionActive;
            return (
              <SearchedListItem
                key={index}
                ref={this.itemRef}
                item={item}
                isSelected={isSelected}
                isKeyboardSelected={isKeyboardSelected}
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
