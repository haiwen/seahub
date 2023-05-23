import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import Loading from '../../components/loading';
import { gettext, filePath, historyRepoID } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import FileHistory from '../../models/file-history';
import { Utils } from '../../utils/utils';
import editUtilities from '../../utils/editor-utilities';
import toaster from '../../components/toast';
import HistoryVersion from './history-version';
import Switch from '../../components/common/switch';

class SidePanel extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      historyVersions: [],
      errorMessage: '',
    };
    this.init();
  }

  componentDidMount() {
    this.listHistoryVersions(historyRepoID, filePath, this.nextCommit, (historyVersion, lastHistoryVersion) => {
      this.props.onSelectHistoryVersion(historyVersion, lastHistoryVersion);
    });
  }

  init = () => {
    this.hasMore = true;
    this.nextCommit = '';
    this.filePath = '';
    this.oldFilePath = '';
  }

  listHistoryVersions = (repoID, filePath, commit, callback) => {
    seafileAPI.listOldFileHistoryRecords(repoID, filePath, commit).then((res) => {
      let historyData = res.data;
      if (!historyData) {
        this.setState({ isLoading: false, errorMessage: 'There is an error in server.' });
        return;
      }
      this.updateHistoryVersions(historyData, callback);
    }).catch(error => {
      const errorMessage = Utils.getErrorMsg(error, true);
      this.setState({ isLoading: false, errorMessage: errorMessage });
    });
  }

  updateHistoryVersions(result, callback) {
    const dataCount = result.data ? result.data.length : 0;
    this.nextCommit = result.next_start_commit || '';
    if (dataCount) {
      const addedHistoryVersions = result.data.map(item => new FileHistory(item));
      this.filePath = addedHistoryVersions[dataCount - 1].path;
      this.oldFilePath = addedHistoryVersions[dataCount - 1].revRenamedOldPath;
      const historyVersions = [ ...this.state.historyVersions, ...addedHistoryVersions ];
      this.setState({ historyVersions: historyVersions, isLoading: false, errorMessage: '' }, () => {
        callback && callback(historyVersions[0], historyVersions[1]);
      });
      return;
    }
    if (this.nextCommit) {
      this.listHistoryVersions(historyRepoID, filePath, this.nextCommit);
      return;
    }
    this.hasMore = false;
    this.setState({ isLoading: false, errorMessage: '' });
  }

  onScrollHandler = (event) => {
    const clientHeight = event.target.clientHeight;
    const scrollHeight = event.target.scrollHeight;
    const scrollTop = event.target.scrollTop;
    const isBottom = (clientHeight + scrollTop + 1 >= scrollHeight);
    if (isBottom && this.hasMore && this.nextCommit) {
      this.loadMore();
    }
  }

  loadMore = () => {
    if (this.state.isLoading) return;
    this.setState({ isLoading: true }, () => {
      const currentFilePath = this.oldFilePath || this.filePath;
      this.listHistoryVersions(historyRepoID, currentFilePath, this.nextCommit);
    });
  }

  restoreVersion = (historyVersion) => {
    const { commitId, path } = historyVersion;
    editUtilities.revertFile(path, commitId).then(res => {
      if (res.data.success) {
        this.init();
        this.setState({ isLoading: true, historyVersions: [], errorMessage: '' } , () => {
          this.listHistoryVersions(historyRepoID, filePath);
        });
      }
    }).catch(error => {
      const errorMessage = Utils.getErrorMsg(error, true);
      toaster.danger(gettext(errorMessage));
    });
  }

  onSelectHistoryVersion = (historyVersion) => {
    const { isShowChanges } = this.props;
    if (!isShowChanges) {
      this.props.onSelectHistoryVersion(historyVersion);
      return;
    }
    const { historyVersions } = this.state;
    const historyVersionIndex = historyVersions.findIndex(item => item.commitId === historyVersion.commitId);
    this.props.onSelectHistoryVersion(historyVersion, historyVersions[historyVersionIndex + 1]);
  }

  copyHistoryFile = (historyVersion) => {
    const { path, revFileId, ctime } = historyVersion;
    seafileAPI.sdocCopyHistoryFile(historyRepoID, path, revFileId, ctime).then(res => {
      let message = gettext('Successfully copied %(name)s.');
      let filename = res.data.file_name;
      message = message.replace('%(name)s', filename);
      toaster.success(message);
    }).catch(error => {
      const errorMessage = Utils.getErrorMsg(error, true);
      toaster.danger(gettext(errorMessage));
    });
  }

  renderHistoryVersions = () => {
    const { isLoading, historyVersions, errorMessage } = this.state;
    if (historyVersions.length === 0) {
      if (isLoading) {
        return (
          <div className="h-100 w-100 d-flex align-items-center justify-content-center">
            <Loading />
          </div>
        );
      }
      if (errorMessage) {
        return (
          <div className="h-100 w-100 d-flex align-items-center justify-content-center error-message">
            {gettext(errorMessage)}
          </div>
        );
      }
      return (
        <div className="h-100 w-100 d-flex align-items-center justify-content-center empty-tip-color">
          {gettext('No_historical_versions')}
        </div>
      );
    }

    return (
      <>
        {historyVersions.map((historyVersion, index) => {
          return (
            <HistoryVersion
              key={historyVersion.commitId}
              index={index}
              currentVersion={this.props.currentVersion}
              historyVersion={historyVersion}
              onSelectHistoryVersion={this.onSelectHistoryVersion}
              onRestore={this.restoreVersion}
              onCopy={this.copyHistoryFile}
            />
          );
        })}
        {isLoading && (
          <div className="loading-more d-flex align-items-center justify-content-center w-100">
            <Loading />
          </div>
        )}
      </>
    );
  }

  onShowChanges = () => {
    const { isShowChanges, currentVersion } = this.props;
    const { historyVersions } = this.state;
    const historyVersionIndex = historyVersions.findIndex(item => item.commitId === currentVersion.commitId);
    const lastVersion = historyVersions[historyVersionIndex + 1];
    this.props.onShowChanges(!isShowChanges, lastVersion);
  }

  render() {
    const { historyVersions } = this.state;

    return (
      <div className="sdoc-file-history-panel h-100 o-hidden d-flex flex-column">
        <div className="sdoc-file-history-select-range">
          <div className="sdoc-file-history-select-range-title">
            {gettext('History Versions')}
          </div>
        </div>
        <div
          className={classnames('sdoc-file-history-versions', { 'o-hidden': historyVersions.length === 0 } )}
          onScroll={this.onScrollHandler}
        >
          {this.renderHistoryVersions()}
        </div>
        <div className="sdoc-file-history-diff-switch d-flex align-items-center">
          <Switch
            checked={this.props.isShowChanges}
            placeholder={gettext('Show changes')}
            className="sdoc-history-show-changes w-100"
            size="small"
            onChange={this.onShowChanges}
          />
        </div>
      </div>
    );
  }
}

SidePanel.propTypes = {
  isShowChanges: PropTypes.bool,
  currentVersion: PropTypes.object,
  onSelectHistoryVersion: PropTypes.func,
  onShowChanges: PropTypes.func,
};

export default SidePanel;
