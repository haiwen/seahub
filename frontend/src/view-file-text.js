import React from 'react';
import ReactDOM from 'react-dom';
import Account from './components/common/account';
import CodeMirror from 'react-codemirror';
import moment from 'moment';
import { Button, ButtonGroup, Dropdown, DropdownToggle, DropdownMenu, DropdownItem, Tooltip } from 'reactstrap';
import { seafileAPI } from './utils/seafile-api';
import { Utils } from './utils/utils';
import Loading from './components/loading';
import watermark from 'watermark-dom';
import { serviceURL, gettext, siteRoot, mediaUrl, logoPath, logoWidth, logoHeight, siteTitle } from './utils/constants';
import ReviewComments from './components/review-list-view/review-comments';

import 'codemirror/lib/codemirror.css';
import './assets/css/fa-solid.css';
import './assets/css/fa-regular.css';
import './assets/css/fontawesome.css';
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
import './css/view-file-text.css';

const { repoID, repoName, filePath, trafficOverLimit, fileName, fileSize, sharedBy, siteName, enableWatermark, download, encoding, fileContent, sharedToken, fileEncodingList, err, fileExt } = window.app.pageOptions;

const URL = require('url-parse');
const options = {
  lineNumbers: true,
  mode: Utils.chooseLanguage(fileExt.slice(3, fileExt.length -3)),
  extraKeys: {'Ctrl': 'autocomplete'},
  theme: 'default',
  autoMatchParens: true,
  textWrapping: true,
  lineWrapping: true,
  readOnly: 'nocursor',
};

class ViewFileText extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      txtContent: '',
      loading: true,
      fileInfo: {},
      showReviewComment: false,
      commentsNumber: null,
    };
  }

  changeEncode = (e) => {
    let url = new URL(serviceURL) + '/lib/' + repoID + '/file/' + fileName +'/?file_enc=' + e.target.value;
    window.location.href = url.toString();
  }

  fileEncode = () => {
    const list = fileEncodingList.substring(1, fileEncodingList.length - 1).replace(/\'*/g,"").replace(/\s*/g,"").split(',');
    return (
      <div className="file-enc-cont">
        <label htmlFor="file-enc">{gettext('Encoding:')}</label>
        <select id="file-enc" onChange={this.changeEncode} defaultValue={encoding}>
          { list && list.map((value, index) => {
              if (value === 'auto') {
                return (<option value={value} key={index}>{gettext('auto detect')}</option>)
              } else {
                return (<option value={value} key={index}>{value}</option>)
              }
            })
          }
        </select>
      </div>
    );
  }

  handleMouseDown = (option) => {
    switch(option) {
      case 'back':
        let url = new URL(serviceURL) + '/library/' + repoID + '/' + repoName + '/';
        window.location.href = url.toString();
        break;
      case 'lock':
        this.toggleLockFile();
        break;
      case 'history':
        // let urlHistory = new URL(serviceURL) + '/repo/file_revisions/' + repoID + '/?p=' + filePath;
        // window.location.href = urlHistory.toString();
        this.getFileHistory();
        // /?p=/test.c
        // &referer=https%3A%2F%2Fdev.seafile.com%2Fseahub%2Flib%2F26988bea-92db-4a97-8ff5-64d6a9223e26%2Ffile%2Ftest.c
        break;
      case 'edit':
        let urlEdit = new URL(serviceURL) + '/repo/' + repoID + '/file/edit/?p=/' + filePath + '&file_enc=' + encoding;
        window.location.href = urlEdit.toString();
        break;
      case 'download':
        let urlDownload = new URL(window.location.href) + '?dl=1';
        window.location.href = urlDownload.toString();
        break;
      case 'comment':
        this.toggleComment();
        break;
    }
  }

  renderToolbar() {
    return (
      <div className='txt-view-button-group' role={'group'}>
        <ButtonGroup>
          <IconButton
            text={gettext('back_to_parent_directory')}
            id={'parentDirectory'}
            icon={'fa fa-folder-open'}
            onMouseDown={() => this.handleMouseDown('back')}
          />
          <IconButton
            id={'lockButton'}
            text={gettext('lock_file')}
            onMouseDown={() => this.handleMouseDown('lock')}
            icon={'fa fa-lock sf2-icon-lock'}
          />
          <IconButton
            id={'historyButton'}
            text={gettext('file_history')}
            onMouseDown={() => this.handleMouseDown('history')}
            icon={'fa fa-history'}
          />
          <IconButton
            id={'shareBtn'}
            text={gettext('edit')}
            icon={'fa fa-edit'}
            onMouseDown={() => this.handleMouseDown('edit')}
          />
          <IconButton
            id={'downloadButton'}
            text={gettext('download_file')}
            onMouseDown={() => this.handleMouseDown('download')}
            icon={'fa fa-download'}
          />
          <IconButton
            id={'commentButton'}
            text={gettext('comment')}
            onMouseDown={() => this.handleMouseDown('comment')}
            icon={'fa fa-comment'}
          />
        </ButtonGroup>
      </div>
    );
  }

  toggleStar = () => {
    if (this.state.fileInfo.starred) {
      seafileAPI.unStarFile(repoID, filePath).then((res) => {
        this.getFileInfo();
      });
    } else {
      seafileAPI.starFile(repoID, filePath).then((res) => {
        this.getFileInfo();
      });
    }
  }

  toggleComment = () => {
    this.setState({
      showReviewComment: !this.state.showReviewComment
    });
  }

  getFileHistory = () => {
    // const folderPath = filePath.replace(fileName, '')
    // seafileAPI.getFileHistory(repoID, folderPath).then(res => {
    //   console.log(res.data);
    // })
  }

  toggleLockFile = () => {
    seafileAPI.lockfile(repoID, filePath).then((res) => {
      this.getFileInfo();
    });
    // seafileAPI.unlockfile(repoID, filePath).then((res) => {
    //   this.getFileInfo();
    // });
  }

  getFileInfo = () => {
    seafileAPI.getFileInfo(repoID, filePath).then((res) => {
      this.setState({
        fileInfo: res.data
      });
    });
  }

  getFileContent = () => {
    seafileAPI.getFileDownloadLink(repoID, filePath).then((response) => {
      const downloadLink = response.data;
      seafileAPI.getFileContent(downloadLink).then((res) => {
        this.setState({
          txtContent: res.data,
          loading: false
        });
      });
    });
  }

  scrollToQuote() {
    //
  }

  getCommentsNumber() {
    //
  }

  componentDidMount() {
    this.getFileInfo();
    this.getFileContent();
  }

  render() {
    let txtView = this.state.showReviewComment ? 'txt-view-comment' : 'txt-view';
    return (
      <div className="txt-file-view d-flex">
        <div className="txt-file-view-header d-flex">
          <FileInfo
            toggleStar={this.toggleStar}
            editorUtilities={this.props.editorUtilities}
            fileInfo={this.state.fileInfo}
            serviceURL={serviceURL}
          />
          {this.renderToolbar()}
        </div>
        <div className="txt-file-view-body d-flex">
          {this.fileEncode()}
          <div className={txtView}>
            {(this.state.loading && !this.state.txtContent) ? <Loading/> :
              <React.Fragment>
                <CodeMirror
                  ref="code-mirror-editor"
                  value={this.state.txtContent}
                  options={options}
                />
                { this.state.showReviewComment &&
                  <ReviewComments
                    scrollToQuote={this.scrollToQuote}
                    getCommentsNumber={this.getCommentsNumber}
                    commentsNumber={this.state.commentsNumber}
                    inResizing={false}
                  />
                }
              </React.Fragment>
            }
          </div>
        </div>
      </div>
    );
  }
}


