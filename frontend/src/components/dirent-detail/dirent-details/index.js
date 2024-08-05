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

import './index.css';

const DirentDetails = React.memo(({ dirent: propsDirent, path, repoID, currentRepoInfo, repoTags, fileTags, onItemDetailsClose, onFileTagChanged }) => {
  const [direntType, setDirentType] = useState('');
  const [direntDetail, setDirentDetail] = useState('');
  const [dirent, setDirent] = useState(null);

  const updateDetailView = useCallback((repoID, dirent, direntPath) => {
    const apiName = dirent.type === 'file' ? 'getFileInfo' : 'getDirInfo';
    seafileAPI[apiName](repoID, direntPath).then(res => {
      setDirentType(dirent.type === 'file' ? 'file' : 'dir');
      setDirentDetail(res.data);
      setDirent(dirent);
    }).catch(error => {
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }, []);

  useEffect(() => {
    console.log('index 组件更新');
    setDirent(null);
    if (propsDirent) {
      const direntPath = Utils.joinPath(path, propsDirent.name);
      updateDetailView(repoID, propsDirent, direntPath);
      return;
    }
    const dirPath = Utils.getDirName(path);
    seafileAPI.listDir(repoID, dirPath).then(res => {
      const direntList = res.data.dirent_list;
      let folderDirent = null;
      for (let i = 0; i < direntList.length; i++) {
        let dirent = direntList[i];
        if (dirent.parent_dir + dirent.name === path) {
          folderDirent = new Dirent(dirent);
          break;
        }
      }
      updateDetailView(repoID, folderDirent, path);
    }).catch(error => {
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propsDirent, path]);

  if (!dirent) return null;
  const direntName = dirent.name;
  const smallIconUrl = Utils.getDirentIcon(dirent);
  // let bigIconUrl = dirent ? Utils.getDirentIcon(dirent, true) : Utils.getDirentIcon(folderDirent, true);
  let bigIconUrl = '';
  const isImg = Utils.imageCheck(dirent.name);
  // const isVideo = dirent ? Utils.videoCheck(dirent.name) : Utils.videoCheck(folderDirent.name);
  if (isImg) {
    bigIconUrl = `${siteRoot}thumbnail/${repoID}/1024` + Utils.encodePath(`${path === '/' ? '' : path}/${dirent.name}`);
  }

  return (
    <div className="detail-container">
      <Header title={direntName} icon={smallIconUrl} onClose={onItemDetailsClose} />
      <div className="detail-body dirent-info">
        {isImg && (
          <div className="detail-image-thumbnail">
            <img src={bigIconUrl} alt="" className="thumbnail" />
          </div>
        )}
        {direntDetail && (
          <div className="detail-content">
            {direntType === 'dir' ? (
              <DirDetails
                repoID={repoID}
                repoInfo={currentRepoInfo}
                dirent={dirent}
                direntType={direntType}
                direntDetail={direntDetail}
                path={path}
              />
            ) : (
              <FileDetails
                repoID={repoID}
                repoInfo={currentRepoInfo}
                dirent={dirent}
                direntType={direntType}
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
});

DirentDetails.propTypes = {
  repoID: PropTypes.string.isRequired,
  dirent: PropTypes.object,
  path: PropTypes.string.isRequired,
  currentRepoInfo: PropTypes.object.isRequired,
  onItemDetailsClose: PropTypes.func.isRequired,
  onFileTagChanged: PropTypes.func.isRequired,
  direntDetailPanelTab: PropTypes.string,
  repoTags: PropTypes.array,
  fileTags: PropTypes.array,
};

export default DirentDetails;
