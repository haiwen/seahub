import React from 'react';
import PropTypes from 'prop-types';
import { gettext, PER_PAGE, filePath } from '../../utils/constants';
import editUtilties from '../../utils/editor-utilties';
import Loading from '../../components/loading';
import HistoryListView from '../../components/history-list-view/history-list-view';
import HistoryListMenu from '../../components/history-list-view/history-list-menu';

const propTypes = {
  onHistoryItemClick: PropTypes.func.isRequired,
  setDiffContent: PropTypes.func.isRequired,
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
      isListMenuShow: false,
      isFirstItem: false,
      currentItem: null,
      menuPosition: {top: '', left: ''},
      isItemFrezeed: false,
      isReloadingData: false,
    };
  }

  componentDidMount() {
    editUtilties.listFileHistoryRecords(filePath, 1, PER_PAGE).then(res => {
      this.initResultState(res.data);
      document.addEventListener('click', this.onHideContextMenu);
    });
  }
  
  componentWillUnmount() {
    document.removeEventListener('click', this.onHideContextMenu);
  }
  
  refershFileList() {
    editUtilties.listFileHistoryRecords(filePath, 1, PER_PAGE).then(res => {
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
        currentItem: result.data[0],
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

  onShowContenxtMenu = (e, item, isFirstItem) => {
    let left = e.clientX - 8*16;
    let top  = e.clientY + 10;
    this.setState({
      currentItem: item,
      isFirstItem: isFirstItem,
      isListMenuShow: !this.state.isListMenuShow,
      menuPosition: {top: top, left: left},
      isItemFrezeed: !this.state.isItemFrezeed,
    });
  }

  onHideContextMenu = (e) => {
    this.setState({
      isListMenuShow: false,
      isItemFrezeed: false
    });
  }

  reloadMore = () => {
    if (!this.state.isReloadingData) {
      let currentPage = this.state.currentPage + 1;
      this.setState({
        currentPage: currentPage,
        isReloadingData: true,
      });
      editUtilties.listFileHistoryRecords(filePath, currentPage, PER_PAGE).then(res => {
        this.updateResultState(res.data);
        this.setState({
          isReloadingData: false
        });
      });
    }
  }

  onRestoreFile = () => {
    this.onHideContextMenu();
    let commitId = this.state.currentItem.commit_id;
    editUtilties.revertFile(filePath, commitId).then(res => {
      if (res.data.success) {
        this.setState({isLoading: true});
        this.refershFileList();
      }
    });
  }

  onDownloadFile = () => {
    this.onHideContextMenu();
  }

  onHistoryItemClick =(item, preCommitID) => {
    this.setState({currentItem: item});
    this.props.onHistoryItemClick(item, preCommitID);
  }

  render() {
    return (
      <div className="side-panel">
        <div className="side-panel-center">
          <div className="panel-header">{gettext('History Versions')}</div>
          <div className="history-body">
            {this.state.isLoading && <Loading />}
            {this.state.historyInfo &&
              <HistoryListView 
                hasMore={this.state.hasMore}
                isReloadingData={this.state.isReloadingData}
                historyList={this.state.historyInfo}
                onMenuControlClick={this.onShowContenxtMenu}
                isItemFrezeed={this.state.isItemFrezeed}
                reloadMore={this.reloadMore}
                currentItem={this.state.currentItem}
                onHistoryItemClick={this.onHistoryItemClick}
                setDiffContent={this.props.setDiffContent}
              />
            }
            <HistoryListMenu
              isListMenuShow={this.state.isListMenuShow}
              menuPosition={this.state.menuPosition}
              isFirstItem={this.state.isFirstItem}
              currentItem={this.state.currentItem}
              onRestoreFile={this.onRestoreFile}
              onDownloadFile={this.onDownloadFile}
            />
          </div>
        </div>
      </div>
    );
  }
}

SidePanel.propTypes = propTypes;

export default SidePanel;
