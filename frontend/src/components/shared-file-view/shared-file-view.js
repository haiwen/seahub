import React from 'react';
import PropTypes from 'prop-types';
import watermark from 'watermark-dom';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import Account from '../common/account';
import { gettext, siteRoot, mediaUrl, logoPath, logoWidth, logoHeight, siteTitle } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import SaveSharedFileDialog from '../dialog/save-shared-file-dialog';
import AddAbuseReportDialog from '../../components/dialog/add-abuse-report-dialog';
import toaster from '../toast';
import Switch from '../switch';
import IconButton from '../icon-button';

import '../../css/shared-file-view.css';

const propTypes = {
  content: PropTypes.object.isRequired,
  fileType: PropTypes.string
};

let loginUser = window.app.pageOptions.name;
let contactEmail = window.app.pageOptions.contactEmail;
const { sharedToken, trafficOverLimit, fileName, fileSize, sharedBy, siteName, enableWatermark, canDownload,
  zipped, filePath, enableShareLinkReportAbuse, sharedFileDownloadURL } = window.shared.pageOptions;

class SharedFileView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      moreDropdownOpen: false,
      showSaveSharedFileDialog: false,
      isAddAbuseReportDialogOpen: false
    };
  }

  handleSaveSharedFileDialog = () => {
    this.setState({
      showSaveSharedFileDialog: true
    });
  };

  toggleCancel = () => {
    this.setState({
      showSaveSharedFileDialog: false
    });
  };

  handleSaveSharedFile = () => {
    toaster.success(gettext('Successfully saved'), {
      duration: 3
    });
  };

  toggleAddAbuseReportDialog = () => {
    this.setState({
      isAddAbuseReportDialogOpen: !this.state.isAddAbuseReportDialogOpen
    });
  };

  toggleMoreOpMenu = (event) => {
    if (this.state.moreDropdownOpen) {
      const el = document.getElementById('txt-line-wrap-menu');
      if (el && el.contains(event.target)) {
        return;
      }
    }
    this.setState({
      moreDropdownOpen: !this.state.moreDropdownOpen
    });
  };

  componentDidMount() {
    const fileIcon = Utils.getFileIconUrl(fileName);
    document.getElementById('favicon').href = fileIcon;

    if (trafficOverLimit) {
      toaster.danger(gettext('File download is disabled: the share link traffic of owner is used up.'), {
        duration: 3
      });
    }
    if (!canDownload) {
      document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        return false;
      });
      document.addEventListener('keydown', function (e) {
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
                <a className="text-truncate mx-1" href={`${siteRoot}d/${sharedToken}/?p=${encodeURIComponent(item.path)}`} title={item.name}>{item.name}</a>
                <span> / </span>
              </React.Fragment>
            );
          }
          return null;
        })
        }
        <span className="text-truncate ml-1" title={zipped[zipped.length - 1].name}>{zipped[zipped.length - 1].name}</span>
      </React.Fragment>
    );
  };

  render() {
    const { fileType } = this.props;
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
          <div className={`shared-file-view-head ${(fileType == 'md' || fileType == 'pdf') ? 'w-100 px-4' : ''}`}>
            <div className="text-truncate">
              <h2 className="ellipsis" title={fileName}>{fileName}</h2>
              {zipped ?
                <p className="m-0 d-flex">{gettext('Current path: ')}{this.renderPath()}</p> :
                <p className="share-by ellipsis">{gettext('Shared by:')}{'  '}{sharedBy}</p>
              }
            </div>
            <div className="flex-shrink-0 ml-4">
              <Dropdown isOpen={this.state.moreDropdownOpen} toggle={this.toggleMoreOpMenu}>
                <DropdownToggle
                  className="file-toolbar-btn"
                  aria-label={gettext('More operations')}
                  title={gettext('More operations')}
                  tag="span"
                >
                  <IconButton
                    id="shared-file-view-more-level"
                    icon="more-level"
                    text={gettext('More operations')}
                  />
                </DropdownToggle>
                <DropdownMenu>
                  {(canDownload && loginUser && (loginUser !== sharedBy)) && (
                    <DropdownItem onClick={this.handleSaveSharedFileDialog}>
                      {gettext('Save as ...')}
                    </DropdownItem>
                  )}
                  {(canDownload && !trafficOverLimit) &&
                    <a href={`${zipped ? '?p=' + encodeURIComponent(filePath) + '&dl=1' : sharedFileDownloadURL}`} className="dropdown-item">{gettext('Download')} ({Utils.bytesToSize(fileSize)})</a>
                  }
                  {(enableShareLinkReportAbuse && (loginUser !== sharedBy)) && (
                    <DropdownItem onClick={this.toggleAddAbuseReportDialog}>
                      {gettext('Report Abuse')}
                    </DropdownItem>
                  )}
                  {this.props.canWrapLine && (
                    <DropdownItem id='txt-line-wrap-menu' className='dropdown-item'>
                      <Switch
                        checked={this.props.lineWrapping}
                        placeholder={gettext('Line wrapping')}
                        className="txt-line-wrap-menu w-100"
                        onChange={() => this.props.updateLineWrapping(!this.props.lineWrapping)}
                      />
                    </DropdownItem>
                  )}
                </DropdownMenu>
              </Dropdown>
            </div>
          </div>
          {this.props.content}
        </div>
        {this.state.showSaveSharedFileDialog &&
          <SaveSharedFileDialog
            sharedToken={sharedToken}
            filePath={zipped ? filePath : ''}
            toggleCancel={this.toggleCancel}
            handleSaveSharedFile={this.handleSaveSharedFile}
          />
        }
        {(this.state.isAddAbuseReportDialogOpen && enableShareLinkReportAbuse) &&
          <AddAbuseReportDialog
            sharedToken={sharedToken}
            filePath={filePath}
            toggleAddAbuseReportDialog={this.toggleAddAbuseReportDialog}
            isAddAbuseReportDialogOpen={this.state.isAddAbuseReportDialogOpen}
            contactEmail={contactEmail}
          />
        }
      </div>
    );
  }
}

if (enableWatermark) {
  let watermark_txt;
  if (loginUser) {
    watermark_txt = siteName + ' ' + loginUser;
  } else if (sharedBy) {
    watermark_txt = siteName + ' ' + sharedBy;
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
