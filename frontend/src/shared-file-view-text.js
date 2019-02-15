import React from 'react';
import ReactDOM from 'react-dom';
import Account from './components/common/account';
import CodeMirror from 'react-codemirror';
import { Button } from 'reactstrap';
import { Utils } from './utils/utils';
import watermark from 'watermark-dom';
import SaveSharedFileDialog from './components/dialog/save-shared-file-dialog';
import toaster from './components/toast';
import { serviceURL, gettext, siteRoot, mediaUrl, logoPath, logoWidth, logoHeight, siteTitle } from './utils/constants';

import 'codemirror/lib/codemirror.css';
import './assets/css/fa-solid.css';
import './assets/css/fa-regular.css';
import './assets/css/fontawesome.css';
import './css/shared-file-view.css';
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

const loginUser = window.app.pageOptions.name;
const { trafficOverLimit, fileName, fileSize, sharedBy, siteName, enableWatermark, download, encoding, fileContent, sharedToken, fileEncodingList, err, fileext } = window.shared.pageOptions;
const URL = require('url-parse');

const options={
  lineNumbers: false,
  mode: Utils.chooseLanguage(fileext),
  extraKeys: {'Ctrl': 'autocomplete'},
  theme: 'default',
  autoMatchParens: true,
  textWrapping: true,
  lineWrapping: true,
  readOnly: 'nocursor',
};

class SharedFileViewText extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      showSaveSharedFileDialog: false,
    };
  }

  changeEncode = (e) => {
    let url = new URL(serviceURL) + '/f/' + sharedToken + '/?file_enc=' + e.target.value;
    window.location.href = url.toString();
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

  handleSaveSharedFileDialog = () => {
    this.setState({
      showSaveSharedFileDialog: !this.state.showSaveSharedFileDialog
    });
  }

  saveFileSuccess = () => {
    let msg = gettext('Successfully saved {fileName}.');
    msg = msg.replace('{fileName}', fileName);
    toaster.success(msg);
  }

  render() {
    return (
      <div className="shared-file-view-md">
        <div className="shared-file-view-md-header d-flex">
          <React.Fragment>
            <a href={siteRoot}>
              <img src={mediaUrl + logoPath} height={logoHeight} width={logoWidth} title={siteTitle} alt="logo"/>
            </a>
          </React.Fragment>
          { loginUser && <Account /> }
        </div>
        <div className="shared-file-view-md-main">
          <div className="shared-file-view-head">
            <div className="float-left">
              <h2 className="ellipsis" title={fileName}>{fileName}</h2>
              <p className="share-by ellipsis">{gettext('Shared by:')}{' '}{sharedBy}</p>
            </div>
            {download &&
              <div className="float-right">
                {(loginUser && loginUser !== sharedBy) &&
                  <Button color="secondary" id="save" className="shared-file-op-btn"
                    onClick={this.handleSaveSharedFileDialog}>{gettext('Save as ...')}
                  </Button>
                }{' '}
                {(trafficOverLimit === 'False') &&
                  <Button color="success" className="shared-file-op-btn">
                    <a href="?dl=1">{gettext('Download')}{' '}({Utils.bytesToSize(parseInt(fileSize))})</a>
                  </Button>
                }
              </div>
            }
          </div>
          <div className="shared-file-view-body">
            {this.fileEncode()}
            <div className="txt-view">
              { err ? <div className="file-view-tip error">{err}</div> :
              <CodeMirror ref="editor-sql" value={fileContent} options={options}/>}
              { this.state.showSaveSharedFileDialog &&
                <SaveSharedFileDialog
                  sharedToken={sharedToken}
                  toggleCancel={this.handleSaveSharedFileDialog}
                  handleSaveSharedFile={this.saveFileSuccess}
                />
              }
            </div>
          </div>
        </div>
      </div>
    );
  }
}

if (enableWatermark) {
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
  <SharedFileViewText />,
  document.getElementById('wrapper')
);
