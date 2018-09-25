import React from 'react';
import PropTypes from 'prop-types';
import HisotyListItem from './history-list-item';
import Loading from '../loading';
import axios from 'axios';
import editUtilties from '../../utils/editor-utilties';
import URLDecorator from '../../utils/url-decorator';
import { filePath } from '../constants';

const propTypes = {
  hasMore: PropTypes.bool.isRequired,
  isReloadingData: PropTypes.bool.isRequired,
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

  componentDidMount() {
    let historyList = this.props.historyList;
    if (historyList.length > 1) {
      let downLoadURL = URLDecorator.getUrl({type: 'download_historic_file', filePath: filePath, objID: historyList[0].rev_file_id});
      let downLoadURL1 = URLDecorator.getUrl({type: 'download_historic_file', filePath: filePath, objID: historyList[1].rev_file_id});
      axios.all([
        editUtilties.getFileContent(downLoadURL),
        editUtilties.getFileContent(downLoadURL1)
      ]).then(axios.spread((res1, res2) => {
        this.props.setDiffContent(res1.data, res2.data);
      }));
    } else {
      let downLoadURL = URLDecorator.getUrl({type: 'download_historic_file', filePath: filePath, objID: historyList[0].rev_file_id});
      axios.all([
        editUtilties.getFileContent(downLoadURL),
      ]).then(axios.spread((res1) => {
        this.props.setDiffContent(res1.data, '');
      }));
    }
   
  }

  render() {
    return (
      <ul className="history-list-container" onScroll={this.onScrollHandler}>
        {this.props.historyList.map((item, index, historyList) => {
          let preItemIndex = index + 1;
          if (preItemIndex === historyList.length) {
            preItemIndex = index;
          }
          return (
            <HisotyListItem
              key={index} 
              item={item}
              isFirstItem={index === 0}
              preCommitID={historyList[preItemIndex].rev_file_id}
              currentItem={this.props.currentItem}
              isItemFrezeed={this.props.isItemFrezeed}
              onMenuControlClick={this.props.onMenuControlClick}
              onHistoryItemClick={this.props.onHistoryItemClick}
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