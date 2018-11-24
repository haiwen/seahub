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
      historyList: [],
      activeItem: 0,
      currentPage: 1,
      totalReversionCount: 0,
      loading: false
    };
  }

  componentDidMount() {
    seafileAPI.listFileHistoryRecords(draftOriginRepoID, draftFilePath, 1, this.perPage).then((res) => {
      this.setState({
        historyList: res.data.data,
        totalReversionCount: res.data.total_count
      });
      if (res.data.data.length > 1) {
        axios.all([
          seafileAPI.getFileRevision(draftOriginRepoID, res.data.data[0].commit_id, draftFilePath),
          seafileAPI.getFileRevision(draftOriginRepoID, res.data.data[1].commit_id, draftFilePath)
        ]).then(axios.spread((res1, res2) => {
          axios.all([seafileAPI.getFileContent(res1.data), seafileAPI.getFileContent(res2.data)]).then(axios.spread((content1,content2) => {
            this.props.initialDiffViewerContent(content1.data, content2.data);
          }));
        }));
      } else {
        seafileAPI.getFileRevision(draftOriginRepoID, res.data.data[0].commit_id, draftFilePath).then((res) => {
          seafileAPI.getFileContent(res.data).then((content) => {
            this.props.initialDiffViewerContent(content.data, '');
          });
        });
      }
    });
  }

  onClick = (event, key, preCommitID, currentCommitID)=> {
    if (key === this.state.activeItem) return false;
    this.setState({
      activeItem: key,
    });
    axios.all([
      seafileAPI.getFileRevision(draftOriginRepoID, currentCommitID, draftFilePath),
      seafileAPI.getFileRevision(draftOriginRepoID, preCommitID, draftFilePath)
    ]).then(axios.spread((res1, res2) => {
      axios.all([seafileAPI.getFileContent(res1.data), seafileAPI.getFileContent(res2.data)]).then(axios.spread((content1,content2) => {
        this.props.setDiffViewerContent(content1.data, content2.data);
      }));
    }));
  }

  onScroll = (event) => {
    const clientHeight = event.target.clientHeight;
    const scrollHeight = event.target.scrollHeight;
    const scrollTop    = event.target.scrollTop;
    const isBottom = (clientHeight + scrollTop + 1 >= scrollHeight);
    if (isBottom) {
      if (this.state.totalReversionCount > this.perPage * this.state.currentPage) {
        let currentPage = this.state.currentPage + 1;
        this.setState({
          currentPage: currentPage,
          loading : true
        });
        seafileAPI.listFileHistoryRecords(draftOriginRepoID, draftFilePath, currentPage, this.perPage).then((res) => {
          let currentHistoryList = Object.assign([], this.state.historyList);
          this.setState({
            historyList: [...currentHistoryList, ...res.data.data],
            loading : false
          });
        });
      }
    }
  }

  render() {
    return (
      <div className="history-body" style={{ "height": "500px"}}>
        <ul onScroll={this.onScroll} className={'history-list-container'}>
          {
            this.state.historyList ?
              this.state.historyList.map((item, index = 0, arr) => {
                let preItemIndex = index + 1;
                if (preItemIndex === arr.length) {
                  preItemIndex = index;
                }
                return (
                  <HistoryItem
                  onClick={this.onClick}
                  ctime={item.ctime}
                  className={this.state.activeItem === index ? 'item-active': ''}
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
