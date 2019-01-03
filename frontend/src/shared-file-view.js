import React from 'react';
import ReactDOM from 'react-dom';
import Account from './components/common/account';
import { gettext, siteRoot, mediaUrl, logoPath, logoWidth, logoHeight, siteTitle } from './utils/constants';
import { Button } from 'reactstrap';
import { seafileAPI } from './utils/seafile-api';
import { Utils } from './utils/utils';
import Loading from './components/loading';
import SaveSharedFileDialog from './components/dialog/save-shared-file-dialog';
import toaster from '@seafile/seafile-editor/dist/components/toast';

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
const pageOptions = window.shared.pageOptions;
const { repoID, filePath, sharedToken, trafficOverLimit } = pageOptions;

class SharedFileView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      markdownContent: '',
      loading: true,
      showSaveSharedFileDialog: false,
    };
  }

  handleSaveSharedFileDialog = () => {
    this.setState({
      showSaveSharedFileDialog: true
    });
  }

  toggleCancel = () => {
    this.setState({
      showSaveSharedFileDialog: false
    });
  }

  handleSaveSharedFile = () => {
    toaster.success({gettext('Save Successfully')}, {
      duration: 3
    });
  }

  componentDidMount() {
    seafileAPI.getFileContent(rawPath).then((res) => {
      this.setState({
        markdownContent: res.data,
        loading: false
      });
    });
    if (trafficOverLimit == "True") {
      toaster.danger({gettext('File download is disabled: the share link traffic of owner is used up.')}, {
        duration: 10
      });
    }
  }

  canDownload = () => {
    if (download) {
      return (
        <div className="float-right js-file-op">
          {(loginUser && loginUser !== sharedBy) &&
            <Button color="secondary" id="save" className="shared-file-op-btn" onClick={this.handleSaveSharedFileDialog}>
              {gettext('Save as ...')}</Button>
          }
          {' '}
          {(trafficOverLimit === "False") &&
            <Button color="success" className="shared-file-op-btn">
              <a href="?dl=1">{gettext('Download')}({Utils.bytesToSize(fileSize)})</a>
            </Button>
          }
        </div>
      )
    }
  }

  render() {
    if (this.state.loading) {
      return <Loading />
    }
    return (
      <React.Fragment>
        <div className="header d-flex">
          <React.Fragment>
            <a href={siteRoot}>
              <img src={mediaUrl + logoPath} height={logoHeight} width={logoWidth} title={siteTitle} alt="logo" />
            </a>
          </React.Fragment>
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
          <div className="md-view article">
            <MarkdownViewer markdownContent={this.state.markdownContent} showTOC={false} />
          </div>
        </div>
        {this.state.showSaveSharedFileDialog &&
          <SaveSharedFileDialog
            repoID={repoID}
            filePath={filePath}
            sharedToken={sharedToken}
            toggleCancel={this.toggleCancel}
            handleSaveSharedFile={this.handleSaveSharedFile}
          />
        }
      </React.Fragment>
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
