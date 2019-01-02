import React from 'react';
import ReactDOM from 'react-dom';
import Account from './components/common/account';
import { gettext, siteRoot, mediaUrl, logoPath, logoWidth, logoHeight, siteTitle } from './utils/constants';
import { seafileAPI } from './utils/seafile-api';
import { Utils } from './utils/utils';
import Loading from './components/loading';

import MarkdownViewer from './seafile-editor/src/viewer/markdown-viewer';

import watermark from 'watermark-dom';

import './css/shared-file-view.css';
import './assets/css/fa-solid.css';
import './assets/css/fa-regular.css';
import './assets/css/fontawesome.css';

let fileName = window.shared.pageOptions.fileName;
let fileSize = window.shared.pageOptions.fileSize;
let rawPath = window.shared.pageOptions.rawPath;
let sharedBy = window.shared.pageOptions.sharedBy;
let loginUser = window.app.pageOptions.name;
let enableWatermark = window.shared.pageOptions.enableWatermark;
let download = window.shared.pageOptions.download;
let siteName = window.shared.pageOptions.siteName;


class SharedFileView extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      markdownContent: '',
      loading: true,
    };
  }

  componentDidMount() {
    seafileAPI.getFileContent(rawPath).then((res) => {
      this.setState({
        markdownContent: res.data,
        loading: false
      });
    });
  }

  canDownload = () => {
    if (download) {
      return (
        <div className="float-right js-file-op">
          <a href="?dl=1" className="obv-btn shared-file-op-btn">{gettext('Download')}({Utils.bytesToSize(fileSize)})</a>
        </div>
         
      )
    }
  }

  fileEncode = () => {
    return (
      <div className="file-enc-cont">
        <label htmlFor="file-enc">{gettext('Encoding:')}</label>
        <select id="file-enc">
          <option value="auto">auto detect</option>
          <option value="utf-8">utf-8</option>
          <option value="gbk">gbk</option>
          <option value="ISO-8859-1">ISO-8859-1</option>
          <option value="ISO-8859-5">ISO-8859-5</option>
        </select>
      </div>
    )
  }

  render() {
    if (this.state.loading) {
      return <Loading />
    }

    return (
      <div>

        <div className="header d-flex">
          <div>
            <a href={siteRoot}>
              <img src={mediaUrl + logoPath} height={logoHeight} width={logoWidth} title={siteTitle} alt="logo" />
            </a>
          </div>
          { loginUser && <Account /> }
        </div>

        <div className="shared-file-view-hd ovhd">
          <div className="float-left js-file-info" style={{'maxWidth': '804.812px'}}>
            <h2 className="file-view-hd ellipsis no-bold" title={fileName}>{fileName}</h2>
            <p className="share-by ellipsis">{gettext('Shared by:')}{'  '}{sharedBy}</p>
          </div>
          {this.canDownload()}
        </div>

        <div className="file-view ">
          {this.fileEncode()}
          <div className="md-view article">
            <MarkdownViewer markdownContent={this.state.markdownContent} showTOC={false} />
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
  watermark.init({ watermark_txt: watermark_txt});
}

ReactDOM.render (
  <SharedFileView />,
  document.getElementById('wrapper')
);
