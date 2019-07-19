import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Nav, NavItem, NavLink, TabContent, TabPane } from 'reactstrap';
import DetailCommentList from './detail-comments-list';
import { siteRoot } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import Dirent from '../../models/dirent';
import DetailListView from './detail-list-view';
import FileTag from '../../models/file-tag';
import '../../css/dirent-detail.css';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  dirent: PropTypes.object,
  path: PropTypes.string.isRequired,
  currentRepoInfo: PropTypes.object.isRequired,
  onItemDetailsClose: PropTypes.func.isRequired,
  onFileTagChanged: PropTypes.func.isRequired,
  direntDetailPanelTab: PropTypes.string,
};

class DirentDetail extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      direntType: '',
      direntDetail: '',
      fileTagList: [],
      relatedFiles: [],
      folderDirent: null,
      activeTab: 'info',
    };
  }

  componentWillMount() {
    if (this.props.direntDetailPanelTab) {
      this.tabItemClick(this.props.direntDetailPanelTab);
    }
  }

  componentDidMount() {
    let { dirent, path, repoID } = this.props;
    this.loadDirentInfo(dirent, path, repoID);
  }

  componentWillReceiveProps(nextProps) {
    let { dirent, path, repoID } = nextProps;
    this.loadDirentInfo(dirent, path, repoID);
    if (this.props.direntDetailPanelTab) {
      this.tabItemClick(this.props.direntDetailPanelTab);
    }
  }

  loadDirentInfo = (dirent, path, repoID) => {
    if (dirent) {
      let direntPath = Utils.joinPath(path, dirent.name);
      this.updateDetailView(dirent, direntPath);
    } else {
      let dirPath = Utils.getDirName(path);
      seafileAPI.listDir(repoID, dirPath).then(res => {
        let direntList = res.data.dirent_list;
        let folderDirent = null;
        for (let i = 0; i < direntList.length; i++) {
          let dirent = direntList[i];
          if (dirent.parent_dir + dirent.name === path) {
            folderDirent = new Dirent(dirent);
            break;
          }
        }
        this.setState({folderDirent: folderDirent});
        this.updateDetailView(folderDirent, path);
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
  }


  updateDetailView = (dirent, direntPath) => {
    let repoID = this.props.repoID;
    if (dirent.type === 'file') {
      seafileAPI.getFileInfo(repoID, direntPath).then(res => {
        this.setState({
          direntType: 'file',
          direntDetail: res.data,
        });
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
      seafileAPI.listFileTags(repoID, direntPath).then(res => {
        let fileTagList = [];
        res.data.file_tags.forEach(item => {
          let file_tag = new FileTag(item);
          fileTagList.push(file_tag);
        });
        this.setState({fileTagList: fileTagList});
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
      seafileAPI.listRelatedFiles(repoID, direntPath).then(res => {
        let relatedFiles = [];
        res.data.related_files.map((relatedFile) => {
          relatedFiles.push(relatedFile);
        });
        this.setState({
          relatedFiles: relatedFiles,
        });
      }).catch((error) => {
        if (error.response.status === 500) {
          this.setState({
            relatedFiles: []
          });
        }
      });
    } else {
      seafileAPI.getDirInfo(repoID, direntPath).then(res => {
        this.setState({
          direntType: 'dir',
          direntDetail: res.data
        });
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
  }

  onRelatedFileChange = (dirent, direntPath) => {
    this.updateDetailView(dirent, direntPath);
  }

  tabItemClick = (tab) => {
    if (this.state.activeTab !== tab) {
      this.setState({ activeTab: tab });
    }
  }

  renderNavItem = (showTab) => {
    switch(showTab) {
      case 'info':
        return (
          <NavItem className="nav-item w-50">
            <NavLink className={classnames({ active: this.state.activeTab === 'info' })} onClick={() => { this.tabItemClick('info');}}>
              <i className="fas fa-info-circle"></i>
            </NavLink>
          </NavItem>
        );
      case 'comments':
        return (
          <NavItem className="nav-item w-50">
            <NavLink className={classnames({ active: this.state.activeTab === 'comments' })} onClick={() => {this.tabItemClick('comments');}}>
              <i className="fa fa-comments"></i>
            </NavLink>
          </NavItem>
        );
    }
  }

  renderHeader = (smallIconUrl, direntName) => {
    return (
      <div className="detail-header">
        <div className="detail-control sf2-icon-x1" onClick={this.props.onItemDetailsClose}></div>
        <div className="detail-title dirent-title">
          <img src={smallIconUrl} width="24" height="24" alt="" />{' '}
          <span className="name ellipsis" title={direntName}>{direntName}</span>
        </div>
      </div>
    );
  }

  renderDetailBody = (bigIconUrl, folderDirent) => {
    return (
      <Fragment>
        <div className="detail-body dirent-info">
          <div className="img"><img src={bigIconUrl} className="thumbnail" alt="" /></div>
          {this.state.direntDetail && 
            <div className="dirent-table-container">
              <DetailListView 
                repoInfo={this.props.currentRepoInfo}
                path={this.props.path}
                repoID={this.props.repoID}
                dirent={this.props.dirent || folderDirent}
                direntType={this.state.direntType}
                direntDetail={this.state.direntDetail} 
                fileTagList={this.state.fileTagList}
                relatedFiles={this.state.relatedFiles}
                onFileTagChanged={this.props.onFileTagChanged}
                onRelatedFileChange={this.onRelatedFileChange}
              />
            </div>
          }
        </div>
      </Fragment>
    );
  }

  render() {
    let { dirent, repoID, path } = this.props;
    let { folderDirent } = this.state;
    if (!dirent && !folderDirent) {
      return '';
    }
    let smallIconUrl = dirent ? Utils.getDirentIcon(dirent) : Utils.getDirentIcon(folderDirent);
    let bigIconUrl = dirent ? Utils.getDirentIcon(dirent, true) : Utils.getDirentIcon(folderDirent, true);
    const isImg = dirent ? Utils.imageCheck(dirent.name) : Utils.imageCheck(folderDirent.name);
    if (isImg) {
      bigIconUrl = `${siteRoot}thumbnail/${repoID}/1024` + Utils.encodePath(`${path === '/' ? '' : path}/${dirent.name}`);
    }
    let direntName = dirent ? dirent.name : folderDirent.name;

    if ((dirent && dirent.type === 'file') || path.lastIndexOf('.') > -1) {
      return (
        <div className="detail-container">
          {this.renderHeader(smallIconUrl, direntName)}
          <Nav tabs className="mx-0">{this.renderNavItem('info')}{this.renderNavItem('comments')}</Nav>
          <TabContent activeTab={this.state.activeTab}>
            <TabPane tabId="info">{this.renderDetailBody(bigIconUrl, folderDirent)}</TabPane>
            <TabPane tabId="comments" className="comments h-100">
              <DetailCommentList
                repoID={this.props.repoID}
                filePath={(dirent && dirent.type === 'file') ? Utils.joinPath(path, dirent.name) : path}
              />
            </TabPane>
          </TabContent>
        </div>
      );
    } else {
      return (
        <div className="detail-container">
          {this.renderHeader(smallIconUrl, direntName)}
          {this.renderDetailBody(bigIconUrl, folderDirent)}
        </div>
      );
    }
  }
}

DirentDetail.propTypes = propTypes;

export default DirentDetail;