import React, { Fragment } from 'react';
import ReactDOM from 'react-dom';
import { Utils } from './utils/utils';
import { seafileAPI } from './utils/seafile-api';
import { siteRoot, gettext, PER_PAGE, filePath, fileName, historyRepoID, useNewAPI } from './utils/constants';
import editUtilties from './utils/editor-utilties';
import Loading from './components/loading';
import Logo from './components/logo';
import CommonToolbar from './components/toolbar/common-toolbar';
import HistoryItem from './pages/file-history-old/history-item';

import './assets/css/fa-solid.css';
import './assets/css/fa-regular.css';
import './assets/css/fontawesome.css';
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
      isError: false,
      fileOwner: '',
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
    editUtilties.listFileHistoryRecords(filePath, 1, PER_PAGE).then(res => {
      let historyData = res.data;
      if (!historyData) {
        this.setState({isLoading: false});
        throw Error('There is an error in server.');
      }
      this.initResultState(res.data);
    });
  }

  listOldHistoryRecords = (repoID, filePath) => {
    seafileAPI.listOldFileHistoryRecords(repoID, filePath).then((res) => {
      let historyData = res.data;
      if (!historyData) {
        this.setState({isLoading: false});
        throw Error('There is an error in server.');
      }
      this.initResultState(res.data);
    });
  }

  initResultState(result) {
    if (result.data.length) {
      if (useNewAPI) {
        this.setState({
          historyList: result.data,
          currentPage: result.page,
          hasMore: result.total_count > (PER_PAGE * this.state.currentPage),
          isLoading: false,
          isError: false,
          fileOwner: result.data[0].creator_email,
        });
      } else {
        this.setState({
          historyList: result.data,
          nextCommit: result.next_start_commit,
          hasMore: result.next_start_commit ? true : false,
          filePath: result.data[result.data.length-1].path,
          oldFilePath: result.data[result.data.length-1].rev_renamed_old_path,
          isLoading: false,
          isError: false,
          fileOwner: result.data[0].creator_email,
        });
        if (this.state.historyList.length < 25 && this.state.hasMore) {
          this.reloadMore();
        }
      }
    } else {
      this.setState({
        nextCommit: result.next_start_commit,
        isError: false,
      });
      if (this.state.nextCommit) {
        seafileAPI.listOldFileHistoryRecords(historyRepoID, filePath, this.state.nextCommit).then((res) => {
          this.setState({isReloadingData: false});
          this.updateResultState(res.data);
        });
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
        editUtilties.listFileHistoryRecords(filePath, currentPage, PER_PAGE).then(res => {
          this.updateResultState(res.data);
          this.setState({isReloadingData: false});
        });
      } else {
        let commitID = this.state.nextCommit;
        let filePath = this.state.filePath;
        let oldFilePath = this.state.oldFilePath;
        this.setState({isReloadingData: true});
        if (oldFilePath) {
          seafileAPI.listOldFileHistoryRecords(historyRepoID, oldFilePath, commitID).then((res) => {
            this.setState({isReloadingData: false});
            this.updateResultState(res.data);
          });
        } else {
          seafileAPI.listOldFileHistoryRecords(historyRepoID, filePath, commitID).then((res) => {
            this.setState({isReloadingData: false});
            this.updateResultState(res.data);
          });
        }
      }
    }
  }

  updateResultState(result) {
    if (result.data.length) {
      if (useNewAPI) {
        this.setState({
          historyList: [...this.state.historyList, ...result.data],
          currentPage: result.page,
          hasMore: result.total_count > (PER_PAGE * this.state.currentPage),
          isLoading: false,
          isError: false,
          fileOwner: result.data[0].creator_email
        });
      } else {
        this.setState({
          historyList: [...this.state.historyList, ...result.data],
          nextCommit: result.next_start_commit,
          hasMore: result.next_start_commit ? true : false,
          filePath: result.data[result.data.length-1].path,
          oldFilePath: result.data[result.data.length-1].rev_renamed_old_path,
          isLoading: false,
          isError: false,
          fileOwner: result.data[0].creator_email,
        });
        if (this.state.historyList.length < 25 && this.state.hasMore) {
          this.reloadMore();
        }
      }
    } else {
      this.setState({
        nextCommit: result.next_start_commit,
        isError: false,
      });
      if (this.state.nextCommit) {
        seafileAPI.listOldFileHistoryRecords(historyRepoID, filePath, this.state.nextCommit).then((res) => {
          this.setState({isReloadingData: false});
          this.updateResultState(res.data);
        });
      }
    }
  }

  onItemRestore = (item) => {
    let commitId = item.commit_id;
    let filePath = item.path;
    editUtilties.revertFile(filePath, commitId).then(res => {
      if (res.data.success) {
        this.setState({isLoading: true});
        this.refershFileList();
      }
    });
  }

  refershFileList() {
    if (useNewAPI) {
      editUtilties.listFileHistoryRecords(filePath, 1, PER_PAGE).then((res) => {
        this.initResultState(res.data);
      });
    } else {
      seafileAPI.listOldFileHistoryRecords(historyRepoID, filePath).then((res) => {
        this.initResultState(res.data);
      });
    }
  }

  onCloseSidePanel = () => {}

  onSearchedClick = (selectedItem) => {
    if (selectedItem.is_dir === true) {
      let url = siteRoot + 'library/' + selectedItem.repo_id + '/' + selectedItem.repo_name + selectedItem.path;
      let newWindow = window.open('about:blank');
      newWindow.location.href = url;
    } else {
      let url = siteRoot + 'lib/' + selectedItem.repo_id + '/file' + Utils.encodePath(selectedItem.path);
      let newWindow = window.open('about:blank');
      newWindow.location.href = url;
    }
  }

  render() {
    return (
      <Fragment>
        <div id="header" className="old-history-header">
          <div className="logo">
            <Logo onCloseSidePanel={this.onCloseSidePanel} />
          </div>
          <div className='toolbar'>
            <CommonToolbar onSearchedClick={this.onSearchedClick} />
          </div>
        </div>
        <div id="main" onScroll={this.onScrollHandler}>
          <div className="old-history-main">
            <div>
              <a href="javascript:window.history.back()" className="go-back" title="Back">
                <span className="fas fa-chevron-left"></span>
              </a>
              <h2><span className="file-name">{fileName}</span>{' '}{gettext('History Versions')}</h2>
              <p>{gettext('A new version will be generated after each modification, and you can restore the file to a previous version.')}</p>
            </div>
            <div>
              {this.state.isLoading && <Loading />}
              {!this.state.isLoading &&
                <table className="commit-list">
                  <thead>
                    <tr>
                      <th width="25%" >{gettext('Time')}</th>
                      <th width="25%" >{gettext('Modifier')}</th>
                      <th width="20%" >{gettext('Size')}</th>
                      <th width="30%" >{gettext('Operation')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {this.state.historyList.map((item, index) => {
                      return (
                        <HistoryItem
                          key={index} 
                          item={item}
                          index={index}
                          onItemRestore={this.onItemRestore}
                        />
                      );
                    })}
                  </tbody>
                </table>
              }
              {this.state.isReloadingData && <Loading />}
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

ReactDOM.render (
  <FileHistory />,
  document.getElementById('wrapper')
);
