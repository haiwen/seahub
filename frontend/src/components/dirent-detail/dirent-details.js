import React from 'react';
import PropTypes from 'prop-types';
import { seafileAPI } from '../../utils/seafile-api';
import { serviceUrl, repoID } from '../../utils/constants';
import DetailListView from './detail-list-view';
import Repo from '../../models/repo';
import '../../css/dirent-detail.css';
import FileTag from '../../models/file-tag';

const propTypes = {
  dirent: PropTypes.object.isRequired,
  direntPath: PropTypes.string.isRequired,
  onItemDetailsClose: PropTypes.func.isRequired,
};

class DirentDetail extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      direntType: '',
      direntDetail: '',
      repo: null,
      filetagList: [],
    };
  }

  componentDidMount() {
    let { dirent, direntPath } = this.props;
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
    if (dirent.type === 'file') {
      seafileAPI.getFileInfo(repoID, direntPath).then(res => {
        this.setState({
          direntType: 'file',
          direntDetail: res.data,
        });
      });
      seafileAPI.listFileTags(repoID, direntPath).then(res => {
        let filetagList = [];
        res.data.file_tags.forEach(item => {
          let file_tag = new FileTag(item);
          filetagList.push(file_tag);
        });
        this.setState({filetagList: filetagList});
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
    let { dirent } = this.props;
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
            <DetailListView 
              repo={this.state.repo}
              direntPath={this.props.direntPath}
              direntType={this.state.direntType}
              direntDetail={this.state.direntDetail} 
              filetagList={this.state.filetagList}
            />
          }
        </div>
      </div>
    );
  }
}

DirentDetail.propTypes = propTypes;

export default DirentDetail;
