import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../../utils/utils';
import { seafileAPI } from '../../../utils/seafile-api';
import toaster from '../../toast';
import { MetadataDetailsProvider } from '../../../metadata';
import { Repo } from '../../../models';
import { MetadataStatusProvider } from '../../../hooks';
import Details from './details';
import LibDetail from '../../dirent-detail/lib-details';
import { Body, Header } from '../../dirent-detail/detail';
import { gettext, mediaUrl } from '../../../utils/constants';

import './index.css';

const SearchedItemDetails = ({ repoID, path, dirent }) => {
  const [repoInfo, setRepoInfo] = useState(null);
  const [direntDetail, setDirentDetail] = useState(null);
  const [errMessage, setErrMessage] = useState(null);
  const [libErrorMessage, setLibErrorMessage] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      try {
        const res = await seafileAPI.getRepoInfo(repoID);
        const repo = new Repo(res.data);
        setRepoInfo(repo);
        setLibErrorMessage(null);
      } catch (error) {
        if (error.response && error.response.status === 404) {
          const err = gettext('Library does not exist');
          setRepoInfo(null);
          setLibErrorMessage(err);
        } else {
          const errMessage = Utils.getErrorMsg(error);
          toaster.danger(errMessage);
        }
      }
    };
    const timer = setTimeout(fetchData, 200);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [repoID]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      if (!repoID || !path || !dirent || dirent.isLib) {
        setDirentDetail(null);
        setErrMessage(null);
        return;
      }

      try {
        const res = await seafileAPI[dirent.type === 'file' ? 'getFileInfo' : 'getDirInfo'](
          repoID,
          path,
          { signal: controller.signal }
        );
        setDirentDetail(res.data);
        setErrMessage(null);
      } catch (error) {
        if (error.name === 'AbortError') {
          return; // Ignore abort errors
        }
        if (error.response && error.response.status === 404) {
          const err = `${dirent.type === 'file' ? 'File' : 'Folder'} does not exist`;
          setErrMessage(err);
          return;
        }
        const errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      }
    };

    const timer = setTimeout(fetchData, 200);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [repoID, repoInfo, path, dirent]);

  if (!repoInfo && libErrorMessage) {
    return (
      <div className="searched-item-details">
        <div
          className="cur-view-detail"
          style={{ width: 300 }}
        >
          <Header title={dirent?.name || ''} icon={mediaUrl + 'img/lib/256/lib.png'}></Header>
          <Body className="error">
            {libErrorMessage}
          </Body>
        </div>
      </div>
    );
  }

  if (!repoInfo) return;

  if (errMessage) {
    return (
      <div className="searched-item-details">
        <div
          className="cur-view-detail"
          style={{ width: 300 }}
        >
          <Header title={dirent?.name || ''} icon={Utils.getDirentIcon(dirent, true)}></Header>
          <Body className="error">
            {gettext(errMessage)}
          </Body>
        </div>
      </div>
    );
  }

  if (dirent.isLib) {
    return (
      <div className="searched-item-details">
        <LibDetail currentRepoInfo={repoInfo} isInSearch={true} />
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
        onErrMessage={(message) => setErrMessage(message)}
      >
        <Details
          repoID={repoID}
          repoInfo={repoInfo}
          path={parentDir}
          dirent={dirent}
          direntDetail={direntDetail}
          errMessage={errMessage}
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

