import React from 'react';
import PropTypes from 'prop-types';
import { serviceUrl, repoID } from '../../utils/constants';
import DetailListView from './detail-list-view';
import '../../css/dirent-detail.css';
import { seafileAPI } from '../../utils/seafile-api';

const propTypes = {
  dirent: PropTypes.object.isRequired,
  direntPath: PropTypes.string.isRequired,
};

class DirentDetail extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      direntType: '',
      direntDetail: '',
    };
  }

  componentDidMount() {
    let { dirent, direntPath } = this.props;
    this.updateDetailView(dirent, direntPath);
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
          <div className="detail-control sf2-icon-x1"></div>
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
              direntDetail={this.state.direntDetail} 
              direntType={this.state.direntType}
            />
          }
        </div>
      </div>
    );
  }
}

DirentDetail.propTypes = propTypes;

export default DirentDetail;
