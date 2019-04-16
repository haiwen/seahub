import React from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
import Dirent from '../../models/dirent';
import DetailListView from './detail-list-view';
import FileTag from '../../models/file-tag';
import '../../css/dirent-detail.css';
import { siteRoot } from '../../utils/constants';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  dirent: PropTypes.object,
  path: PropTypes.string.isRequired,
  currentRepoInfo: PropTypes.object.isRequired,
  onItemDetailsClose: PropTypes.func.isRequired,
  onFileTagChanged: PropTypes.func.isRequired,
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
    };
  }

  componentDidMount() {
    let { dirent, path, repoID } = this.props;
    this.loadDirentInfo(dirent, path, repoID);
  }

  componentWillReceiveProps(nextProps) {
    let { dirent, path, repoID } = nextProps;
    this.loadDirentInfo(dirent, path, repoID);
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
    } else {
      seafileAPI.getDirInfo(repoID, direntPath).then(res => {
        this.setState({
          direntType: 'dir',
          direntDetail: res.data
        });
      });
    }
  }

  onRelatedFileChange = (dirent, direntPath) => {
    this.updateDetailView(dirent, direntPath);
  }

  render() {
    let { dirent } = this.props;
    let { folderDirent } = this.state;
    if (!dirent && !folderDirent) {
      return '';
    }

    let smallIconUrl = dirent ? Utils.getDirentIcon(dirent) : Utils.getDirentIcon(folderDirent);
    let bigIconUrl = dirent ? Utils.getDirentIcon(dirent, true) : Utils.getDirentIcon(folderDirent, true);
    const isImg = dirent ? Utils.imageCheck(dirent.name) : Utils.imageCheck(folderDirent.name);
    if (isImg) {
      bigIconUrl = siteRoot + 'thumbnail/' + this.props.repoID + '/1024/' + dirent.name;
    }
    let direntName = dirent ? dirent.name : folderDirent.name;

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
            <img src={bigIconUrl} className="thumbnail" alt="" />
          </div>
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
      </div>
    );
  }
}

DirentDetail.propTypes = propTypes;

export default DirentDetail;