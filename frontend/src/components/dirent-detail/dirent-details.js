import React from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import Dirent from '../../models/dirent';
import DetailListView from './detail-list-view';
import RepoInfo from '../../models/repo-info';
import FileTag from '../../models/file-tag';
import '../../css/dirent-detail.css';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  dirent: PropTypes.object.isRequired,
  path: PropTypes.string.isRequired,
  onItemDetailsClose: PropTypes.func.isRequired,
  onFileTagChanged: PropTypes.func.isRequired,
};

class DirentDetail extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      direntType: '',
      direntDetail: '',
      repoInfo: null,
      fileTagList: [],
      relatedFiles: [],
      currentFolderDirent: null,
    };
  }

  componentWillMount() {
    if (!this.props.dirent.name) {
      this.getCurrentFolderDirent();
    }
  }

  componentDidMount() {
    let { dirent, path, repoID } = this.props;
    let direntPath = Utils.joinPath(path, dirent.name);
    seafileAPI.getRepoInfo(repoID).then(res => {
      let repoInfo = new RepoInfo(res.data);
      this.setState({repoInfo: repoInfo});
      this.updateDetailView(dirent, direntPath);
    });
  }

  componentWillReceiveProps(nextProps) {
    let { dirent, path } = nextProps;
    let direntPath = Utils.joinPath(path, dirent.name);
    this.updateDetailView(dirent, direntPath);
    if (!dirent.name) {
      this.getCurrentFolderDirent();
    }
  }

  updateDetailView = (dirent, direntPath) => {
    let repoID = this.props.repoID;
    if (dirent && dirent.type === 'file') {
      seafileAPI.getFileInfo(repoID, direntPath).then(res => {
        this.setState({
          direntType: 'file',
          direntDetail: res.data,
        });
      });
      seafileAPI.listFileTags(repoID, direntPath).then(res => {
        let fileTagList = [];
        res.data.file_tags.forEach(item => {
          let file_tag = new FileTag(item);
          fileTagList.push(file_tag);
        });
        this.setState({fileTagList: fileTagList});
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
    } else if (this.props.path !== '/') {
      seafileAPI.getDirInfo(repoID, this.props.path).then(res => {
        this.setState({
          direntType: 'dir',
          direntDetail: res.data
        });
      });
    } else if (this.props.path === '/' && dirent.name) {
      seafileAPI.getDirInfo(repoID, '/' + dirent.name).then(res => {
        this.setState({
          direntType: 'dir',
          direntDetail: res.data
        });
      });
    } else if (this.props.path === '/' && !dirent.name) {
      this.setState({
        direntType: 'repo',
        direntDetail: {},
      });
    }
  }

  getCurrentFolderDirent = () => {
    const path = this.props.path;
    const parentPath = path.slice(0, path.lastIndexOf('/'));
    seafileAPI.listDir(this.props.repoID, parentPath).then(res => {
      try {
        res.data.dirent_list.forEach((dirent) => {
          if ((dirent.parent_dir + dirent.name) === path) throw dirent;
        });
      } catch (dirent) {
        let dirent = new Dirent(dirent);
        this.setState({ currentFolderDirent: dirent });
      }
    });
  }

  onFileTagChanged = (dirent, direntPath) => {
    this.updateDetailView(dirent, direntPath);
    this.props.onFileTagChanged(dirent, direntPath);
  }

  onRelatedFileChange = () => {
    let { dirent, path } = this.props;
    let direntPath = Utils.joinPath(path, dirent.name);
    this.updateDetailView(dirent, direntPath);
  }

  render() {
    let { dirent, path, currentRepoInfo } = this.props;
    let smallIconUrl, bigIconUrl, direntName;
    let folderDirent = this.state.currentFolderDirent;

    if (dirent.name) {
      // selected something
      smallIconUrl = Utils.getDirentIcon(dirent);
      bigIconUrl = Utils.getDirentIcon(dirent, true);
      direntName = dirent.name;
    } else if (!dirent.name && path === '/') {
      // seleted nothing and parent is repo
      smallIconUrl = Utils.getLibIconUrl(currentRepoInfo);
      bigIconUrl = Utils.getLibIconUrl(currentRepoInfo, true);
      direntName = currentRepoInfo.repo_name;
    } else if (!dirent.name && path !== '/') {
      // select nothing and parent is folder
      smallIconUrl = folderDirent && Utils.getDirentIcon(folderDirent);
      bigIconUrl = folderDirent && Utils.getDirentIcon(folderDirent, true);
      direntName = folderDirent && folderDirent.name;
    }

    return (
      <div className="detail-container">
        <div className="detail-header">
          <div className="detail-control sf2-icon-x1" onClick={this.props.onItemDetailsClose}></div>
          <div className="detail-title dirent-title">
            <img src={smallIconUrl} width="24" height="24" alt="" />{' '}
            <span className="name ellipsis" title={direntName}>{direntName}</span>
          </div>
        </div>
        <div className="detail-body dirent-info">
          <div className="img">
            <img src={bigIconUrl} width="96" alt="" />
          </div>
          {this.state.direntDetail && 
            <div className="dirent-table-container">
              <DetailListView 
                repoInfo={this.state.repoInfo}
                path={this.props.path}
                repoID={this.props.repoID}
                dirent={this.props.dirent || folderDirent}
                direntType={this.state.direntType}
                direntDetail={this.state.direntDetail} 
                fileTagList={this.state.fileTagList}
                relatedFiles={this.state.relatedFiles}
                onFileTagChanged={this.onFileTagChanged}
                onRelatedFileChange={this.onRelatedFileChange}
              />
            </div>
          }
        </div>
      </div>
    );
  }
}

DirentDetail.propTypes = propTypes;

export default DirentDetail;
