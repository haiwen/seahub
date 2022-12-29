import React, { Fragment } from 'react';
import ReactDom from 'react-dom';
import { Button } from 'reactstrap';
import { Utils } from './utils/utils';
import { seafileAPI } from './utils/seafile-api';
import { gettext, PER_PAGE, filePath, fileName, historyRepoID, useNewAPI, canDownload, canCompare } from './utils/constants';
import editUtilities from './utils/editor-utilities';
import Loading from './components/loading';
import Logo from './components/logo';
import CommonToolbar from './components/toolbar/common-toolbar';
import HistoryItem from './pages/file-history-old/history-item';

import './css/layout.css';
import './css/toolbar.css';
import './css/search.css';
import './css/file-history-old.css';

class FileHistory extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      historyList: [],
      currentPage: 1,
      hasMore: false,
      nextCommit: undefined,
      filePath: '',
      oldFilePath: '',
      isLoading: true,
      isReloadingData: false,
    };
  }

  componentDidMount() {
    if (useNewAPI) {
      this.listNewHistoryRecords(filePath, PER_PAGE);
    } else {
      this.listOldHistoryRecords(historyRepoID, filePath);
    }
  }

  listNewHistoryRecords = (filePath, PER_PAGE) => {
    editUtilities.listFileHistoryRecords(filePath, 1, PER_PAGE).then(res => {
      let historyData = res.data;
      if (!historyData) {
        this.setState({isLoading: false});
        throw Error('There is an error in server.');
      }
      this.initNewRecords(res.data);
    });
  }

  listOldHistoryRecords = (repoID, filePath) => {
    seafileAPI.listOldFileHistoryRecords(repoID, filePath).then((res) => {
      let historyData = res.data;
      if (!historyData) {
        this.setState({isLoading: false});
        throw Error('There is an error in server.');
      }
      this.initOldRecords(res.data);
    });
  }

  initNewRecords(result) {
    if (result.total_count < 5) {
      if (result.data.length) {
        let commitID = result.data[result.data.length-1].commit_id;
        let path = result.data[result.data.length-1].path;
        let oldPath = result.data[result.data.length-1].old_path;
        path = oldPath ? oldPath : path;
        seafileAPI.listOldFileHistoryRecords(historyRepoID, path, commitID).then((res) => {
          if (!res.data) {
            this.setState({isLoading: false});
            throw Error('There is an error in server.');
          }
          this.setState({
            historyList: result.data.concat(res.data.data.slice(1, res.data.data.length)),
            isLoading: false,
          });
        });
      } else {
        seafileAPI.listOldFileHistoryRecords(historyRepoID, filePath).then((res) => {
          if (!res.data) {
            this.setState({isLoading: false});
            throw Error('There is an error in server.');
          }
          this.setState({
            historyList: res.data.data,
            isLoading: false,
          });
        });
      }
    } else {
      this.setState({
        historyList: result.data,
        currentPage: result.page,
        hasMore: result.total_count > (PER_PAGE * this.state.currentPage),
        isLoading: false,
      });
    }
  }

  initOldRecords(result) {
    if (result.data.length) {
      this.setState({
        historyList: result.data,
        nextCommit: result.next_start_commit,
        filePath: result.data[result.data.length-1].path,
        oldFilePath: result.data[result.data.length-1].rev_renamed_old_path,
        isLoading: false,
      });
    } else {
      this.setState({nextCommit: result.next_start_commit,});
      if (this.state.nextCommit) {
        seafileAPI.listOldFileHistoryRecords(historyRepoID, filePath, this.state.nextCommit).then((res) => {
          this.initOldRecords(res.data);
        });
      } else {
        this.setState({isLoading: false});
      }
    }
  }

  onScrollHandler = (event) => {
    const clientHeight = event.target.clientHeight;
    const scrollHeight = event.target.scrollHeight;
    const scrollTop = event.target.scrollTop;
    const isBottom = (clientHeight + scrollTop + 1 >= scrollHeight);
    let hasMore = this.state.hasMore;
    if (isBottom && hasMore) {
      this.reloadMore();
    }
  }

  reloadMore = () => {
    if (!this.state.isReloadingData) {
      if (useNewAPI) {
        let currentPage = this.state.currentPage + 1;
        this.setState({
          currentPage: currentPage,
          isReloadingData: true,
        });
        editUtilities.listFileHistoryRecords(filePath, currentPage, PER_PAGE).then(res => {
          this.updateNewRecords(res.data);
        });
      } else {
        let commitID = this.state.nextCommit;
        let filePath = this.state.filePath;
        let oldFilePath = this.state.oldFilePath;
        this.setState({isReloadingData: true});
        if (oldFilePath) {
          seafileAPI.listOldFileHistoryRecords(historyRepoID, oldFilePath, commitID).then((res) => {
            this.updateOldRecords(res.data, oldFilePath);
          });
        } else {
          seafileAPI.listOldFileHistoryRecords(historyRepoID, filePath, commitID).then((res) => {
            this.updateOldRecords(res.data, filePath);
          });
        }
      }
    }
  }

  updateNewRecords(result) {
    this.setState({
      historyList: [...this.state.historyList, ...result.data],
      currentPage: result.page,
      hasMore: result.total_count > (PER_PAGE * this.state.currentPage),
      isReloadingData: false,
    });
  }

  updateOldRecords(result, filePath) {
    if (result.data.length) {
      this.setState({
        historyList: [...this.state.historyList, ...result.data],
        nextCommit: result.next_start_commit,
        filePath: result.data[result.data.length-1].path,
        oldFilePath: result.data[result.data.length-1].rev_renamed_old_path,
        isReloadingData: false,
      });
    } else {
      this.setState({nextCommit: result.next_start_commit,});
      if (this.state.nextCommit) {
        seafileAPI.listOldFileHistoryRecords(historyRepoID, filePath, this.state.nextCommit).then((res) => {
          this.updateOldRecords(res.data, filePath);
        });
      }
    }
  }

  onItemRestore = (item) => {
    let commitId = item.commit_id;
    let filePath = item.path;
    editUtilities.revertFile(filePath, commitId).then(res => {
      if (res.data.success) {
        this.setState({isLoading: true});
        this.refershFileList();
      }
    });
  }

  refershFileList() {
    if (useNewAPI) {
      editUtilities.listFileHistoryRecords(filePath, 1, PER_PAGE).then((res) => {
        this.initNewRecords(res.data);
      });
    } else {
      seafileAPI.listOldFileHistoryRecords(historyRepoID, filePath).then((res) => {
        this.initOldRecords(res.data);
      });
    }
  }

  onSearchedClick = (searchedItem) => {
    Utils.handleSearchedItemClick(searchedItem);
  }

  render() {
    return (
      <Fragment>
        <div id="header" className="old-history-header">
          <div className="logo">
            <Logo showCloseSidePanelIcon={false}/>
          </div>
          <div className='toolbar'>
            <CommonToolbar onSearchedClick={this.onSearchedClick} />
          </div>
        </div>
        <div id="main" onScroll={this.onScrollHandler}>
          <div className="old-history-main">
            <Fragment>
              <a href="javascript:window.history.back()" className="go-back" title="Back">
                <span className="fas fa-chevron-left"></span>
              </a>
              <h2><span className="file-name">{fileName}</span>{' '}{gettext('History Versions')}</h2>
            </Fragment>
            <Fragment>
              <table className="commit-list">
                <thead>
                  <tr>
                    <th width="40%" >{gettext('Time')}</th>
                    <th width="30%" >{gettext('Modifier')}</th>
                    <th width="25%" >{gettext('Size')}</th>
                    <th width="5%" ></th>
                  </tr>
                </thead>
                {!this.state.isLoading &&
                  <tbody>
                    {this.state.historyList.map((item, index) => {
                      return (
                        <HistoryItem
                          key={index}
                          item={item}
                          index={index}
                          canDownload={canDownload}
                          canCompare={canCompare}
                          onItemRestore={this.onItemRestore}
                        />
                      );
                    })}
                  </tbody>
                }
              </table>
              {(this.state.isReloadingData || this.state.isLoading) && <Loading />}
              {this.state.nextCommit && !this.state.isLoading && !this.state.isReloadingData &&
                <Button className="get-more-btn" onClick={this.reloadMore}>{gettext('More')}</Button>
              }
            </Fragment>
          </div>
        </div>
      </Fragment>
    );
  }
}

ReactDom.render(<FileHistory />, document.getElementById('wrapper'));
