import React from 'react';
import PropTypes from 'prop-types';
import { siteRoot, thumbnailSizeForGrid } from '../../../utils/constants';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils';
import toaster from '../../toast';
import Dirent from '../../../models/dirent';
import { Detail, Header, Body } from '../detail';
import DirDetails from './dir-details';
import FileDetails from './file-details';
import ObjectUtils from '../../../utils/object';
import { MetadataDetailsProvider } from '../../../metadata/hooks';
import { Settings, AI } from '../../../metadata/components/metadata-details';
import { getDirentPath } from './utils';

import './index.css';

class DirentDetails extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      direntDetail: '',
      dirent: null,
    };
  }

  updateDetail = (repoID, dirent, direntPath) => {
    if (!dirent) {
      this.setState({ dirent: null, direntDetail: '' });
      return;
    }
    seafileAPI[dirent.type === 'file' ? 'getFileInfo' : 'getDirInfo'](repoID, direntPath).then(res => {
      this.setState(({
        direntDetail: res.data,
        dirent,
      }));
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
    this.loadDetail(this.props.repoID, this.props.dirent, this.props.path);
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    const { dirent, path, repoID, currentRepoInfo, repoTags, fileTags } = this.props;
    if (!ObjectUtils.isSameObject(currentRepoInfo, nextProps.currentRepoInfo) ||
        !ObjectUtils.isSameObject(dirent, nextProps.dirent, ['name']) ||
        JSON.stringify(repoTags || []) !== JSON.stringify(nextProps.repoTags || []) ||
        JSON.stringify(fileTags || []) !== JSON.stringify(nextProps.fileTags || []) ||
        path !== nextProps.path ||
        repoID !== nextProps.repoID
    ) {
      this.setState({ dirent: null }, () => {
        this.loadDetail(nextProps.repoID, nextProps.dirent, nextProps.path);
      });
    } else if (nextProps.dirent && ObjectUtils.isSameObject(dirent, nextProps.dirent, ['name'])) {
      this.setState({ dirent: nextProps.dirent });
    }
  }

  renderImage = () => {
    const { dirent } = this.state;
    if (!dirent) return null;
    const isImg = Utils.imageCheck(dirent.name);
    if (!isImg) return null;
    const { repoID, path, currentRepoInfo } = this.props;
    let src = '';
    if (currentRepoInfo.encrypted) {
      src = `${siteRoot}repo/${repoID}/raw` + Utils.encodePath(`${path === '/' ? '' : path}/${dirent.name}`);
    } else {
      src = `${siteRoot}thumbnail/${repoID}/${thumbnailSizeForGrid}` + Utils.encodePath(`${path === '/' ? '' : path}/${dirent.name}`) + '?mtime=' + this.state.direntDetail.mtime;
    }
    return (
      <div className="detail-image">
        <img src={src} alt="" />
      </div>
    );
  };

  render() {
    const { dirent, direntDetail } = this.state;
    const { repoID, fileTags } = this.props;

    if (!dirent || !direntDetail) {
      return (
        <Detail>
          <Header title={dirent?.name || ''} icon={Utils.getDirentIcon(dirent, true)} onClose={this.props.onClose} />
          <Body>
            {this.renderImage()}
          </Body>
        </Detail>
      );
    }

    let path = this.props.path;
    if (dirent?.type !== 'file') {
      path = this.props.dirent ? Utils.joinPath(path, dirent.name) : path;
    }

    return (
      <MetadataDetailsProvider
        repoID={repoID}
        repoInfo={this.props.currentRepoInfo}
        path={getDirentPath(dirent, path)}
        dirent={dirent}
        direntDetail={direntDetail}
        direntType={dirent?.type !== 'file' ? 'dir' : 'file'}
      >
        <Detail>
          <Header title={dirent?.name || ''} icon={Utils.getDirentIcon(dirent, true)} onClose={this.props.onClose} >
            <AI />
            <Settings />
          </Header>
          <Body>
            {this.renderImage()}
            {dirent && direntDetail && (
              <div className="detail-content">
                {dirent.type !== 'file' ? (
                  <DirDetails direntDetail={direntDetail} />
                ) : (
                  <FileDetails
                    repoID={repoID}
                    dirent={dirent}
                    path={path}
                    direntDetail={direntDetail}
                    repoTags={this.props.repoTags}
                    fileTagList={dirent ? dirent.file_tags : fileTags}
                    onFileTagChanged={this.props.onFileTagChanged}
                  />
                )}
              </div>
            )}
          </Body>
        </Detail>
      </MetadataDetailsProvider>
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
