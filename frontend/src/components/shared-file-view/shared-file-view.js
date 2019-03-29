import React from 'react';
import PropTypes from 'prop-types';
import Account from '../common/account';
import { gettext, siteRoot, mediaUrl, logoPath, logoWidth, logoHeight, siteTitle } from '../../utils/constants';
import { Button } from 'reactstrap';
import { Utils } from '../../utils/utils';
import SaveSharedFileDialog from '../dialog/save-shared-file-dialog';
import toaster from '../toast';
import watermark from 'watermark-dom';

import '../../css/shared-file-view.css';

const propTypes = {
  content: PropTypes.object.isRequired
};

let loginUser = window.app.pageOptions.name;
const { repoID, sharedToken, trafficOverLimit, fileName, fileSize, sharedBy, siteName, enableWatermark, download } = window.shared.pageOptions;

class SharedFileView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      showSaveSharedFileDialog: false
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
    if (trafficOverLimit) {
      toaster.danger(gettext('File download is disabled: the share link traffic of owner is used up.'), {
        duration: 3
      });
    }
  }

  render() {
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
                {!trafficOverLimit &&
                  <Button color="success" className="shared-file-op-btn">
                    <a href="?dl=1">{gettext('Download')}({Utils.bytesToSize(fileSize)})</a>
                  </Button>
                }
              </div>
            }
          </div>
          {this.props.content}
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

SharedFileView.propTypes = propTypes;

export default SharedFileView;
