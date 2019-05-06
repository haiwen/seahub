import React from 'react';
import PropTypes from 'prop-types';
import Account from '../common/account';
import { gettext, siteRoot, mediaUrl, logoPath, logoWidth, logoHeight, siteTitle } from '../../utils/constants';
import { Button } from 'reactstrap';
import { Utils } from '../../utils/utils';
import SaveSharedFileDialog from '../dialog/save-shared-file-dialog';
import AddIllegalReportDialog from '../../components/dialog/add-illegal-report-dialog';
import toaster from '../toast';
import watermark from 'watermark-dom';

import '../../css/shared-file-view.css';

const propTypes = {
  content: PropTypes.object.isRequired
};

let loginUser = window.app.pageOptions.name;
const { repoID, sharedToken, trafficOverLimit, fileName, fileSize, sharedBy, siteName, enableWatermark, canDownload, zipped, filePath, enableShareLinkReportIllegal } = window.shared.pageOptions;

class SharedFileView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      showSaveSharedFileDialog: false,
      isAddIllegalReportDialogOpen: false
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

  toggleAddIllegalReportDialog = () => {
    this.setState({
      isAddIllegalReportDialogOpen: !this.state.isAddIllegalReportDialogOpen
    });
  }

  componentDidMount() {
    if (trafficOverLimit) {
      toaster.danger(gettext('File download is disabled: the share link traffic of owner is used up.'), {
        duration: 3
      });
    }
    if (!canDownload) {
      document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
      });
      document.addEventListener('keydown', function(e) {
        // prevent ctrl + s/p/a/c, i.e, 'save', 'print', 'select all', 'copy'
        // metaKey: for mac
        if ((e.ctrlKey || e.metaKey) && (e.which == 83 || e.which == 80 || e.which == 65 || e.which == 67)) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      });
    }
  }

  renderPath = () => {
    return (
      <React.Fragment>
        {zipped.map((item, index) => {
          if (index != zipped.length - 1) {
            return (
              <React.Fragment key={index}>
                <a href={`${siteRoot}d/${sharedToken}/?p=${encodeURIComponent(item.path)}`}>{item.name}</a>
                <span> / </span>
              </React.Fragment>
            );
          }
        })
        }
        {zipped[zipped.length - 1].name}
      </React.Fragment>
    );
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
              {zipped ?
                <p className="m-0">{gettext('Current path: ')}{this.renderPath()}</p> :
                <p className="share-by ellipsis">{gettext('Shared by:')}{'  '}{sharedBy}</p>
              }
            </div>
            <div className="float-right">
              {(canDownload && loginUser && (loginUser !== sharedBy)) &&
                <Button color="secondary" id="save"
                  onClick={this.handleSaveSharedFileDialog}>{gettext('Save as ...')}
                </Button>
              }{' '}
              {(canDownload && !trafficOverLimit) &&
                <a href={`?${zipped ? 'p=' + encodeURIComponent(filePath) + '&' : ''}dl=1`} className="btn btn-success">{gettext('Download')}({Utils.bytesToSize(fileSize)})</a>
              }{' '}
              {enableShareLinkReportIllegal &&
                <Button
                  onClick={this.toggleAddIllegalReportDialog}>{gettext('Report')}
                </Button>
              }
            </div>
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
        {(this.state.isAddIllegalReportDialogOpen && enableShareLinkReportIllegal) &&
          <AddIllegalReportDialog
            sharedToken={sharedToken}
            filePath={filePath}
            toggleAddIllegalReportDialog={this.toggleAddIllegalReportDialog}
            isAddIllegalReportDialogOpen={this.state.isAddIllegalReportDialogOpen}
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
