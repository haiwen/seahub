import React from 'react';
import ReactDOM from 'react-dom';
import watermark from 'watermark-dom';
import { seafileAPI } from './utils/seafile-api';
import { Utils } from './utils/utils';
import { siteName } from './utils/constants';
import FileInfo from './components/file-view/file-info';
import FileToolbar from './components/file-view/file-toolbar';
import FileViewTip from './components/file-view/file-view-tip';
import CommentPanel from './components/file-view/comment-panel';

import CodeMirror from 'react-codemirror';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/css/css';
import 'codemirror/mode/clike/clike';
import 'codemirror/mode/php/php';
import 'codemirror/mode/sql/sql';
import 'codemirror/mode/vue/vue';
import 'codemirror/mode/xml/xml';
import 'codemirror/mode/go/go';
import 'codemirror/mode/python/python';
import 'codemirror/mode/htmlmixed/htmlmixed';
import 'codemirror/lib/codemirror.css';

import './assets/css/fa-solid.css';
import './assets/css/fa-regular.css';
import './assets/css/fontawesome.css';

import './css/file-view.css';
import './css/text-file-view.css';

const { isStarred, isLocked, lockedByMe,
  repoID, filePath, err, enableWatermark, userNickName,
  // the following are only for text file view
  fileExt, fileContent
} = window.app.pageOptions;

const options = {
  lineNumbers: false,
  mode: Utils.chooseLanguage(fileExt.slice(3, fileExt.length -3)),
  extraKeys: {'Ctrl': 'autocomplete'},
  theme: 'default',
  autoMatchParens: true,
  textWrapping: true,
  lineWrapping: true,
  readOnly: 'nocursor'
};

class ViewFileText extends React.Component {

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
      seafileAPI.unStarFile(repoID, filePath).then((res) => {
        this.setState({
          isStarred: false
        });
      });
    } else {
      seafileAPI.starFile(repoID, filePath).then((res) => {
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

  render() {

    if (err) {
      return <FileViewTip />;
    }
    return (
      <div className="file-view-content flex-1 text-file-view">
        <CodeMirror
          ref="code-mirror-editor"
          value={fileContent}
          options={options}
        />
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
  <ViewFileText />,
  document.getElementById('wrapper')
);