class IconButton extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      tooltipOpen: false
    };
  }

  toggle = () => {
    this.setState({ tooltipOpen: !this.state.tooltipOpen });
  }

  render() {
    let className = 'btn btn-icon btn-secondary btn-active';
    return (
      <button
        id={this.props.id}
        type={'button'}
        onMouseDown={this.props.disabled? null : this.props.onMouseDown}
        className={className}
        data-active={ this.props.isActive || false }
        disabled={this.props.disabled}>
        <i className={this.props.icon}/>
        <Tooltip
          toggle={this.toggle}
          delay={{show: 0, hide: 0}}
          target={this.props.id}
          placement='bottom'
          isOpen={this.state.tooltipOpen}>
          {this.props.text}
        </Tooltip>
      </button>
    );
  }
}


class FileInfo extends React.PureComponent {

  constructor(props) {
    super(props);
  }

  render() {
    let fileInfo = this.props.fileInfo;
    let modifyTime = moment(fileInfo.mtime*1000).format('YYYY-MM-DD HH:mm');
    const url = this.props.serviceURL + '/profile/' + fileInfo.last_modifier_email + '/';
    return (
      <div className={'file-info-wrapper'}>
        <div className="topbar-file-info">
          <h2 className="file-view-hd d-flex">
            <span className='file-name'>{fileInfo.name}</span>
            <span className='file-star' title={fileInfo.starred ? gettext('unstar'): ('star')}>
              <i onClick={this.props.toggleStar} className={fileInfo.starred? 'fa fa-star star': 'far fa-star'}/>
            </span>
          </h2>
          <div className="file-state">
            <span className={'file-modifier-name'}><a href={url}>{fileInfo.last_modifier_name}</a></span>{' '}
            <span className={'file-modifier-time'}>{modifyTime}</span>{' '}
            <span className={'file-edit'}>{gettext('updated this file.')}</span>
          </div>
        </div>
      </div>
    );
  }
}


if (enableWatermark) {
  const loginUser = window.app.userInfo.name;
  let watermark_txt;
  if (loginUser) {
    watermark_txt = siteName + "  " + loginUser;
  } else {
    watermark_txt = gettext("Anonymous User");
  }
  watermark.init({
    watermark_txt: watermark_txt,
    watermark_alpha: 0.075
  });
}

ReactDOM.render (
  <ViewFileText />,
  document.getElementById('root')
);