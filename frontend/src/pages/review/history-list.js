/* eslint-disable linebreak-style */
import React from 'react';
import axios from 'axios';
import Loading from '../../components/loading';
import moment from 'moment';
import { seafileAPI } from '../../utils/seafile-api';
import { draftOriginRepoID, draftFilePath, draftOriginFilePath } from '../../utils/constants';

import '../../css/file-history.css';

moment.locale(window.app.config.lang);

class HistoryList extends React.Component {

  constructor(props) {
    super(props);
    this.perPage = 25;
    this.state = {
      currentPage: 1,
      loading: false
    };
  }

  onClick = (event, key, preCommitID, currentCommitID)=> {
    if (key === this.state.activeItem) return false;
    this.props.onHistoryItemClick(currentCommitID, preCommitID, key);
  }

  onScroll = (event) => {
    const clientHeight = event.target.clientHeight;
    const scrollHeight = event.target.scrollHeight;
    const scrollTop    = event.target.scrollTop;
    const isBottom = (clientHeight + scrollTop + 1 >= scrollHeight);
    if (isBottom) {
      if (this.props.totalReversionCount > this.perPage * this.state.currentPage) {
        let currentPage = this.state.currentPage + 1;
        this.setState({
          currentPage: currentPage,
          loading : true
        });
        seafileAPI.listFileHistoryRecords(draftOriginRepoID, draftFilePath, currentPage, this.perPage).then((res) => {
          let currentHistoryList = Object.assign([], this.props.historyList);
          this.props.onHistoryListChange([...currentHistoryList, ...res.data.data]);
          this.setState({
            loading : false
          });
        });
      }
    }
  }

  render() {
    return (
      <div className="history-body" style={{ 'height': '500px'}}>
        <ul onScroll={this.onScroll} className={'history-list-container'}>
          {
            this.props.historyList ?
              this.props.historyList.map((item, index = 0, arr) => {
                let preItemIndex = index + 1;
                if (preItemIndex === arr.length) {
                  preItemIndex = index;
                }
                return (
                  <HistoryItem
                    onClick={this.onClick}
                    ctime={item.ctime}
                    className={this.props.activeItem === index ? 'item-active': ''}
                    currentCommitId={item.commit_id}
                    name={item.creator_name}
                    index={index}
                    key={index}
                    preCommitId={arr[preItemIndex].commit_id}
                  />
                );
              }) : <Loading/>
          }
          {
            this.state.loading &&
            <li className={'reloading-reversion'}><Loading /></li>
          }
        </ul>
      </div>
    );
  }
}

class HistoryItem extends React.Component {
  render() {
    let time = moment.parseZone(this.props.ctime).format('YYYY-MM-DD HH:mm');
    return (
      <li onClick={(event) => this.props.onClick(event, this.props.index, this.props.preCommitId, this.props.currentCommitId)} className={'history-list-item ' + this.props.className}>
        <div className="history-info">
          <div className="time">{time}</div>
          <div className="owner"><i className="squire-icon"/><span>{this.props.name}</span></div>
        </div>
      </li>
    );
  }
}


export default HistoryList;
