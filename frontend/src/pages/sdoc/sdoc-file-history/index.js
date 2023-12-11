import React from 'react';
import ReactDom from 'react-dom';
import { UncontrolledTooltip } from 'reactstrap';
import classnames from 'classnames';
import { DiffViewer } from '@seafile/sdoc-editor';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext, historyRepoID } from '../../../utils/constants';
import Loading from '../../../components/loading';
import GoBack from '../../../components/common/go-back';
import SidePanel from './side-panel';
import { Utils } from '../../../utils/utils';
import toaster from '../../../components/toast';

import '../../../css/layout.css';
import './index.css';

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

  getInitContent = (firstChildren) => {
    if (firstChildren) {
      return {
        version: -1,
        children: [
          {
            id: firstChildren.id,
            type: 'title',
            children: [
              {
                id: firstChildren.children[0].id,
                text: ''
              }
            ]
          }
        ]
      };
    }
    return this.getInitContentByPath();
  };

  getInitContentByPath = (path) => {
    const name = path ? path.split('/')?.pop()?.slice(0, -5) : '';
    return {
      version: -1,
      children: [
        {
          id: '1',
          type: 'title',
          children: [
            {
              id: '2',
              text: name
            }
          ]
        }
      ]
    };
  };

  onSelectHistoryVersion = (currentVersion, lastVersion) => {
    this.setState({ isLoading: true, currentVersion });
    seafileAPI.getFileRevision(historyRepoID, currentVersion.commit_id, currentVersion.path).then(res => {
      return seafileAPI.getFileContent(res.data);
    }).then(res => {
      const currentVersionContent = res.data;
      if (lastVersion) {
        if (lastVersion === 'init') {
          const lastVersionContent = currentVersionContent ? this.getInitContent(currentVersionContent.children[0]) : this.getInitContentByPath(currentVersion.path);
          const validCurrentVersionContent = currentVersionContent || this.getInitContentByPath(currentVersion.path);
          this.setContent(validCurrentVersionContent, lastVersionContent);
          return;
        }
        seafileAPI.getFileRevision(historyRepoID, lastVersion.commit_id, lastVersion.path).then(res => {
          return res.data ? seafileAPI.getFileContent(res.data) : { data: '' };
        }).then(res => {
          const lastVersionContent = res.data;
          const firstChildren = currentVersionContent.children[0];
          const validLastVersionContent = lastVersion && !lastVersionContent ? this.getInitContent(firstChildren) : lastVersionContent;
          this.setContent(currentVersionContent, validLastVersionContent);
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
  };

  setContent = (currentVersionContent = '', lastVersionContent = '') => {
    this.setState({ currentVersionContent, lastVersionContent, isLoading: false, changes: [], currentDiffIndex: 0 });
  };

  onShowChanges = (isShowChanges) => {
    if (isShowChanges) {
      const { currentVersionContent, currentVersion } = this.state;
      this.setState({ isLoading: true, isShowChanges }, () => {
        localStorage.setItem('seahub-sdoc-history-show-changes', isShowChanges + '');
        seafileAPI.getNextFileRevision(historyRepoID, currentVersion.id, currentVersion.path).then(res => {
          return res.data ? seafileAPI.getFileContent(res.data) : { data: '' };
        }).then(res => {
          const lastVersionContent = res.data;
          this.setContent(currentVersionContent, lastVersionContent);
        }).catch(error => {
          const errorMessage = Utils.getErrorMsg(error, true);
          toaster.danger(gettext(errorMessage));
          this.setContent(currentVersionContent, '');
        });
      });
      return;
    }
    this.setState({ isLoading: true, isShowChanges }, () => {
      this.setState({ isLoading: false, lastVersionContent: '' }, () => {
        localStorage.setItem('seahub-sdoc-history-show-changes', isShowChanges + '');
      });
    });
  };

  setDiffCount = (diff = { value: [], changes: [] }) => {
    const { changes } = diff;
    this.setState({ changes, currentDiffIndex: 0 });
  };

  jumpToElement = (currentDiffIndex) => {
    this.setState({ currentDiffIndex }, () => {
      const { currentDiffIndex, changes } = this.state;
      const change = changes[currentDiffIndex];
      const changeElement = document.querySelectorAll(`[data-id=${change}]`)[0];
      if (changeElement) {
        this.historyContentRef.scrollTop = changeElement.offsetTop - 10;
      }
    });
  };

  lastChange = () => {
    const { currentDiffIndex, changes } = this.state;
    if (currentDiffIndex === 0) {
      this.jumpToElement(changes.length - 1);
      return;
    }
    this.jumpToElement(currentDiffIndex - 1);
  };

  nextChange = () => {
    const { currentDiffIndex, changes } = this.state;
    if (currentDiffIndex === changes.length - 1) {
      this.jumpToElement(0);
      return;
    }
    this.jumpToElement(currentDiffIndex + 1);
  };

  renderChangesTip = () => {
    const { isShowChanges, changes, currentDiffIndex, isLoading } = this.state;
    if (isLoading) return null;
    if (!isShowChanges) return null;
    const changesCount = changes ? changes.length : 0;
    if (changesCount === 0) {
      return (
        <div className="sdoc-file-history-header-right d-flex align-items-center">
          <div className="sdoc-file-changes-container d-flex align-items-center pl-2 pr-2">
            {gettext('No changes')}
          </div>
        </div>
      );
    }

    return (
      <div className="sdoc-file-history-header-right d-flex align-items-center">
        <div className="sdoc-file-changes-container d-flex align-items-center">
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
          <UncontrolledTooltip placement="bottom" target="sdoc-file-changes-last" delay={0} fade={false}>
            {gettext('Last modification')}
          </UncontrolledTooltip>
          <UncontrolledTooltip placement="bottom" target="sdoc-file-changes-next" delay={0} fade={false}>
            {gettext('Next modification')}
          </UncontrolledTooltip>
        </div>
      </div>
    );
  };

  render() {
    const { currentVersion, isShowChanges, currentVersionContent, lastVersionContent, isLoading } = this.state;

    return (
      <div className="sdoc-file-history d-flex h-100 w-100 o-hidden">
        <div className="sdoc-file-history-container d-flex flex-column">
          <div className="sdoc-file-history-header pt-2 pb-2 pl-4 pr-4 d-flex justify-content-between w-100 o-hidden">
            <div className={classnames('sdoc-file-history-header-left d-flex align-items-center o-hidden', { 'pr-4': isShowChanges })}>
              <GoBack />
              <div className="file-name text-truncate">{fileName}</div>
            </div>
            {this.renderChangesTip()}
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
