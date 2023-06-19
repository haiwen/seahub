import React from 'react';
import ReactDom from 'react-dom';
import { UncontrolledTooltip } from 'reactstrap';
import classnames from 'classnames';
import { DiffViewer } from '@seafile/sdoc-editor';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, historyRepoID } from '../../utils/constants';
import Loading from '../../components/loading';
import GoBack from '../../components/common/go-back';
import SidePanel from './side-panel';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';

import '../../css/layout.css';
import '../../css/sdoc-file-history.css';

const { serviceURL, avatarURL, siteRoot } = window.app.config;
const { username, name } = window.app.pageOptions;
const { repoID, fileName, filePath, docUuid, assetsUrl  } = window.fileHistory.pageOptions;

window.seafile = {
  repoID,
  docPath: filePath,
  docName: fileName,
  docUuid,
  isOpenSocket: false,
  serviceUrl: serviceURL,
  name,
  username,
  avatarURL,
  siteRoot,
  assetsUrl,
};

class SdocFileHistory extends React.Component {

  constructor(props) {
    super(props);
    const isShowChanges = localStorage.getItem('seahub-sdoc-history-show-changes') === 'false' ? false : true;
    this.state = {
      isLoading: true,
      isShowChanges,
      currentVersion: {},
      currentVersionContent: '',
      lastVersionContent: '',
      changes: [],
      currentDiffIndex: 0,
    };
  }

  onSelectHistoryVersion = (currentVersion, lastVersion) => {
    this.setState({ isLoading: true, currentVersion });
    seafileAPI.getFileRevision(historyRepoID, currentVersion.commit_id, currentVersion.path).then(res => {
      return seafileAPI.getFileContent(res.data);
    }).then(res => {
      const currentVersionContent = res.data;
      if (lastVersion) {
        seafileAPI.getFileRevision(historyRepoID, lastVersion.commit_id, lastVersion.path).then(res => {
          return seafileAPI.getFileContent(res.data);
        }).then(res => {
          const lastVersionContent = res.data;
          this.setContent(currentVersionContent, lastVersionContent);
        }).catch(error => {
          const errorMessage = Utils.getErrorMsg(error, true);
          toaster.danger(gettext(errorMessage));
          this.setContent(currentVersionContent, '');
        });
      } else {
        this.setContent(currentVersionContent, '');
      }
    }).catch(error => {
      const errorMessage = Utils.getErrorMsg(error, true);
      toaster.danger(gettext(errorMessage));
      this.setContent('', '');
    });
  }

  setContent = (currentVersionContent = '', lastVersionContent = '') => {
    this.setState({ currentVersionContent, lastVersionContent, isLoading: false, changes: [], currentDiffIndex: 0 });
  }

  onShowChanges = (isShowChanges, lastVersion) => {
    if (isShowChanges && lastVersion) {
      const { currentVersionContent } = this.state;
      this.setState({ isLoading: true }, () => {
        localStorage.setItem('seahub-sdoc-history-show-changes', isShowChanges + '');
        seafileAPI.getFileRevision(historyRepoID, lastVersion.commit_id, lastVersion.path).then(res => {
          return seafileAPI.getFileContent(res.data);
        }).then(res => {
          const lastVersionContent = res.data;
          this.setContent(currentVersionContent, lastVersionContent);
          this.setState({ isShowChanges });
        }).catch(error => {
          const errorMessage = Utils.getErrorMsg(error, true);
          toaster.danger(gettext(errorMessage));
          this.setContent(currentVersionContent, '');
          this.setState({ isShowChanges });
        });
      });
      return;
    }
    this.setState({ isShowChanges }, () => {
      localStorage.setItem('seahub-sdoc-history-show-changes', isShowChanges + '');
    });
  }

  setDiffCount = (diff = { value: [], changes: [] }) => {
    const { changes } = diff;
    this.setState({ changes, currentDiffIndex: 0 });
  }

