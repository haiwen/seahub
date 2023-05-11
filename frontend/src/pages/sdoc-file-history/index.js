import React from 'react';
import ReactDom from 'react-dom';
import classnames from 'classnames';
import DiffViewer from '@seafile/sdoc-editor/dist/pages/diff-viewer';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, fileName, historyRepoID } from '../../utils/constants';
// import { gettext, PER_PAGE, filePath, fileName, historyRepoID, canDownload, canCompare } from '../../utils/constants';
import Loading from '../../components/loading';
import GoBack from '../../components/common/go-back';
import SidePanel from './side-panel';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';

import '../../css/layout.css';
import '../../css/sdoc-file-history.css';

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
    };
  }

  onSelectHistoryVersion = (currentVersion, lastVersion) => {
    this.setState({ isLoading: true, currentVersion });
    seafileAPI.getFileRevision(historyRepoID, currentVersion.commitId, currentVersion.path).then(res => {
      return seafileAPI.getFileContent(res.data);
    }).then(res => {
      const currentVersionContent = res.data;
      lastVersion && seafileAPI.getFileRevision(historyRepoID, lastVersion.commitId, lastVersion.path).then(res => {
        return seafileAPI.getFileContent(res.data);
      }).then(res => {
        const lastVersionContent = res.data;
        this.setContent(currentVersionContent, lastVersionContent);
      }).catch(error => {
        const errorMessage = Utils.getErrorMsg(error, true);
        toaster.danger(gettext(errorMessage));
        this.setContent(currentVersionContent, '');
      });
    }).catch(error => {
      const errorMessage = Utils.getErrorMsg(error, true);
      toaster.danger(gettext(errorMessage));
      this.setContent('', '');
    });
  }

  setContent = (currentVersionContent = '', lastVersionContent = '') => {
    this.setState({ currentVersionContent, lastVersionContent, isLoading: false });
  }

  onShowChanges = (isShowChanges) => {
    this.setState({ isShowChanges }, () => {
      localStorage.setItem('seahub-sdoc-history-show-changes', isShowChanges + '');
    });
  }

  render() {
    const { currentVersion, isShowChanges, currentVersionContent, lastVersionContent, isLoading } = this.state;

    return (
      <div className="sdoc-file-history d-flex h-100 w-100 o-hidden">
        <div className="sdoc-file-history-container d-flex flex-column">
          <div className="sdoc-file-history-header pt-2 pb-2 pl-4 pr-4 d-flex justify-content-between">
            <div className="sdoc-file-history-header-left d-flex align-items-center">
              <GoBack />
              <div className="file-name">{fileName}</div>
            </div>
            <div className="sdoc-file-history-header-right">

            </div>
          </div>
          <div className="sdoc-file-history-content f-flex flex-column">
            {isLoading ? (
              <div className="sdoc-file-history-viewer d-flex align-items-center justify-content-center">
                <Loading />
              </div>
            ) : (
              <DiffViewer
                currentContent={currentVersionContent}
                lastContent={isShowChanges ? lastVersionContent : ''}
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
