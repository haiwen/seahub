import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import Loading from '../../components/loading';
import { gettext, historyRepoID, PER_PAGE } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import editUtilities from '../../utils/editor-utilities';
import toaster from '../../components/toast';
import HistoryVersion from './history-version';
import Switch from '../../components/common/switch';

const { docUuid } = window.fileHistory.pageOptions;

class SidePanel extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      historyVersions: [],
      errorMessage: '',
      currentPage: 1,
      hasMore: false,
      fileOwner: '',
      isReloadingData: false,
    };
  }

  componentDidMount() {
    seafileAPI.listSdocHistory(docUuid, 1, PER_PAGE).then(res => {
      let historyList = res.data;
      if (historyList.length === 0) {
        this.setState({isLoading: false});
        throw Error('there has an error in server');
      }
      this.initResultState(res.data);
    });
  }

  refershFileList() {
    seafileAPI.listSdocHistory(docUuid, 1, PER_PAGE).then(res => {
      this.initResultState(res.data);
    });
  }

  initResultState(result) {
    if (result.histories.length) {
      this.setState({
        historyVersions: result.histories,
        currentPage: result.page,
        hasMore: result.total_count > (PER_PAGE * this.state.currentPage),
        isLoading: false,
        fileOwner: result.histories[0].creator_email,
      });
      this.props.onSelectHistoryVersion(result.histories[0], result.histories[1]);
    }
  }

  updateResultState(result) {
    if (result.histories.length) {
      this.setState({
        historyVersions: [...this.state.historyVersions, ...result.histories],
        currentPage: result.page,
        hasMore: result.total_count > (PER_PAGE * this.state.currentPage),
        isLoading: false,
        fileOwner: result.histories[0].creator_email
      });
    }
  }

  loadMore = () => {
    if (!this.state.isReloadingData) {
      let currentPage = this.state.currentPage + 1;
      this.setState({
        currentPage: currentPage,
        isReloadingData: true,
      });
      seafileAPI.listSdocHistory(docUuid, currentPage, PER_PAGE).then(res => {
        this.updateResultState(res.data);
        this.setState({isReloadingData: false});
      });
    }
  }

  renameHistoryVersion = (objID, newName) => {
    seafileAPI.renameSdocHistory(docUuid, objID, newName).then((res) => {
      this.setState({
        historyVersions: this.state.historyVersions.map(item => {
          if (item.obj_id == objID) {
            item.name = newName;
          }
          return item;
        })
      });
    }).catch(error => {
      const errorMessage = Utils.getErrorMsg(error, true);
      this.setState({ isLoading: false, errorMessage: errorMessage });
    });
  }

  onScrollHandler = (event) => {
    const clientHeight = event.target.clientHeight;
    const scrollHeight = event.target.scrollHeight;
    const scrollTop = event.target.scrollTop;
    const isBottom = (clientHeight + scrollTop + 1 >= scrollHeight);
    if (isBottom && this.state.hasMore) {
      this.loadMore();
    }
  }

  restoreVersion = (currentItem) => {
    const { commit_id, path } = currentItem;
    editUtilities.revertFile(path, commit_id).then(res => {
      if (res.data.success) {
        this.setState({isLoading: true});
        this.refershFileList();
      }
      let message = gettext('Successfully restored.');
      toaster.success(message);
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
    const historyVersionIndex = historyVersions.findIndex(item => item.commit_id === historyVersion.commit_id);
    this.props.onSelectHistoryVersion(historyVersion, historyVersions[historyVersionIndex + 1]);
  }

  copyHistoryFile = (historyVersion) => {
    const { path, obj_id, ctime_format } = historyVersion;
    seafileAPI.sdocCopyHistoryFile(historyRepoID, path, obj_id, ctime_format).then(res => {
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
              key={historyVersion.commit_id}
              index={index}
              currentVersion={this.props.currentVersion}
              historyVersion={historyVersion}
              onSelectHistoryVersion={this.onSelectHistoryVersion}
              onRestore={this.restoreVersion}
              onCopy={this.copyHistoryFile}
              renameHistoryVersion={this.renameHistoryVersion}
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
    const historyVersionIndex = historyVersions.findIndex(item => item.commit_id === currentVersion.commit_id);
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
