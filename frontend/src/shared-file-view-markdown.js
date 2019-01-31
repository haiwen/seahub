import React from 'react';
import ReactDOM from 'react-dom';
import Account from './components/common/account';
import { serviceURL, gettext, siteRoot, mediaUrl, logoPath, logoWidth, logoHeight, siteTitle } from './utils/constants';
import { Button } from 'reactstrap';
import { seafileAPI } from './utils/seafile-api';
import { Utils } from './utils/utils';
import Loading from './components/loading';
import SaveSharedFileDialog from './components/dialog/save-shared-file-dialog';
import toaster from './components/toast';
import watermark from 'watermark-dom';
import MarkdownViewer from '@seafile/seafile-editor/dist/viewer/markdown-viewer';

import './css/shared-file-view.css';
import './assets/css/fa-solid.css';
import './assets/css/fa-regular.css';
import './assets/css/fontawesome.css';

let loginUser = window.app.pageOptions.name;
const { repoID, sharedToken, trafficOverLimit, fileName, fileSize, rawPath, sharedBy, siteName, enableWatermark, download } = window.shared.pageOptions;

class SharedFileViewMarkdown extends React.Component {

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
    toaster.success(gettext('Successfully saved'), {
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
    if (trafficOverLimit == 'True') {
      toaster.danger(gettext('File download is disabled: the share link traffic of owner is used up.'), {
        duration: 3
      });
    }
  }

  changeImageURL = (innerNode) => {
    if (innerNode.type == 'image') {
      let imageUrl = innerNode.data.src;

      const re = new RegExp(serviceURL + '/lib/' + repoID +'/file.*raw=1');
      
      // different repo 
      if (!re.test(imageUrl)) {
        return;
      }
      // get image path
      let index = imageUrl.indexOf('/file');
      let index2 = imageUrl.indexOf('?');
      const imagePath = imageUrl.substring(index + 5, index2);
      // change image url
      innerNode.data.src = serviceURL + '/view-image-via-share-link/?token=' + sharedToken + '&path=' + imagePath;
    }
    return innerNode;
  }

  modifyValueBeforeRender = (value) => {
    let nodes = value.document.nodes;
    let newNodes = Utils.changeMarkdownNodes(nodes, this.changeImageURL);
    value.document.nodes = newNodes;
    return value;
  }

  render() {
    if (this.state.loading) {
      return <Loading />;
    }
    return (
      <div className="shared-file-view-md">
        <div className="shared-file-view-md-header d-flex">
          <React.Fragment>
            <a href={siteRoot}>
              <img src={mediaUrl + logoPath} height={logoHeight} width={logoWidth} title={siteTitle} alt="logo" />
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
                }{' '}
                {(trafficOverLimit === 'False') &&
                  <Button color="success" className="shared-file-op-btn">
                    <a href="?dl=1">{gettext('Download')}({Utils.bytesToSize(fileSize)})</a>
                  </Button>
                }
              </div>
            }
          </div>
          <div className="shared-file-view-body">
            <div className="md-view">
              <MarkdownViewer 
                markdownContent={this.state.markdownContent}
                showTOC={false}
                serviceURL={serviceURL}
                sharedToken={sharedToken}
                repoID={repoID}
                modifyValueBeforeRender={this.modifyValueBeforeRender}
              />
            </div>
          </div>
        </div>
        {this.state.showSaveSharedFileDialog &&
          <SaveSharedFileDialog
            repoID={repoID}
            sharedToken={sharedToken}
            toggleCancel={this.toggleCancel}
            handleSaveSharedFile={this.handleSaveSharedFile}
          />
        }
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
  <SharedFileViewMarkdown />,
  document.getElementById('wrapper')
);
