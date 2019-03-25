import React from 'react';
import ReactDOM from 'react-dom';
import watermark from 'watermark-dom';
import { seafileAPI } from './utils/seafile-api';
import { siteRoot, siteName, gettext } from './utils/constants';
import FileInfo from './components/file-view/file-info';
import FileToolbar from './components/file-view/file-toolbar';
import FileViewTip from './components/file-view/file-view-tip';
import CommentPanel from './components/file-view/comment-panel';
import Loading from './components/loading';

import './css/file-view.css';
import './css/spreadsheet-file-view.css';

const { isStarred, isLocked, lockedByMe,
  repoID, filePath, err, enableWatermark, userNickName,
  // the following are only for this type of file view
  commitID, fileType, fileName
} = window.app.pageOptions;

class ViewFileSpreadsheet extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isStarred: isStarred,
      isLocked: isLocked,
      lockedByMe: lockedByMe,
      isCommentPanelOpen: false
    };
  }

  toggleCommentPanel = () => {
    this.setState({
      isCommentPanelOpen: !this.state.isCommentPanelOpen
    });
  }

  toggleStar = () => {
    if (this.state.isStarred) {
      seafileAPI.unStarItem(repoID, filePath).then((res) => {
        this.setState({
          isStarred: false
        });
      });
    } else {
      seafileAPI.starItem(repoID, filePath).then((res) => {
        this.setState({
          isStarred: true
        });
      });
    }
  }

  toggleLockFile = () => {
    if (this.state.isLocked) {
      seafileAPI.unlockfile(repoID, filePath).then((res) => {
        this.setState({
          isLocked: false, 
          lockedByMe: false 
        });
      });
    } else {
      seafileAPI.lockfile(repoID, filePath).then((res) => {
        this.setState({
          isLocked: true,
          lockedByMe: true
        });
      });
    }    
  }

  render() {
    return (
      <div className="h-100 d-flex flex-column">
        <div className="file-view-header d-flex justify-content-between">
          <FileInfo
            isStarred={this.state.isStarred}
            isLocked={this.state.isLocked}
            toggleStar={this.toggleStar}
          />
          <FileToolbar 
            isLocked={this.state.isLocked}
            lockedByMe={this.state.lockedByMe}
            toggleLockFile={this.toggleLockFile}
            toggleCommentPanel={this.toggleCommentPanel}
          />
        </div>
        <div className="file-view-body flex-auto d-flex">
          <FileContent />
          {this.state.isCommentPanelOpen &&
            <CommentPanel toggleCommentPanel={this.toggleCommentPanel} />
          }
        </div>
      </div>
    );
  }
}

class FileContent extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isLoading: !err,
      errorMsg: ''
    };
  }

  componentDidMount() {
    if (err) {
      return;
    }

    let queryStatus = () => {
      seafileAPI.queryOfficeFileConvertStatus(repoID, commitID, filePath, fileType.toLowerCase()).then((res) => {
        const convertStatus = res.data['status'];
        switch (convertStatus) {
          case 'QUEUED':
          case 'PROCESSING':
            this.setState({
              isLoading: true
            });
            setTimeout(queryStatus, 2000);
            break;
          case 'ERROR':
            this.setState({
              isLoading: false,
              errorMsg: gettext('Document convertion failed.')
            });
            break;
          case 'DONE':
            this.setState({
              isLoading: false,
              errorMsg: ''
            });
        }
      }).catch((error) => {
        if (error.response) {
          this.setState({
            isLoading: false,
            errorMsg: gettext('Document convertion failed.')
          });
        } else {
          this.setState({
            isLoading: false,
            errorMsg: gettext('Please check the network.')
          });
        }
      });
    };

    queryStatus();
  }

  setIframeHeight = (e) => {
    const iframe = e.currentTarget;
    iframe.height = iframe.contentDocument.body.scrollHeight;
  }

  render() {
    const { isLoading, errorMsg } = this.state;

    if (err) {
      return <FileViewTip />;
    }

    if (isLoading) {
      return <Loading />;
    }

    if (errorMsg) {
      return <FileViewTip errorMsg={errorMsg} />;
    }

    return (
      <div className="file-view-content flex-1 spreadsheet-file-view">
        <iframe id="spreadsheet-container" title={fileName} src={`${siteRoot}office-convert/static/${repoID}/${commitID}${encodeURIComponent(filePath)}/index.html`} onLoad={this.setIframeHeight}></iframe>
      </div>
    );
  }
}

if (enableWatermark) {
  watermark.init({
    watermark_txt: `${siteName} ${userNickName}`,
    watermark_alpha: 0.075
  });
}

ReactDOM.render (
  <ViewFileSpreadsheet />,
  document.getElementById('wrapper')
);
