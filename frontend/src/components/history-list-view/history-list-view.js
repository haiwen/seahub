import React from 'react';
import PropTypes from 'prop-types';
import HisotyListItem from './history-list-item';

const propTypes = {
  hasMore: PropTypes.bool.isRequired,
  isItemFrezeed: PropTypes.bool.isRequired,
  historyList: PropTypes.array.isRequired,
  currentItem: PropTypes.object,
  reloadMore: PropTypes.func.isRequired,
  onMenuControlClick: PropTypes.func.isRequired,
  onHistoryItemClick: PropTypes.func.isRequired,
};

class HistoryListView extends React.Component {

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

  render() {
    return (
      <ul className="history-list-container" onScroll={this.onScrollHandler}>
        {this.props.historyList.map((item, index) => {
          return (
            <HisotyListItem
              key={index} 
              item={item}
              isFirstItem={index === 0}
              currentItem={this.props.currentItem}
              isItemFrezeed={this.props.isItemFrezeed}
              onMenuControlClick={this.props.onMenuControlClick}
              onHistoryItemClick={this.props.onHistoryItemClick}
            />
          );
        })}
      </ul>
    );
  }
}

HistoryListView.propTypes = propTypes;

export default HistoryListView;