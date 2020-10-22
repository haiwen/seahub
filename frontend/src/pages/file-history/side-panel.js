import React from 'react';
import PropTypes from 'prop-types';
import { gettext, PER_PAGE, filePath } from '../../utils/constants';
import editUtilities from '../../utils/editor-utilities';
import Loading from '../../components/loading';
import HistoryListView from '../../components/history-list-view/history-list-view';
import toaster from '../../components/toast';

const propTypes = {
  onItemClick: PropTypes.func.isRequired,
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
    editUtilities.listFileHistoryRecords(filePath, 1, PER_PAGE).then(res => {
      let historyList = res.data;
      if (historyList.length === 0) {
        this.setState({isLoading: false});
        throw Error('there has an error in server');
      }
      this.initResultState(res.data);
    });
  }

  refershFileList() {
    editUtilities.listFileHistoryRecords(filePath, 1, PER_PAGE).then(res => {
      this.initResultState(res.data);
    });
  }

  initResultState(result) {
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
      editUtilities.listFileHistoryRecords(filePath, currentPage, PER_PAGE).then(res => {
        this.updateResultState(res.data);
        this.setState({isReloadingData: false});
      });
    }
  }

  onItemRestore = (currentItem) => {
    let commitId = currentItem.commit_id;
    editUtilities.revertFile(filePath, commitId).then(res => {
      if (res.data.success) {
        this.setState({isLoading: true});
        this.refershFileList();
      }
      let message = gettext('Successfully restored.');
      toaster.success(message);
    });
  }

  onItemClick =(item, preItem) => {
    this.props.onItemClick(item, preItem);
  }

  render() {
    return (
      <div className="side-panel history-side-panel">
        <div className="side-panel-center">
          <div className="history-side-panel-title">{gettext('History Versions')}</div>
          <div className="history-body">
            {this.state.isLoading && <Loading />}
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
