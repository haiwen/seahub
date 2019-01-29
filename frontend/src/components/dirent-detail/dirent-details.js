import React from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../utils/utils';
import { seafileAPI } from '../../utils/seafile-api';
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
    };
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

  onRelatedFileChange = () => {
    let { dirent, path } = this.props;
    let direntPath = Utils.joinPath(path, dirent.name);
    this.updateDetailView(dirent, direntPath);
  }

  render() {
    let { dirent } = this.props;
    let smallIconUrl = Utils.getDirentIcon(dirent);
    let bigIconUrl = Utils.getDirentIcon(dirent, true);

    return (
      <div className="detail-container">
        <div className="detail-header">
          <div className="detail-control sf2-icon-x1" onClick={this.props.onItemDetailsClose}></div>
          <div className="detail-title dirent-title">
            <img src={smallIconUrl} width="24" height="24" alt="" />{' '}
            <span className="name ellipsis" title={dirent.name}>{dirent.name}</span>
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
                dirent={this.props.dirent}
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
