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
      isLoading: true,
      isError: false,
      fileOwner: '',
      isReloadingData: false,
    };
  }

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

  onCloseSidePanel = () => {
    // do nothing
  }

  componentDidMount() {
    if (useNewAPI) {
      editUtilties.listFileHistoryRecords(filePath, 1, PER_PAGE).then(res => {
        let historyList = res.data;
        if (historyList.length === 0) {
          this.setState({isLoading: false});
          throw Error('there has an error in server');
        }
        this.initResultState(res.data);
      });
    } else {
      seafileAPI.getFileHistory(historyRepoID, filePath).then((res) => {
        let historyList = res.data;
        if (historyList.length === 0) {
          this.setState({isLoading: false});
          throw Error('there has an error in server');
        }
        this.initResultState(res.data);
      })
    }

  }

  refershFileList() {
    editUtilties.listFileHistoryRecords(filePath, 1, PER_PAGE).then(res => {
      this.initResultState(res.data);
    });
  }

  initResultState(result) {
    if (useNewAPI) {
      if (result.data.length) {
        this.setState({
          historyList: result.data,
          currentPage: result.page,
          hasMore: result.total_count > (PER_PAGE * this.state.currentPage),
          isLoading: false,
          isError: false,
          fileOwner: result.data[0].creator_email,
        });
      }
    } else {
      if (result.data.length) {
        this.setState({
          historyList: result.data,
          isLoading: false,
          isError: false,
          fileOwner: result.data[0].creator_email,
        });
      }
    }
  }

  updateResultState(result) {
    if (result.data.length) {
      this.setState({
        historyList: [...this.state.historyList, ...result.data],
        currentPage: result.page,
        hasMore: result.total_count > (PER_PAGE * this.state.currentPage),
        isLoading: false,
        isError: false,
        fileOwner: result.data[0].creator_email
      });
    }
  }

  reloadMore = () => {
    if (!this.state.isReloadingData) {
      let currentPage = this.state.currentPage + 1;
      this.setState({
        currentPage: currentPage,
        isReloadingData: true,
      });
      editUtilties.listFileHistoryRecords(filePath, currentPage, PER_PAGE).then(res => {
        this.updateResultState(res.data);
        this.setState({isReloadingData: false});
      });
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

  onItemRestore = (item) => {
    let commitId = item.commit_id;
    editUtilties.revertFile(filePath, commitId).then(res => {
      if (res.data.success) {
        this.setState({isLoading: true});
        this.refershFileList();
      }
    });
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
              <h2><span className="file-name">{fileName}</span>{gettext(' History Versions')}</h2>
              <p>{gettext('Tip: a new version will be generated after each modification, and you can restore the file to a previous version.')}</p>
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
