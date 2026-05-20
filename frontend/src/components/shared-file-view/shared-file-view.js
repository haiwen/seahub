import React from 'react';
import PropTypes from 'prop-types';
import watermark from 'watermark-dom';
import classNames from 'classnames';
import Account from '../common/account';
import { gettext, siteRoot, mediaUrl, logoPath, logoWidth, logoHeight, siteTitle } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import SaveSharedFileDialog from '../dialog/save-shared-file-dialog';
import AddAbuseReportDialog from '../../components/dialog/add-abuse-report-dialog';
import toaster from '../toast';
import Switch from '../switch';
import CustomDropdown from '../dropdown';

import '../../css/header.css';
import '../../css/shared-file-view.css';

const propTypes = {
  content: PropTypes.object.isRequired,
  type: PropTypes.string,
};

let loginUser = window.app.pageOptions.name;
let contactEmail = window.app.pageOptions.contactEmail;
const { sharedToken, trafficOverLimit, fileName, fileSize, sharedBy, siteName, enableWatermark, canDownload,
  zipped, filePath, enableShareLinkReportAbuse, sharedFileDownloadURL } = window.shared.pageOptions;

class SharedFileView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
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

  getMenuItems = () => {
    const items = [];

    if (canDownload && loginUser && (loginUser !== sharedBy)) {
      items.push({
        key: 'save-as',
        label: gettext('Save as ...'),
        onClick: this.handleSaveSharedFileDialog,
      });
    }

    if (canDownload && !trafficOverLimit) {
      items.push({
        key: 'download',
        label: `${gettext('Download')} (${Utils.bytesToSize(fileSize)})`,
        onClick: () => {
          window.location = zipped ? `?p=${encodeURIComponent(filePath)}&dl=1` : sharedFileDownloadURL;
        },
      });
    }

    if (enableShareLinkReportAbuse && (loginUser !== sharedBy)) {
      items.push({
        key: 'report-abuse',
        label: gettext('Report Abuse'),
        onClick: this.toggleAddAbuseReportDialog,
      });
    }

    if (this.props.canWrapLine) {
      items.push({
        key: 'line-wrapping',
        label: gettext('Line wrapping'),
        right_slot: (
          <Switch
            checked={this.props.lineWrapping}
            className="txt-line-wrap-menu"
            onChange={() => this.props.updateLineWrapping(!this.props.lineWrapping)}
          />
        ),
        keepOpen: true,
      });
    }

    return items;
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

  renderFileViewHeader = () => {
    return (
      <>
        <div className="text-truncate">
          <h2 className="shared-file-name ellipsis" title={fileName}>{fileName}</h2>
          {zipped ?
            <p className="m-0 d-flex shared-file-path">{gettext('Current path: ')}{this.renderPath()}</p> :
            <p className="shared-by ellipsis m-0">{gettext('Shared by:')}{'  '}{sharedBy}</p>
          }
        </div>
        <div className="flex-shrink-0 ml-4">
          <CustomDropdown
            items={this.getMenuItems()}
            triggerClassName="op-icon m-0"
          />
        </div>
      </>
    );
  };

  render() {
    const isDesktop = Utils.isDesktop();
    const { type } = this.props;
    return (
      <div className={classNames('h-100 d-flex flex-column shared-file-view', type !== '' ? `shared-${type}-file-view` : '')}>
        <div className="top-header d-flex align-items-center flex-shrink-0">
          <a href={siteRoot} className='mr-auto mr-md-0'>
            <img src={mediaUrl + logoPath} height={logoHeight} width={logoWidth} title={siteTitle} alt="logo" />
          </a>
          {isDesktop && (
            <div className='shared-file-view-top-head flex-fill d-flex justify-content-between align-items-center ml-4 pl-4'>
              {this.renderFileViewHeader()}
            </div>
          )}
          {loginUser && <Account />}
        </div>
        <div className="flex-fill d-flex flex-column overflow-auto">
          {!isDesktop && (
            <div className={'shared-file-view-head'}>
              {this.renderFileViewHeader()}
            </div>
          )}
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
SharedFileView.defaultProps = {
  type: '',
};

export default SharedFileView;
