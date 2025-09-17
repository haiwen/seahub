import React from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../_i18n/i18n-sdoc-editor';
import { UncontrolledTooltip } from 'reactstrap';
import classnames from 'classnames';
import { DiffViewer } from '@seafile/seafile-sdoc-editor';
import dayjs from 'dayjs';
import { seafileAPI } from '../../../utils/seafile-api';
import SDocServerApi from '../../../utils/sdoc-server-api';
import { PER_PAGE, gettext, historyRepoID } from '../../../utils/constants';
import Loading from '../../../components/loading';
import GoBack from '../../../components/common/go-back';
import SidePanel from './side-panel';
import { Utils, isMobile } from '../../../utils/utils';
import toaster from '../../../components/toast';
import { formatHistoryContent, getCurrentAndLastVersion } from './helper';

import '../../../css/layout.css';
import './index.css';

const { serviceURL, avatarURL, siteRoot } = window.app.config;
const { username, name } = window.app.pageOptions;
const { repoID, fileName, filePath, docUuid, assetsUrl, seadocAccessToken, seadocServerUrl } = window.fileHistory.pageOptions;

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
      isMobile: isMobile,
      sidePanelInitData: {},
      showSidePanel: true,
    };
    const config = {
      docUuid,
      sdocServer: seadocServerUrl,
      accessToken: seadocAccessToken
    };
    this.sdocServerApi = new SDocServerApi(config);
  }

  componentDidMount() {
    this.firstLoadSdocHistory();
  }

  getInitContent = (firstChildren) => {
    if (firstChildren) {
      return {
        version: -1,
        elements: [
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
      elements: [
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

  updateLastVersionContent = (currentVersionContent, currentVersion, lastVersion) => {
    if (!lastVersion) {
      this.setContent(currentVersionContent, '');
      return;
    }
    if (lastVersion === 'init') {
      const lastVersionContent = currentVersionContent ? this.getInitContent(currentVersionContent?.elements[0]) : this.getInitContentByPath(currentVersion.path);
      const validCurrentVersionContent = currentVersionContent || this.getInitContentByPath(currentVersion.path);
      this.setContent(validCurrentVersionContent, lastVersionContent);
      return;
    }
    seafileAPI.getFileRevision(historyRepoID, lastVersion.commit_id, lastVersion.path).then(res => {
      return res.data ? seafileAPI.getFileContent(res.data) : { data: '' };
    }).then(res => {
      const lastVersionContent = formatHistoryContent(res.data);
      const firstChildren = currentVersionContent?.elements[0];
      const validLastVersionContent = lastVersion && !lastVersionContent ? this.getInitContent(firstChildren) : lastVersionContent;
      this.setContent(currentVersionContent, validLastVersionContent);
    }).catch(error => {
      const errorMessage = Utils.getErrorMsg(error, true);
      toaster.danger(gettext(errorMessage));
      this.setContent(currentVersionContent, '');
    });
  };

  onSelectHistoryVersion = (currentVersion, lastVersion) => {
    this.setState({
      currentVersion,
      currentVersionContent: null,
    });
    seafileAPI.getFileRevision(historyRepoID, currentVersion.commit_id, currentVersion.path).then(res => {
      return seafileAPI.getFileContent(res.data);
    }).then(res => {
      const currentVersionContent = formatHistoryContent(res.data);
      const validCurrentVersionContent = currentVersionContent.elements ? currentVersionContent : this.getInitContentByPath(currentVersion.path);
      this.updateLastVersionContent(validCurrentVersionContent, currentVersion, lastVersion);
    }).catch(error => {
      const errorMessage = Utils.getErrorMsg(error, true);
      toaster.danger(gettext(errorMessage));
      this.setContent('', '');
    });
  };

  setContent = (currentVersionContent = '', lastVersionContent = '') => {
    this.setState({
      currentVersionContent,
      lastVersionContent,
      isLoading: false,
      changes: [],
      currentDiffIndex: 0,
    });
  };

  onShowChanges = (isShowChanges, lastVersion) => {
    if (isShowChanges) {
      const { currentVersionContent, currentVersion } = this.state;
      this.setState({ isLoading: true, isShowChanges }, () => {
        localStorage.setItem('seahub-sdoc-history-show-changes', isShowChanges + '');
        this.updateLastVersionContent(currentVersionContent, currentVersion, lastVersion);
      });
      return;
    }
    this.setState({ isLoading: true, isShowChanges }, () => {
      this.setState({ isLoading: false, lastVersionContent: '' }, () => {
        localStorage.setItem('seahub-sdoc-history-show-changes', isShowChanges + '');
      });
    });
  };

  getTopLevelChanges = (changes) => {
    const topLevelChanges = [];
    changes.forEach((item) => {
      let dom = document.querySelectorAll(`[data-id="${item}"]`)[0];
      if (!dom) return [];
      while (dom?.dataset?.root !== 'true') {
        if (!dom?.parentNode || dom instanceof Document) break;
        const parentNode = dom.parentNode;
        if (parentNode instanceof Document) {
          break;
        } else {
          dom = parentNode;
        }
      }
      topLevelChanges.push(dom.dataset.id);
    });
    return Array.from(new Set(topLevelChanges));
  };

  // Merge consecutive added areas or deleted areas
  getMergedChanges = (topLevelChanges, diffValue) => {
    const topLevelChangesValue = [];
    const changes = [];

    diffValue.forEach((item) => {
      if (topLevelChanges.includes(item.id)) {
        const obj = {
          id: item.id,
          value: item
        };
        topLevelChangesValue.push(obj);
      }
    });

    topLevelChangesValue.forEach((item) => {
      const preChange = changes[changes.length - 1]?.value;
      const curChange = item.value;
      if (curChange?.add && preChange?.add) return;
      if (curChange?.delete && preChange?.delete) return;
      changes.push(item);
    });
    return changes.map(item => item.id);
  };

  setDiffCount = (diff = { value: [], changes: [] }) => {
    const { changes, value } = diff;
    const topLevelChanges = this.getTopLevelChanges(changes);
    const mergedChanges = this.getMergedChanges(topLevelChanges, value);
    this.setState({ changes: mergedChanges, currentDiffIndex: 0 });
  };

  jumpToElement = (currentDiffIndex) => {
    this.setState({ currentDiffIndex }, () => {
      const { currentDiffIndex, changes } = this.state;
      const change = changes[currentDiffIndex];
      const changeElement = document.querySelectorAll(`[data-id="${change}"]`)[0];
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

  changeSidePanelStatus = () => {
    this.setState({ showSidePanel: !this.state.showSidePanel });
  };

  renderChangesTip = ({ onChangeSidePanelDisplay }) => {
    const { isShowChanges, changes, currentDiffIndex, isLoading } = this.state;
    if (isLoading) return null;
    if (!isShowChanges) {
      return (
        <div className="sdoc-file-history-header-right d-flex align-items-center justify-content-end">
          <div className='sdoc-file-changes-switch'>
            <i className="sf3-font sf3-font-history" onClick={onChangeSidePanelDisplay}></i>
          </div>
        </div>
      );
    }
    const changesCount = changes ? changes.length : 0;
    if (changesCount === 0) {
      return (
        <div className="sdoc-file-history-header-right d-flex align-items-center">
          <div className="sdoc-file-changes-container d-flex align-items-center pl-2 pr-2">
            {gettext('No changes')}
          </div>
          <div className='sdoc-file-changes-switch ml-4'>
            <i className="sf3-font sf3-font-history" onClick={onChangeSidePanelDisplay}></i>
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
            role="button"
            aria-label={gettext('Last modification')}
            title={gettext('Last modification')}
          >
            <span aria-hidden="true" className="sf3-font sf3-font-down rotate-180 d-inline-block"></span>
          </div>
          <div className="sdoc-file-changes-divider"></div>
          <div
            className="sdoc-file-changes-next d-flex align-items-center justify-content-center"
            id="sdoc-file-changes-next"
            onClick={this.nextChange}
            role="button"
            aria-label={gettext('Next modification')}
            title={gettext('Next modification')}
          >
            <span aria-hidden="true" className="sf3-font sf3-font-down"></span>
          </div>
          <UncontrolledTooltip placement="bottom" target="sdoc-file-changes-last" delay={0} fade={false}>
            {gettext('Last modification')}
          </UncontrolledTooltip>
          <UncontrolledTooltip placement="bottom" target="sdoc-file-changes-next" delay={0} fade={false}>
            {gettext('Next modification')}
          </UncontrolledTooltip>
        </div>
        <div
          className="sdoc-file-changes-switch d-flex align-items-center justify-content-center ml-4"
          id="sdoc-file-changes-panel-switch"
          onClick={this.changeSidePanelStatus}
        >
          <i className="sf3-font sf3-font-history"></i>
        </div>
      </div>
    );
  };

  formatHistories(histories) {
    const oldHistoryGroups = []; // when init data, it will be []
    if (!Array.isArray(histories) || histories.length === 0) return oldHistoryGroups;
    const newHistoryGroups = oldHistoryGroups.slice(0);
    histories.forEach(history => {
      const { date } = history;
      const momentDate = dayjs(date);
      const month = momentDate.format('YYYY-MM');
      const monthItem = newHistoryGroups.find(item => item.month === month);
      if (monthItem) {
        monthItem.children.push({ day: momentDate.format('YYYY-MM-DD'), showDaily: false, children: [history] });
      } else {
        newHistoryGroups.push({
          month,
          children: [
            { day: momentDate.format('YYYY-MM-DD'), showDaily: false, children: [history] }
          ]
        });
      }
    });
    return newHistoryGroups;
  }

  firstLoadSdocHistory() {
    const currentPage = 1;
    seafileAPI.listSdocHistory(docUuid, currentPage, PER_PAGE).then(res => {
      const result = res.data;
      const resultCount = result.histories.length;
      const historyGroups = this.formatHistories(result.histories);
      let hasMore = resultCount >= PER_PAGE;
      const sidePanelInitData = {
        historyGroups,
        hasMore,
        isLoading: false,
      };
      this.setState({ sidePanelInitData });

      if (historyGroups.length > 0) {
        const path = [0, 0, 0];
        const { isShowChanges } = this.state;
        this.onSelectHistoryVersion(...getCurrentAndLastVersion(path, historyGroups, isShowChanges));
      } else {
        this.setState({ isLoading: false });
      }
    }).catch((error) => {
      const errorMessage = 'there has an error in server';
      this.setState({
        isLoading: false,
        sidePanelInitData: { isLoading: false, errorMessage }
      });
      throw Error(errorMessage);
    });
  }

  reloadDocContent = () => {
    this.sdocServerApi.reloadDocContent(fileName).catch((error) => {
      const errorMessage = 'there has an error in server';
      throw Error(errorMessage);
    });
  };

  render() {
    const { currentVersion, isShowChanges, currentVersionContent, lastVersionContent, isLoading, isMobile, sidePanelInitData, showSidePanel } = this.state;
    return (
      <div className={`sdoc-file-history d-flex ${isMobile ? 'mobile' : ''}`}>
        <div className="sdoc-file-history-container d-flex flex-column">
          <div className="sdoc-file-history-header pt-2 pb-2 pl-4 pr-4 d-flex justify-content-between w-100">
            <div className={classnames('sdoc-file-history-header-left d-flex align-items-center', { 'pr-4': isShowChanges })}>
              <GoBack />
              <div className="file-name text-truncate">{fileName}</div>
            </div>
            {this.renderChangesTip({ onChangeSidePanelDisplay: this.changeSidePanelStatus })}
          </div>
          <div className="sdoc-file-history-content d-flex" ref={ref => this.historyContentRef = ref}>
            {isLoading ? (
              <div className="sdoc-file-history-viewer d-flex align-items-center justify-content-center">
                <Loading />
              </div>
            ) : (
              <>
                {currentVersionContent === null ?
                  <Loading />
                  :
                  <DiffViewer
                    currentContent={currentVersionContent}
                    lastContent={isShowChanges ? lastVersionContent : ''}
                    didMountCallback={this.setDiffCount}
                  />
                }
                {
                  showSidePanel && (
                    <SidePanel
                      isShowChanges={isShowChanges}
                      currentVersion={currentVersion}
                      onSelectHistoryVersion={this.onSelectHistoryVersion}
                      onShowChanges={this.onShowChanges}
                      sidePanelInitData={sidePanelInitData}
                      onClose={this.changeSidePanelStatus}
                      reloadDocContent={this.reloadDocContent}
                    />
                  )
                }
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
}

const root = createRoot(document.getElementById('wrapper'));
root.render(
  <I18nextProvider i18n={ i18n } >
    <SdocFileHistory />
  </I18nextProvider>
);
