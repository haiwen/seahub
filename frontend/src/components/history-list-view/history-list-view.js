import React from 'react';
import PropTypes from 'prop-types';
import HisotyListItem from './history-list-item';
import Loading from '../loading';

const propTypes = {
  hasMore: PropTypes.bool.isRequired,
  isReloadingData: PropTypes.bool.isRequired,
  historyList: PropTypes.array.isRequired,
  reloadMore: PropTypes.func.isRequired,
  onItemClick: PropTypes.func.isRequired,
  onItemRestore: PropTypes.func.isRequired,
};

class HistoryListView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false,
      currentItem: null,
    };
  }

  componentDidMount = () => {
    let historyList = this.props.historyList;
    if (historyList.length > 0) {
      this.setState({currentItem: historyList[0]});
      if (historyList === 1) {
        this.props.onItemClick(historyList[0]);
      } else {
        this.props.onItemClick(historyList[0], historyList[1]);
      }
    }
  }

  onFreezedItemToggle = () => {
    this.setState({isItemFreezed: !this.state.isItemFreezed});
  }

  onScrollHandler = (event) => {
    const clientHeight = event.target.clientHeight;
    const scrollHeight = event.target.scrollHeight;
    const scrollTop    = event.target.scrollTop;
    const isBottom = (clientHeight + scrollTop + 1 >= scrollHeight);
    let hasMore = this.props.hasMore;
    if (isBottom && hasMore) {
      this.props.reloadMore();
    }
  }

  onItemClick = (item, currentIndex) => {
    this.setState({currentItem: item});
    if (currentIndex !== this.props.historyList.length) {
      let preItem = this.props.historyList[currentIndex + 1];
      this.props.onItemClick(item, preItem);
    } else {
      this.props.onItemClick(item);
    }
  }

  render() {
    return (
      <ul className="history-list-container" onScroll={this.onScrollHandler}>
        {this.props.historyList.map((item, index) => {
          return (
            <HisotyListItem
              key={index}
              item={item}
              index={index}
              currentItem={this.state.currentItem}
              isItemFreezed={this.state.isItemFreezed}
              onItemClick={this.onItemClick}
              onItemRestore={this.props.onItemRestore}
              onFreezedItemToggle={this.onFreezedItemToggle}
            />
          );
        })}
        {this.props.isReloadingData && <li><Loading /></li>}
      </ul>
    );
  }
}

HistoryListView.propTypes = propTypes;

export default HistoryListView;