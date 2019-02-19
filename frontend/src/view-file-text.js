import React from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import CodeMirror from 'react-codemirror';
import moment from 'moment';
import watermark from 'watermark-dom';
import { ButtonGroup, Tooltip } from 'reactstrap';
import { seafileAPI } from './utils/seafile-api';
import { Utils } from './utils/utils';
import { serviceURL, gettext, mediaUrl } from './utils/constants';
import InternalLinkDialog from './components/dialog/internal-link-dialog';
import CommentsList from './components/comments-list';
import 'codemirror/lib/codemirror.css';
import './assets/css/fa-solid.css';
import './assets/css/fa-regular.css';
import './assets/css/fontawesome.css';
import './css/view-file-text.css';
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

const { isPro, repoID, repoName, filePath, fileName, siteName, enableWatermark, encoding, fileEncodingList, fileExt, isLocked, fileContent, latestContributor, lastModified, isStarred } = window.app.pageOptions;
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
      isLocked: isLocked,
      star: isStarred,
    };
  }

  changeEncode = (e) => {
    window.location.href = serviceURL + '/lib/' + repoID + '/file/' + fileName +'/?file_enc=' + e.target.value;
  }

  fileEncode = () => {
    const list = fileEncodingList.substring(1, fileEncodingList.length - 1).replace(/\'*/g,'').replace(/\s*/g,'').split(',');
    return (
      <div className="file-enc-cont">
        <label htmlFor="file-enc">{gettext('Encoding:')}</label>
        <select id="file-enc" onChange={this.changeEncode} defaultValue={encoding}>
          { list && list.map((value, index) => {
            if (value === 'auto') {
              return (<option value={value} key={index}>{gettext('auto detect')}</option>);
            } else {
              return (<option value={value} key={index}>{value}</option>);
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
        window.location.href = serviceURL + '/library/' + repoID + '/' + repoName + '/';
        break;
      case 'lock':
        this.toggleLockFile();
        break;
      case 'history':
        window.location.href = serviceURL + '/repo/file_revisions/' + repoID + '/?p=' + filePath;
        break;
      case 'edit':
        window.location.href = serviceURL + '/repo/' + repoID + '/file/edit/?p=' + filePath + '&file_enc=' + encoding;
        break;
      case 'download':
        window.location.href = serviceURL + '/lib/' + repoID + '/file/' + filePath +'?dl=1';
        break;
      case 'comment':
        this.toggleCommentsList();
        break;
    }
  }

  renderToolbar() {
    return (
      <div className="txt-view-button-group d-flex" role="group">
        <ButtonGroup>
          <IconButton
            text={gettext('Back to parent directory')}
            id={'parentDirectory'}
            icon={'fa fa-folder-open'}
            onMouseDown={() => this.handleMouseDown('back')}
          />
          {isPro === 'True' &&
            <IconButton
              id={'lockButton'}
              text={gettext('Lock File')}
              onMouseDown={() => this.handleMouseDown('lock')}
              icon={'fa fa-lock'}
            />
          }
          <IconButton
            id={'historyButton'}
            text={gettext('File History')}
            onMouseDown={() => this.handleMouseDown('history')}
            icon={'fa fa-history'}
          />
          <IconButton
            id={'shareBtn'}
            text={gettext('Edit')}
            icon={'fa fa-edit'}
            onMouseDown={() => this.handleMouseDown('edit')}
          />
          <IconButton
            id={'downloadButton'}
            text={gettext('Download File')}
            onMouseDown={() => this.handleMouseDown('download')}
            icon={'fa fa-download'}
          />
          <IconButton
            id={'commentButton'}
            text={gettext('Comment')}
            onMouseDown={() => this.handleMouseDown('comment')}
            icon={'fa fa-comment'}
          />
        </ButtonGroup>
      </div>
    );
  }

  toggleCommentsList = () => {
    this.setState({
      showCommentsList: !this.state.showCommentsList
    });
  }

  toggleStar = () => {
    if (this.state.star) {
      seafileAPI.unStarItem(repoID, filePath).then((res) => {
        this.setState({
          star: false,
        });
      });
    } else {
      seafileAPI.starItem(repoID, filePath).then((res) => {
        this.setState({
          star: true,
        });
      });
    }
  }

  toggleLockFile = () => {
    if (this.state.isLocked) {
      seafileAPI.unlockfile(repoID, filePath).then((res) => {
        this.setState({
          isLocked: res.data.is_locked
        });
      });
    } else {
      seafileAPI.lockfile(repoID, filePath).then((res) => {
        this.setState({
          isLocked: res.data.is_locked
        });
      });
    }    
  }

  render() {
    return (
      <div className="txt-file-view d-flex">
        <div className="txt-file-view-header d-flex">
          <FileInfo
            toggleStar={this.toggleStar}
            star={this.state.star}
            serviceURL={serviceURL}
            isLocked={this.state.isLocked}
          />
          {this.renderToolbar()}
        </div>
        <div className="txt-file-view-body d-flex">
          {!this.state.showCommentsList && this.fileEncode()}
          <div className={this.state.showCommentsList ? 'txt-view-comment' : 'txt-view'}>
            <CodeMirror
              ref="code-mirror-editor"
              value={fileContent}
              options={options}
            />
            { this.state.showCommentsList &&
              <CommentsList toggleCommentsList={this.toggleCommentsList}/>
            }
          </div>
        </div>
      </div>
    );
  }
}

const IconButtonPropTypes = {
  icon: PropTypes.string,
  id: PropTypes.string,
  onMouseDown: PropTypes.func,
  isActive: PropTypes.bool,
  disabled: PropTypes.bool,
  text: PropTypes.string,
};

class IconButton extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      tooltipOpen: false
    };
  }

  toggle = () => {
    this.setState({
      tooltipOpen: !this.state.tooltipOpen
    });
  }

  render() {
    let className = 'btn btn-icon btn-secondary btn-active';
    return (
      <button
        id={this.props.id}
        type={'button'}
        onMouseDown={this.props.onMouseDown}
        className={className}
        data-active={ this.props.isActive || false }>
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

IconButton.propTypes = IconButtonPropTypes;

const FileInfoPropTypes = {
  serviceURL: PropTypes.string.isRequired,
  toggleStar: PropTypes.func.isRequired,
  isLocked: PropTypes.bool,
  star: PropTypes.bool,
};

class FileInfo extends React.PureComponent {

  constructor(props) {
    super(props);
  }

  render() {
    let modifyTime = moment(lastModified * 1000).format('YYYY-MM-DD HH:mm');
    const modifierUrl = this.props.serviceURL + '/profile/' + latestContributor + '/';
    return (
      <div className={'file-info-wrapper'}>
        <div className="topbar-file-info">
          <h2 className="file-title d-flex">
            <span className='file-name'>{fileName}</span>
            <span className='file-star' title={this.props.star ? 'unstar' : 'star'}>
              <i onClick={this.props.toggleStar} className={this.props.star ? 'fa fa-star star': 'far fa-star'}/>
            </span>
            <InternalLinkDialog repoID={repoID} path={filePath}/>
            {this.props.isLocked &&
              <span className="file-lock">
                <img className="vam" width="16" src={ mediaUrl + 'img/file-locked-32.png' } alt="locked" title="locked"/>
              </span>
            }
          </h2>
          <div className="file-state">
            <span className="file-modifier-name">
              <a href={modifierUrl}>{latestContributor}</a>
            </span>{' '}
            <span className="file-modifier-time">{modifyTime}</span>
          </div>
        </div>
      </div>
    );
  }
}

FileInfo.propTypes = FileInfoPropTypes;

if (enableWatermark) {
  const loginUser = window.app.userInfo.name;
  let watermark_txt;
  if (loginUser) {
    watermark_txt = siteName + '  ' + loginUser;
  } else {
    watermark_txt = gettext('Anonymous User');
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
