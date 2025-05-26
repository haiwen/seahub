import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../../utils/utils';
import { seafileAPI } from '../../../utils/seafile-api';
import toaster from '../../toast';
import { MetadataDetailsProvider } from '../../../metadata';
import { Repo } from '../../../models';
import { MetadataStatusProvider } from '../../../hooks';
import Details from './details';

import './index.css';
import LibDetail from '../../dirent-detail/lib-details';

const SearchedItemDetails = ({ repoID, path, dirent }) => {
  const [repoInfo, setRepoInfo] = useState(null);
  const [direntDetail, setDirentDetail] = useState(null);

  useEffect(() => {
    seafileAPI.getRepoInfo(repoID).then(res => {
      const repo = new Repo(res.data);
      setRepoInfo(repo);
    }).catch(error => {
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }, [repoID]);

  useEffect(() => {
    if (!repoID || !path || !dirent || dirent.isLib) {
      setDirentDetail(null);
      return;
    }
    seafileAPI[dirent.type === 'file' ? 'getFileInfo' : 'getDirInfo'](repoID, path).then(res => {
      setDirentDetail(res.data);
    }).catch(error => {
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }, [repoID, repoInfo, path, dirent]);

  if (!repoInfo) return;

  if (dirent.isLib) {
    return (
      <div className="searched-item-details">
        <LibDetail currentRepoInfo={repoInfo} />
      </div>
    );
  }

  if (!direntDetail) return null;

  let parentDir = path !== '/' && path.endsWith('/') ? path.slice(0, -1) : path; // deal with folder path comes from search results, eg: /folder/
  parentDir = Utils.getDirName(parentDir);
  return (
    <MetadataStatusProvider key={repoID} repoID={repoID} repoInfo={repoInfo}>
      <MetadataDetailsProvider
        repoID={repoID}
        repoInfo={repoInfo}
        path={path !== '/' && path.endsWith('/') ? path.slice(0, -1) : path}
        dirent={dirent}
        direntDetail={direntDetail}
        direntType={dirent?.type !== 'file' ? 'dir' : 'file'}
      >
        <Details
          repoID={repoID}
          repoInfo={repoInfo}
          path={parentDir}
          dirent={dirent}
          direntDetail={direntDetail}
        />
      </MetadataDetailsProvider>
    </MetadataStatusProvider>
  );
};

SearchedItemDetails.propTypes = {
  repoID: PropTypes.string.isRequired,
  path: PropTypes.string.isRequired,
  dirent: PropTypes.object.isRequired,
};

export default SearchedItemDetails;

