import React from 'react';
import PropTypes from 'prop-types';
import { siteRoot, mediaUrl } from '../../../utils/constants';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils';
import toaster from '../../toast';
import Dirent from '../../../models/dirent';
import { Detail, Header, Body } from '../detail';
import DirDetails from './dir-details';
import FileDetails from './file-details';
import ObjectUtils from '../../../metadata/metadata-view/utils/object-utils';
import metadataAPI from '../../../metadata/api';
import { User } from '../../../metadata/metadata-view/model';
import { UserService } from '../../../metadata/metadata-view/_basic';

import './index.css';

class DirentDetails extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      direntDetail: '',
      dirent: null,
      collaborators: [],
      collaboratorsCache: {},
    };
    this.userService = new UserService({ mediaUrl, api: metadataAPI.listUserInfo });
  }

  updateCollaboratorsCache = (user) => {
    const newCollaboratorsCache = { ...this.state.collaboratorsCache, [user.email]: user };
    this.setState({ collaboratorsCache: newCollaboratorsCache });
  };

  loadCollaborators = () => {
    metadataAPI.getCollaborators(this.props.repoID).then(res => {
      const collaborators = Array.isArray(res?.data?.user_list) ? res.data.user_list.map(user => new User(user)) : [];
      this.setState({ collaborators });
    }).catch(error => {
      this.setState({ collaborators: [] });
    });
  };

  updateDetail = (repoID, dirent, direntPath) => {
    const apiName = dirent.type === 'file' ? 'getFileInfo' : 'getDirInfo';
    seafileAPI[apiName](repoID, direntPath).then(res => {
      this.setState(({ direntDetail: res.data, dirent }));
    }).catch(error => {
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  loadDetail = (repoID, dirent, path) => {
    if (dirent) {
      const direntPath = Utils.joinPath(path, dirent.name);
      this.updateDetail(repoID, dirent, direntPath);
      return;
    }
    const dirPath = Utils.getDirName(path);
    seafileAPI.listDir(repoID, dirPath).then(res => {
      const direntList = res.data.dirent_list;
      let folderDirent = direntList.find(item => item.parent_dir + item.name === path) || null;
      if (folderDirent) {
        folderDirent = new Dirent(folderDirent);
      }
      this.updateDetail(repoID, folderDirent, path);
    }).catch(error => {
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  componentDidMount() {
    this.loadCollaborators();
    this.loadDetail(this.props.repoID, this.props.dirent, this.props.path);
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    const { dirent, path, repoID, currentRepoInfo, repoTags, fileTags } = this.props;
    if (!ObjectUtils.isSameObject(currentRepoInfo, nextProps.currentRepoInfo) ||
    !ObjectUtils.isSameObject(dirent, nextProps.dirent) ||
    JSON.stringify(repoTags || []) !== JSON.stringify(nextProps.repoTags || []) ||
    JSON.stringify(fileTags || []) !== JSON.stringify(nextProps.fileTags || []) ||
    path !== nextProps.path ||
    repoID !== nextProps.repoID) {
      this.setState({ dirent: null }, () => {
        this.loadDetail(nextProps.repoID, nextProps.dirent, nextProps.path);
      });
    }
  }

  renderImage = () => {
    const { dirent } = this.state;
    if (!dirent) return null;
    // let bigIconUrl = Utils.getDirentIcon(dirent, true);
    const isImg = Utils.imageCheck(dirent.name);
    // const isVideo = Utils.videoCheck(dirent.name);
    if (!isImg) return null;
    const { repoID, path } = this.props;
    const bigIconUrl = `${siteRoot}thumbnail/${repoID}/1024` + Utils.encodePath(`${path === '/' ? '' : path}/${dirent.name}`);
    return (
      <div className="detail-image-thumbnail">
        <img src={bigIconUrl} alt="" className="thumbnail" />
      </div>
    );
  };

  render() {
    const { dirent, direntDetail, collaborators, collaboratorsCache } = this.state;
    const { repoID, path, fileTags } = this.props;
    const direntName = dirent?.name || '';
    const smallIconUrl = dirent ? Utils.getDirentIcon(dirent) : '';

    return (
      <Detail>
        <Header title={direntName} icon={smallIconUrl} onClose={this.props.onClose} />
        <Body>
          {this.renderImage()}
          {dirent && direntDetail && (
            <div className="detail-content">
              {dirent.type !== 'file' ? (
                <DirDetails
                  repoID={repoID}
                  repoInfo={this.props.currentRepoInfo}
                  dirent={dirent}
                  direntDetail={direntDetail}
                  path={path}
                  collaborators={collaborators}
                  collaboratorsCache={collaboratorsCache}
                  updateCollaboratorsCache={this.updateCollaboratorsCache}
                  queryUserAPI={this.userService?.queryUser}
                />
              ) : (
                <FileDetails
                  repoID={repoID}
                  repoInfo={this.props.currentRepoInfo}
                  dirent={dirent}
                  path={path}
                  direntDetail={direntDetail}
                  repoTags={this.props.repoTags}
                  fileTagList={dirent ? dirent.file_tags : fileTags}
                  onFileTagChanged={this.props.onFileTagChanged}
                  collaborators={collaborators}
                  collaboratorsCache={collaboratorsCache}
                  updateCollaboratorsCache={this.updateCollaboratorsCache}
                  queryUserAPI={this.userService?.queryUser}
                />
              )}
            </div>
          )}
        </Body>
      </Detail>
    );
  }
}

DirentDetails.propTypes = {
  repoID: PropTypes.string.isRequired,
  dirent: PropTypes.object,
  path: PropTypes.string.isRequired,
  currentRepoInfo: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onFileTagChanged: PropTypes.func.isRequired,
  repoTags: PropTypes.array,
  fileTags: PropTypes.array,
};

export default DirentDetails;
