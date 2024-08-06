import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { siteRoot } from '../../../utils/constants';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils';
import toaster from '../../toast';
import Dirent from '../../../models/dirent';
import Header from '../header';
import DirDetails from './dir-details';
import FileDetails from './file-details';
import ObjectUtils from '../../../metadata/metadata-view/utils/object-utils';

import './index.css';

const DirentDetails = React.memo(({ dirent: propsDirent, path, repoID, currentRepoInfo, repoTags, fileTags, onClose, onFileTagChanged }) => {
  const [direntDetail, setDirentDetail] = useState('');
  const [dirent, setDirent] = useState(null);

  const updateDetailView = useCallback((repoID, dirent, direntPath) => {
    const apiName = dirent.type === 'file' ? 'getFileInfo' : 'getDirInfo';
    seafileAPI[apiName](repoID, direntPath).then(res => {
      setDirentDetail(res.data);
      setDirent(dirent);
    }).catch(error => {
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }, []);

  useEffect(() => {
    setDirent(null);
    if (propsDirent) {
      const direntPath = Utils.joinPath(path, propsDirent.name);
      updateDetailView(repoID, propsDirent, direntPath);
      return;
    }
    const dirPath = Utils.getDirName(path);
    seafileAPI.listDir(repoID, dirPath).then(res => {
      const direntList = res.data.dirent_list;
      let folderDirent = direntList.find(item => item.parent_dir + item.name === path) || null;
      if (folderDirent) {
        folderDirent = new Dirent(folderDirent);
      }
      updateDetailView(repoID, folderDirent, path);
    }).catch(error => {
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propsDirent, path, repoID]);

  if (!dirent) return null;
  const direntName = dirent.name;
  const smallIconUrl = Utils.getDirentIcon(dirent);
  // let bigIconUrl = Utils.getDirentIcon(dirent, true);
  let bigIconUrl = '';
  const isImg = Utils.imageCheck(dirent.name);
  // const isVideo = Utils.videoCheck(dirent.name);
  if (isImg) {
    bigIconUrl = `${siteRoot}thumbnail/${repoID}/1024` + Utils.encodePath(`${path === '/' ? '' : path}/${dirent.name}`);
  }

  return (
    <div className="detail-container">
      <Header title={direntName} icon={smallIconUrl} onClose={onClose} />
      <div className="detail-body dirent-info">
        {isImg && (
          <div className="detail-image-thumbnail">
            <img src={bigIconUrl} alt="" className="thumbnail" />
          </div>
        )}
        {direntDetail && (
          <div className="detail-content">
            {dirent.type !== 'file' ? (
              <DirDetails
                repoID={repoID}
                repoInfo={currentRepoInfo}
                dirent={dirent}
                direntDetail={direntDetail}
                path={path}
              />
            ) : (
              <FileDetails
                repoID={repoID}
                repoInfo={currentRepoInfo}
                dirent={dirent}
                path={path}
                direntDetail={direntDetail}
                repoTags={repoTags}
                fileTagList={dirent ? dirent.file_tags : fileTags}
                onFileTagChanged={onFileTagChanged}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}, (props, nextProps) => {
  const { dirent, path, repoID, currentRepoInfo, repoTags, fileTags } = props;
  const isChanged = (
    !ObjectUtils.isSameObject(currentRepoInfo, nextProps.currentRepoInfo) ||
    !ObjectUtils.isSameObject(dirent, nextProps.dirent) ||
    JSON.stringify(repoTags || []) !== JSON.stringify(nextProps.repoTags || []) ||
    JSON.stringify(fileTags || []) !== JSON.stringify(nextProps.fileTags || []) ||
    path !== nextProps.path ||
    repoID !== nextProps.repoID
  );
  return !isChanged;
});

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
