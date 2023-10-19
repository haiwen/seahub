import React from 'react';
import PropTypes from 'prop-types';
import { siteRoot, enableVideoThumbnail } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import Dirent from '../../models/dirent';
import DetailListView from './detail-list-view';

import '../../css/dirent-detail.css';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  dirent: PropTypes.object,
  path: PropTypes.string.isRequired,
  currentRepoInfo: PropTypes.object.isRequired,
  onItemDetailsClose: PropTypes.func.isRequired,
  onFileTagChanged: PropTypes.func.isRequired,
  direntDetailPanelTab: PropTypes.string,
  fileTags: PropTypes.array,
};

class DirentDetail extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      direntType: '',
      direntDetail: '',
      folderDirent: null,
    };
  }

  componentDidMount() {
    let { dirent, path, repoID } = this.props;
    this.loadDirentInfo(dirent, path, repoID);
  }

  componentWillReceiveProps(nextProps) {
    let { dirent, path, repoID } = nextProps;
    if (this.props.dirent !== nextProps.dirent) {
      this.loadDirentInfo(dirent, path, repoID);
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
  };

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
  };

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
  };

  renderDetailBody = (bigIconUrl, folderDirent) => {
    const { dirent, fileTags } = this.props;
    return (
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
              fileTagList={dirent ? dirent.file_tags : fileTags}
              onFileTagChanged={this.props.onFileTagChanged}
            />
          </div>
        }
      </div>
    );
  };

  render() {
    let { dirent, repoID, path } = this.props;
    let { folderDirent } = this.state;
    if (!dirent && !folderDirent) {
      return '';
    }
    let smallIconUrl = dirent ? Utils.getDirentIcon(dirent) : Utils.getDirentIcon(folderDirent);
    let bigIconUrl = dirent ? Utils.getDirentIcon(dirent, true) : Utils.getDirentIcon(folderDirent, true);
    const isImg = dirent ? Utils.imageCheck(dirent.name) : Utils.imageCheck(folderDirent.name);
    const isVideo = dirent ? Utils.videoCheck(dirent.name) : Utils.videoCheck(folderDirent.name);
    if (isImg || (enableVideoThumbnail && isVideo)) {
      bigIconUrl = `${siteRoot}thumbnail/${repoID}/1024` + Utils.encodePath(`${path === '/' ? '' : path}/${dirent.name}`);
    }
    let direntName = dirent ? dirent.name : folderDirent.name;
    return (
      <div className="detail-container">
        {this.renderHeader(smallIconUrl, direntName)}
        {this.renderDetailBody(bigIconUrl, folderDirent)}
      </div>
    );
  }
}

DirentDetail.propTypes = propTypes;

export default DirentDetail;
