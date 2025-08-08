import React from 'react';
import PropTypes from 'prop-types';
import { siteRoot, thumbnailSizeForGrid, enableSeafileAI, fileServerRoot, MimetypesKind } from '../../../utils/constants';
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
import { eventBus } from '../../common/event-bus';
import { EVENT_BUS_TYPE } from '../../../metadata/constants';
import VideoPlayer from '../../video-player';

import './index.css';

class DirentDetails extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      direntDetail: '',
      isHovering: false,
    };
    this.videoPlayerRef = React.createRef();
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

  componentWillUnmount() {
    eventBus.dispatch(EVENT_BUS_TYPE.CLEAR_MAP_INSTANCE);
  }

  handleVideoHover = (isHovering) => {
    this.setState({ isHovering }, () => {
      if (this.videoPlayerRef.current) {
        const player = this.videoPlayerRef.current.player;
        if (isHovering) {
          player.play();
        } else {
          player.pause();
        }
      }
    });
  };

  getImageSrc = () => {
    const { repoID, path, dirent, currentRepoInfo } = this.props;
    return currentRepoInfo.encrypted
      ? `${siteRoot}repo/${repoID}/raw${Utils.encodePath(`${path === '/' ? '' : path}/${dirent.name}`)}`
      : `${siteRoot}thumbnail/${repoID}/${thumbnailSizeForGrid}${Utils.encodePath(`${path === '/' ? '' : path}/${dirent.name}`)}?mtime=${this.state.direntDetail.mtime}`;
  };

  getVideoSrc = () => {
    const { repoID, path, dirent } = this.props;
    const encodedPath = Utils.encodePath(Utils.joinPath(path, dirent.name));
    return `${fileServerRoot}repos/${repoID}/files${encodedPath}?op=download`;
  };

  renderMedia = () => {
    const { dirent } = this.props;
    if (!dirent) return null;

    const isImage = Utils.imageCheck(dirent.name);
    const isVideo = Utils.videoCheck(dirent.name);
    if (!isImage && !isVideo) return null;

    const src = this.getImageSrc();
    const videoSrc = this.getVideoSrc();
    const mimetype = MimetypesKind[dirent.name.split('.').pop().toLowerCase()] || 'video/mp4';

    let options = {
      autoplay: false,
      preload: 'auto',
      muted: true,
      sources: [{
        src: videoSrc,
        type: mimetype
      }],
      controls: true,
      bigPlayButton: false,
      controlBar: {
        playToggle: false,
        volumnPanel: false,
        fullscreenToggle: false,
        pictureInPictureToggle: false,
        children: ['progressControl', 'remainingTimeDisplay']
      }
    };

    return (
      <div
        className="detail-image"
        onMouseEnter={() => this.handleVideoHover(true)}
        onMouseLeave={() => this.handleVideoHover(false)}
      >
        {isVideo ? (
          <VideoPlayer
            id={`video-player-${dirent.id}`}
            ref={this.videoPlayerRef}
            {...options}
          />
        ) : (
          <img src={src} alt="" />
        )}
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
            {this.renderMedia()}
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
        modifyLocalFileTags={this.props.modifyLocalFileTags}
      >
        <Detail>
          <Header title={dirent?.name || ''} icon={Utils.getDirentIcon(dirent, true)} onClose={this.props.onClose} >
            {enableSeafileAI && <AIIcon />}
            <SettingsIcon />
          </Header>
          <Body>
            {this.renderMedia()}
            {dirent && direntDetail && (
              <div className="detail-content">
                {dirent.type !== 'file' ? (
                  <DirDetails
                    direntDetail={direntDetail}
                    tagsData={this.props.tagsData}
                    addTag={this.props.addTag}
                  />
                ) : (
                  <FileDetails
                    repoID={repoID}
                    dirent={dirent}
                    path={path}
                    direntDetail={direntDetail}
                    repoTags={this.props.repoTags}
                    fileTagList={dirent ? dirent.file_tags : fileTags}
                    tagsData={this.props.tagsData}
                    addTag={this.props.addTag}
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
  enableMetadata: PropTypes.bool,
  enableFaceRecognition: PropTypes.bool,
  detailsSettings: PropTypes.object,
  tagsData: PropTypes.object,
  addTag: PropTypes.func,
  modifyDetailsSettings: PropTypes.func,
  modifyLocalFileTags: PropTypes.func,
};

export default DirentDetails;
