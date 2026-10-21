import React from 'react';
import PropTypes from 'prop-types';
import { seafileAPI } from '@/api/seafile-api';
import Loading from '@/components/loading';
import toaster from '@/components/toast';
import { gettext, PER_PAGE, filePath, historyRepoID } from '@/utils/constants';
import HistoryListView from './history-list-view/history-list-view';

const propTypes = {
  onItemClick: PropTypes.func.isRequired,
  onHistoryEmpty: PropTypes.func.isRequired,
};

class SidePanel extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      historyInfo: '',
      currentPage: 1,
      hasMore: false,
      isLoading: true,
      isError: false,
      fileOwner: '',
      isReloadingData: false,
    };
  }

  componentDidMount() {
    seafileAPI.listFileHistoryRecords(historyRepoID, filePath, 1, PER_PAGE).then(res => {
      this.initResultState(res.data);
    });
  }

  refreshFileList() {
    seafileAPI.listFileHistoryRecords(historyRepoID, filePath, 1, PER_PAGE).then(res => {
      this.initResultState(res.data);
    });
  }

  initResultState(result) {
    if (result.data.length === 0) {
      this.setState({ historyInfo: '', isLoading: false, hasMore: false });
      this.props.onHistoryEmpty();
      return;
    }
    if (result.data.length) {
      this.setState({
        historyInfo: result.data,
        currentPage: result.page,
        hasMore: result.total_count > (PER_PAGE * this.state.currentPage),
        isLoading: false,
        isError: false,
        fileOwner: result.data[0].creator_email,
      });
    }
  }

  updateResultState(result) {
    if (result.data.length) {
      this.setState({
        historyInfo: [...this.state.historyInfo, ...result.data],
        currentPage: result.page,
        hasMore: result.total_count > (PER_PAGE * this.state.currentPage),
        isLoading: false,
        isError: false,
        fileOwner: result.data[0].creator_email
      });
    }
  }

  reloadMore = () => {
    if (!this.state.isReloadingData) {
      let currentPage = this.state.currentPage + 1;
      this.setState({
        currentPage: currentPage,
        isReloadingData: true,
      });
      seafileAPI.listFileHistoryRecords(historyRepoID, filePath, currentPage, PER_PAGE).then(res => {
        this.updateResultState(res.data);
        this.setState({ isReloadingData: false });
      });
    }
  };

  onItemRestore = (currentItem) => {
    let commitId = currentItem.commit_id;
    seafileAPI.revertFile(historyRepoID, filePath, commitId).then(res => {
      if (res.data.success) {
        this.setState({ isLoading: true });
        this.refreshFileList();
      }
      let message = gettext('Successfully restored.');
      toaster.success(message);
    });
  };

  onItemClick = (item, preItem) => {
    this.props.onItemClick(item, preItem);
  };

  render() {
    return (
      <div className="side-panel history-side-panel">
        <div className="side-panel-center">
          <div className="history-side-panel-title">{gettext('History Versions')}</div>
          <div className="history-body">
            {this.state.isLoading && <Loading />}
            {!this.state.isLoading && !this.state.historyInfo && (
              <div className="text-center empty-tip-color p-4">
                {gettext('No version history')}
              </div>
            )}
            {this.state.historyInfo &&
              <HistoryListView
                hasMore={this.state.hasMore}
                isReloadingData={this.state.isReloadingData}
                historyList={this.state.historyInfo}
                reloadMore={this.reloadMore}
                onItemClick={this.onItemClick}
                onItemRestore={this.onItemRestore}
              />
            }
          </div>
        </div>
      </div>
    );
  }
}

SidePanel.propTypes = propTypes;

export default SidePanel;
