import React from 'react';
import HisotyListItem from './history-list-item';

class HistoryListView extends React.Component {

  onScrollHandler = (event) => {
    const clientHeight = event.target.clientHeight
    const scrollHeight = event.target.scrollHeight
    const scrollTop    = event.target.scrollTop
    const isBottom = (clientHeight + scrollTop === scrollHeight)
    if (isBottom) {
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

export default HistoryListView;