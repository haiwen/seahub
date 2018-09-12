import React from 'react';
import PropTypes from 'prop-types';
import { gettext, PER_PAGE, filePath, fileName } from '../../components/constance';
import editUtilties from '../../utils/editor-utilties';
import Loading from '../../components/loading';
import HistoryListView from '../../components/history-list-view/history-list-view';
import HistoryListMenu from '../../components/history-list-view/history-list-menu';

const propTypes = {
  onHistoryItemClick: PropTypes.func.isRequired
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
      isItemFrezeed: false
    };
  }

  componentDidMount() {
    editUtilties.getFileHistoryRecord(filePath, 1, PER_PAGE).then(res => {
      this.initResultState(res.data);
      document.addEventListener('click', this.onHideContextMenu);
    });
  }
  
  componentWillUnmount() {
    document.removeEventListener('click', this.onHideContextMenu);
  }
  
  refershFileList() {
    editUtilties.getFileHistoryRecord(filePath, 1, PER_PAGE).then(res => {
      this.initResultState(res.data);
    });
  }

  initResultState(result) {
    if (result.data.length) {
      this.setState({
        historyInfo: result.data,
        page: result.page,
        hasMore: result.total_count === PER_PAGE,
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
        page: result.page,
        hasMore: result.total_count === PER_PAGE,
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
    let currentPage = this.state.currentPage + 1;
    this.setState({
      currentPage: currentPage,
    });
    editUtilties.getFileHistoryRecord(filePath, currentPage, PER_PAGE).then(res => {
      this.updateResultState(res.data);
    });
  }

  onRestoreFile = () => {
    this.onHideContextMenu();
    let commitId = this.state.currentItem.commit_id;
    editUtilties.revertFile(filePath, commitId).then(res => {
      if (res.data.success) {
        this.setState({isLoading: true})
        this.refershFileList();
      }
    });
  }

  onDownloadFile = () => {
    this.onHideContextMenu();
  }

  onHistoryItemClick =(item) => {
    this.setState({currentItem: item});
    this.props.onHistoryItemClick(item);
  }

  render() {
    return (
      <div className="side-panel">
        <div className="side-panel-north">
          <div className="history-heading">
            <a href="javascript:window.history.back()" className="go-back" title="Back">
              <span className="icon-chevron-left"></span>
            </a>
            <span className="doc-name">{fileName}</span>
          </div>
        </div>
        <div className="side-panel-center history">
          <div className="panel-heading history-heading">{gettext('History Versions')}</div>
          <div className="history-body">
            {this.state.isLoading && <Loading />}
            {this.state.historyInfo &&
              <HistoryListView 
                historyList={this.state.historyInfo}
                onMenuControlClick={this.onShowContenxtMenu}
                isItemFrezeed={this.state.isItemFrezeed}
                reloadMore={this.reloadMore}
                currentItem={this.state.currentItem}
                onHistoryItemClick={this.onHistoryItemClick}
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
