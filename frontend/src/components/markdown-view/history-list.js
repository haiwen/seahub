/* eslint-disable linebreak-style */
import React from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import Loading from '../loading';
import moment from 'moment';
import { gettext } from '../../utils/constants';
import '../../css/markdown-viewer/history-viewer.css';

const propTypes = {
  editorApi: PropTypes.object.isRequired,
  showDiffViewer: PropTypes.func.isRequired,
  setDiffViewerContent: PropTypes.func.isRequired,
  reloadDiffContent: PropTypes.func.isRequired,
};

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
    this.props.editorApi.listFileHistoryRecords(1, this.perPage).then((res) => {
      this.setState({
        historyList: res.data.data,
        totalReversionCount: res.data.total_count
      });
      if (res.data.data.length > 1) {
        axios.all([
          this.props.editorApi.getFileHistoryVersion(res.data.data[0].commit_id, res.data.data[0].path),
          this.props.editorApi.getFileHistoryVersion(res.data.data[1].commit_id, res.data.data[1].path)
        ]).then(axios.spread((res1, res2) => {
          axios.all([this.props.editorApi.getFileContent(res1.data), this.props.editorApi.getFileContent(res2.data)]).then(axios.spread((content1,content2) => {
            this.props.showDiffViewer();
            this.props.setDiffViewerContent(content1.data, content2.data);
          }));
        }));
      } else {
        this.props.editorApi.getFileHistoryVersion(res.data.data[0].commit_id, res.data.data[0].path).then((res) => {
          this.props.editorApi.getFileContent(res.data).then((content) => {
            this.props.showDiffViewer();
            this.props.setDiffViewerContent(content.data, '');
          });
        });
      }
    });
  }

  onClick = (event, key, preItem, currentItem)=> {
    if (key === this.state.activeItem) return false;
    this.props.reloadDiffContent();
    this.setState({
      activeItem: key,
    });
    axios.all([
      this.props.editorApi.getFileHistoryVersion(currentItem.commit_id, currentItem.path),
      this.props.editorApi.getFileHistoryVersion(preItem.commit_id, preItem.path)
    ]).then(axios.spread((res1, res2) => {
      axios.all([this.props.editorApi.getFileContent(res1.data), this.props.editorApi.getFileContent(res2.data)]).then(axios.spread((content1,content2) => {
        this.props.showDiffViewer();
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
        this.props.editorApi.listFileHistoryRecords(currentPage, this.perPage).then((res) => {
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
      <div className="seafile-history-side-panel">
        <div className="seafile-history-title">
          <div onClick={this.props.toggleHistoryPanel} className={'seafile-history-title-close'}>
            <i className={'fa fa-times-circle'}/>
          </div>
          <div className={'seafile-history-title-text'}>{gettext('History Versions')}</div>
        </div>
        <ul onScroll={this.onScroll} className={'history-list-container'}>
          {this.state.historyList ?
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
                  currentItem={item}
                  name={item.creator_name}
                  index={index}
                  key={index}
                  preItem={arr[preItemIndex]}
                />
              );
            }) : <Loading/>
          }
          {
            this.state.loading &&
            <li className={'reloading-reversion'}><Loading style={{width: '0.5rem', margin: '0 auto', color: '#b0b0b0'}}/></li>
          }
        </ul>
      </div>
    );
  }
}

HistoryList.propTypes = propTypes;


const HistoryItempropTypes = {
  ctime: PropTypes.string,
  onClick: PropTypes.func,
  index: PropTypes.number,
  preItem: PropTypes.object,
  currewntItem: PropTypes.object,
  name: PropTypes.string,
  className: PropTypes.string,
};

class HistoryItem extends React.Component {
  render() {
    let time = moment.parseZone(this.props.ctime).format('YYYY-MM-DD HH:mm');
    return (
      <li onClick={(event) => this.props.onClick(event, this.props.index, this.props.preItem, this.props.currentItem)} className={'history-item-container ' + this.props.className}>
        <div className="time">{time}</div>
        <div className="owner"><i className="fa fa-square"/><span>{this.props.name}</span></div>
      </li>
    );
  }
}

HistoryItem.propTypes = HistoryItempropTypes;


export default HistoryList;
