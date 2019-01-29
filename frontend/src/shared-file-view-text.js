import React from 'react';
import ReactDOM from 'react-dom';
import Account from './components/common/account';
import CodeMirror from 'react-codemirror';
import { Button } from 'reactstrap';
import { seafileAPI } from './utils/seafile-api';
import { Utils } from './utils/utils';
import Loading from './components/loading';
import watermark from 'watermark-dom';
import { serviceURL, gettext, siteRoot, mediaUrl, logoPath, logoWidth, logoHeight, siteTitle } from './utils/constants';

import 'codemirror/lib/codemirror.css';
import './css/shared-file-view.css';
import './assets/css/fa-solid.css';
import './assets/css/fa-regular.css';
import './assets/css/fontawesome.css';

const loginUser = window.app.pageOptions.name;
const { trafficOverLimit, fileName, fileSize, rawPath, sharedBy, siteName, enableWatermark, download } = window.shared.pageOptions;
const URL = require('url-parse');

const options={
  lineNumbers: false,
  mode: 'txt',
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
      txtContent: '',
      loading: true,
    };
  }

  changeEncode = (e) => {
    let url = new URL(window.location.origin + window.location.pathname);
    url = url + '?file_enc=' + e.target.value;
    window.location.href = url.toString();
  }

  fileEncode = () => {
    return (
      <div className="file-enc-cont">
        <label htmlFor="file-enc">{gettext('Encoding:')}</label>
        <select id="file-enc" onChange={this.changeEncode}>
          <option value="auto">{gettext('auto detect')}</option>
          <option value="utf-8">utf-8</option>
          <option value="gbk">gbk</option>
          <option value="ISO-8859-1">ISO-8859-1</option>
          <option value="ISO-8859-5">ISO-8859-5</option>
        </select>
      </div>
    );
  }

  componentDidMount() {
    seafileAPI.getFileContent(rawPath).then((res) => {
      this.setState({
        txtContent: res.data,
        loading: false
      });
    });
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
              <p className="share-by ellipsis">{gettext('Shared by:')}{'  '}{sharedBy}</p>
            </div>
            {download &&
              <div className="float-right">
                {(loginUser && loginUser !== sharedBy) &&
                  <Button color="secondary" id="save" className="shared-file-op-btn"
                    onClick={this.handleSaveSharedFileDialog}>{gettext('Save as ...')}
                  </Button>
                }
                {' '}
                {(trafficOverLimit === 'False') &&
                  <Button color="success" className="shared-file-op-btn">
                    <a href="?dl=1">{gettext('Download')}({Utils.bytesToSize(fileSize)})</a>
                  </Button>
                }
              </div>
            }
          </div>
          <div className="shared-file-view-body">
            {this.fileEncode()}
            <div className="txt-view">
              {(this.state.loading && !this.state.txtContent) ? <Loading/> :
                <CodeMirror
                  ref="editor-sql"
                  value={this.state.txtContent}
                  options={options}
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
  <SharedFileViewText />,
  document.getElementById('wrapper')
);