  jumpToElement = (currentDiffIndex) => {
    this.setState({ currentDiffIndex }, () => {
      const { currentDiffIndex, changes } = this.state;
      const change = changes[currentDiffIndex];
      const changeElement = document.querySelectorAll(`[data-id=${change}]`)[0];
      if (changeElement) {
        this.historyContentRef.scrollTop = changeElement.offsetTop - 10;
      }
    });
  }

  lastChange = () => {
    const { currentDiffIndex, changes } = this.state;
    if (currentDiffIndex === 0) {
      this.jumpToElement(changes.length - 1);
      return;
    }
    this.jumpToElement(currentDiffIndex - 1);
  }

  nextChange = () => {
    const { currentDiffIndex, changes } = this.state;
    if (currentDiffIndex === changes.length - 1) {
      this.jumpToElement(0);
      return;
    }
    this.jumpToElement(currentDiffIndex + 1);
  }

  render() {
    const { currentVersion, isShowChanges, currentVersionContent, lastVersionContent, isLoading, changes, currentDiffIndex } = this.state;
    const changesCount = changes ? changes.length : 0;
    const isShowChangesTips = isShowChanges && changesCount > 0;

    return (
      <div className="sdoc-file-history d-flex h-100 w-100 o-hidden">
        <div className="sdoc-file-history-container d-flex flex-column">
          <div className="sdoc-file-history-header pt-2 pb-2 pl-4 pr-4 d-flex justify-content-between w-100 o-hidden">
            <div className={classnames('sdoc-file-history-header-left d-flex align-items-center o-hidden', { 'pr-4': isShowChangesTips })}>
              <GoBack />
              <div className="file-name text-truncate">{fileName}</div>
            </div>
            {isShowChangesTips && (
              <div className="sdoc-file-history-header-right d-flex align-items-center">
                <div className="sdoc-file-changes-container d-flex align-items-center ">
                  <div className="sdoc-file-changes-tip d-flex align-items-center justify-content-center pl-2 pr-2">
                    {`${gettext('Changes')} ${currentDiffIndex + 1}/${changesCount}`}
                  </div>
                  <div className="sdoc-file-changes-divider"></div>
                  <div
                    className="sdoc-file-changes-last d-flex align-items-center justify-content-center"
                    id="sdoc-file-changes-last"
                    onClick={this.lastChange}
                  >
                    <span className="fas fa-chevron-up"></span>
                  </div>
                  <div className="sdoc-file-changes-divider"></div>
                  <div
                    className="sdoc-file-changes-next d-flex align-items-center justify-content-center"
                    id="sdoc-file-changes-next"
                    onClick={this.nextChange}
                  >
                    <span className="fas fa-chevron-down"></span>
                  </div>
                  <UncontrolledTooltip placement="bottom" target="sdoc-file-changes-last">
                    {gettext('Last modification')}
                  </UncontrolledTooltip>
                  <UncontrolledTooltip placement="bottom" target="sdoc-file-changes-next">
                    {gettext('Next modification')}
                  </UncontrolledTooltip>
                </div>
              </div>
            )}
          </div>
          <div className="sdoc-file-history-content f-flex flex-column" ref={ref => this.historyContentRef = ref}>
            {isLoading ? (
              <div className="sdoc-file-history-viewer d-flex align-items-center justify-content-center">
                <Loading />
              </div>
            ) : (
              <DiffViewer
                currentContent={currentVersionContent}
                lastContent={isShowChanges ? lastVersionContent : ''}
                didMountCallback={this.setDiffCount}
              />
            )}
          </div>
        </div>
        <SidePanel
          isShowChanges={isShowChanges}
          currentVersion={currentVersion}
          onSelectHistoryVersion={this.onSelectHistoryVersion}
          onShowChanges={this.onShowChanges}
        />
      </div>
    );
  }
}

ReactDom.render(<SdocFileHistory />, document.getElementById('wrapper'));
