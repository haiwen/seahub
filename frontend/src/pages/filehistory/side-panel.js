import React from 'react';
import editUtilties from '../../utils/editor-utilties';
import HistoryListView from '../../components/history-list-view/history-list-view';
import HistoryListMenu from '../../components/history-list-view/history-list-menu';

const PER_PAGE = 25;
const REPO_ID = window.fileHistory.pageOptions.repoID;
const FILE_PATH = window.fileHistory.pageOptions.filePath;
const FILE_NAME = window.fileHistory.pageOptions.fileName;

class SidePanel extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      historyInfo: '',
      currentPage: 1,
      hasMore: false,
      isLoading: false,
      isError: false,
      fileOwner: '',
      isListMenuShow: false,
      isFirstItem: false,
      currentItem: '',
      menuPosition: {top: '', left: ''},
      isItemFrezeed: false
    }
  }

  componentDidMount() {
    editUtilties.getFileHistoryRecord(REPO_ID, FILE_PATH, 1, PER_PAGE).then(res => {
      this.initResultState(res.data);
    });
    document.addEventListener('click', this.onHideContextMenu);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.onHideContextMenu);
  }

  initResultState(result) {
    if (result.data.length) {
      this.setState({
        historyInfo: result.data,
        page: result.page,
        hasMore: result.total_count === PER_PAGE,
        isLoading: false,
        isError: false,
        fileOwner: result.data[0].creator_email
      })
    }
  }

  updateResultState(result) {
    if (result.data.length > 0) {
      this.setState({
        historyInfo: [...this.state.historyInfo, ...result.data],
        page: result.page,
        hasMore: result.total_count === PER_PAGE,
        isLoading: false,
        isError: false,
        fileOwner: result.data[0].creator_email
      })
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
    })
  }

  onHideContextMenu = (e) => {
    this.setState({
      isListMenuShow: false,
      isItemFrezeed: false
    })
  }

  reloadMore = () => {
    let currentPage = this.state.currentPage + 1;
    this.setState({
      currentPage: currentPage,
    });
    editUtilties.getFileHistoryRecord(REPO_ID, FILE_PATH, currentPage, PER_PAGE).then(res => {
      this.updateResultState(res.data);
    });
  }

  onRestoreFile = () => {
    let commit_id = this.state.currentItem.commit_id;
    editUtilties.revertFile(REPO_ID, FILE_PATH, commit_id).then(res => {
      if (res.data.success) {
        editUtilties.getFileHistoryRecord(REPO_ID, FILE_PATH, 1, PER_PAGE).then(res => {
          this.initResultState(res.data);
        });
      }
    })
  }

  onDownloadFile = () => {
    this.setState()
  }

  render() {
    return (
      <div className="side-panel">
        <div className="side-panel-north">
          <div className="history-heading">
            <a href="javascript:window.history.back()" className="go-back" title="Back">
              <span className="icon-chevron-left"></span>
            </a>
            <span className="doc-name">{FILE_NAME}</span>
          </div>
        </div>
        <div className="side-panel-center history">
          <div className="panel-heading history-heading">版本历史记录</div>
          <div className="history-body">
            {this.state.isloading && <div className="loading history-loading"></div>}
            {this.state.historyInfo &&
              <HistoryListView 
                historyList={this.state.historyInfo}
                onMenuControlClick={this.onShowContenxtMenu}
                isItemFrezeed={this.state.isItemFrezeed}
                reloadMore={this.reloadMore}
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

export default SidePanel;
