import React from 'react';
import PropTypes from 'prop-types';
import { seafileAPI } from '../../utils/seafile-api';
import DetailListView from './detail-list-view';
import Repo from '../../models/repo';
import FileTag from '../../models/file-tag';
import '../../css/dirent-detail.css';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  serviceUrl: PropTypes.string.isRequired,
  dirent: PropTypes.object.isRequired,
  direntPath: PropTypes.string.isRequired,
  onItemDetailsClose: PropTypes.func.isRequired,
  onFileTagChanged: PropTypes.func.isRequired,
};

class DirentDetail extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      direntType: '',
      direntDetail: '',
      repo: null,
      fileTagList: [],
    };
  }

  componentDidMount() {
    let { dirent, direntPath, repoID } = this.props;
    seafileAPI.getRepoInfo(repoID).then(res => {
      let repo = new Repo(res.data);
      this.setState({repo: repo});
      this.updateDetailView(dirent, direntPath);
    });
  }

  componentWillReceiveProps(nextProps) {
    this.updateDetailView(nextProps.dirent, nextProps.direntPath);
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
    } else {
      seafileAPI.getDirInfo(repoID, direntPath).then(res => {
        this.setState({
          direntType: 'dir',
          direntDetail: res.data
        });
      });
    }
  }

  render() {
    let { dirent, serviceUrl } = this.props;
    return (
      <div className="detail-container">
        <div className="detail-header">
          <div className="detail-control sf2-icon-x1" onClick={this.props.onItemDetailsClose}></div>
          <div className="detail-title dirent-title">
            <img src={dirent.type === 'dir' ? serviceUrl + '/media/img/folder-192.png' : serviceUrl + '/media/img/file/192/txt.png'} alt="icon"></img>
            <span className="name">{dirent.name}</span>
          </div>
        </div>
        <div className="detail-body dirent-info">
          <div className="img">
            <img src={dirent.type === 'dir' ? serviceUrl + '/media/img/folder-192.png' : serviceUrl + '/media/img/file/192/txt.png'} alt="icon"></img>
          </div>
          {this.state.direntDetail && 
            <div className="dirent-table-container">
              <DetailListView 
                repo={this.state.repo}
                repoID={this.props.repoID}
                dirent={this.props.dirent}
                direntPath={this.props.direntPath}
                direntType={this.state.direntType}
                direntDetail={this.state.direntDetail} 
                fileTagList={this.state.fileTagList}
                onFileTagChanged={this.props.onFileTagChanged}
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
