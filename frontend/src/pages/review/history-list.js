/* eslint-disable linebreak-style */
import React from 'react';
import axios from 'axios';
import Loading from '../../components/loading';
import moment from 'moment';
import { seafileAPI } from '../../utils/seafile-api';
import { draftRepoID, draftFilePath, draftOriginFilePath } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';

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

  onClick = (event, key, preItem, currentItem)=> {
    if (key === this.state.activeItem) return false;
    this.props.onHistoryItemClick(currentItem, preItem, key);
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
        seafileAPI.listFileHistoryRecords(draftRepoID, draftFilePath, currentPage, this.perPage).then((res) => {
          let currentHistoryList = Object.assign([], this.props.historyList);
          this.props.onHistoryListChange([...currentHistoryList, ...res.data.data]);
          this.setState({
            loading : false
          });
        }).catch(error => {
          let errMessage = Utils.getErrorMsg(error);
          toaster.danger(errMessage);
        });
      }
    }
  }

  render() {
    return (
      <div className="history-body">
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
                    name={item.creator_name}
                    index={index}
                    key={index}
                    preItem={arr[preItemIndex]}
                    currentItem={item}
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
      <li onClick={(event) => this.props.onClick(event, this.props.index, this.props.preItem, this.props.currentItem)} className={'history-list-item ' + this.props.className}>
        <div className="history-info">
          <div className="time">{time}</div>
          <div className="owner"><i className="squire-icon"/><span>{this.props.name}</span></div>
        </div>
      </li>
    );
  }
}


export default HistoryList;
