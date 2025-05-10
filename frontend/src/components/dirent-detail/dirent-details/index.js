import React from 'react';
import PropTypes from 'prop-types';
import { siteRoot, thumbnailSizeForGrid } from '../../../utils/constants';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils';
import toaster from '../../toast';
import { Detail, Header, Body } from '../detail';
import DirDetails from './dir-details';
import FileDetails from './file-details';
import ObjectUtils from '../../../utils/object';
import { MetadataDetailsProvider } from '../../../metadata/hooks';
import AIIcon from '../../../metadata/components/metadata-details/ai-icon';
import SettingsIcon from '../../../metadata/components/metadata-details/settings-icon';

import './index.css';

const { enableSeafileAI } = window.app.config;

class DirentDetails extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      direntDetail: '',
    };
  }

  updateDetail = (repoID, dirent, direntPath) => {
    seafileAPI[dirent.type === 'file' ? 'getFileInfo' : 'getDirInfo'](repoID, direntPath).then(res => {
      this.setState({ direntDetail: res.data });
    }).catch(error => {
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  componentDidMount() {
    const fullPath = Utils.joinPath(this.props.path, this.props.dirent.name);
    this.updateDetail(this.props.repoID, this.props.dirent, fullPath);
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    const { dirent, path, repoID, currentRepoInfo, repoTags, fileTags } = this.props;
    if (!ObjectUtils.isSameObject(currentRepoInfo, nextProps.currentRepoInfo) ||
        !ObjectUtils.isSameObject(dirent, nextProps.dirent, ['name']) ||
        JSON.stringify(repoTags || []) !== JSON.stringify(nextProps.repoTags || []) ||
        JSON.stringify(fileTags || []) !== JSON.stringify(nextProps.fileTags || []) ||
        (path !== nextProps.path && !ObjectUtils.isSameObject(dirent, nextProps.dirent, ['name'])) ||
        repoID !== nextProps.repoID
    ) {
      const fullPath = Utils.joinPath(nextProps.path, nextProps.dirent.name);
      this.updateDetail(nextProps.repoID, nextProps.dirent, fullPath);
    }
  }

  renderImage = () => {
    const { dirent } = this.props;
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
    const { direntDetail } = this.state;
    const { repoID, fileTags, path, dirent } = this.props;
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

    return (
      <MetadataDetailsProvider
        repoID={repoID}
        repoInfo={this.props.currentRepoInfo}
        path={path}
        dirent={dirent}
        direntDetail={direntDetail}
        direntType={dirent?.type !== 'file' ? 'dir' : 'file'}
      >
        <Detail>
          <Header title={dirent?.name || ''} icon={Utils.getDirentIcon(dirent, true)} onClose={this.props.onClose} >
            {enableSeafileAI && <AIIcon />}
            <SettingsIcon />
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
  dirent: PropTypes.object.isRequired,
  path: PropTypes.string.isRequired,
  currentRepoInfo: PropTypes.object.isRequired,
  onClose: PropTypes.func.isRequired,
  onFileTagChanged: PropTypes.func.isRequired,
  repoTags: PropTypes.array,
  fileTags: PropTypes.array,
};

export default DirentDetails;
