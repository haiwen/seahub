import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../../utils/utils';
import { seafileAPI } from '../../../utils/seafile-api';
import { Repo } from '../../../models';
import toaster from '../../toast';
import Details from './details';
import { MetadataDetailsProvider } from '../../../metadata';
import { MetadataStatusProvider } from '../../../hooks';
import LibDetail from '../../dirent-detail/lib-details';
import { Body, Header } from '../../dirent-detail/detail';
import { gettext, mediaUrl, siteRoot, thumbnailSizeForGrid } from '../../../utils/constants';

import './index.css';

const SearchedItemDetails = ({ repoID, path, dirent }) => {
  const [repoInfo, setRepoInfo] = useState(null);
  const [direntDetail, setDirentDetail] = useState(null);
  const [errMessage, setErrMessage] = useState(null);
  const [libErrorMessage, setLibErrorMessage] = useState(null);

  useEffect(() => {
    setRepoInfo(null);
    setLibErrorMessage(null);
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

          const storeKey = 'sfVisitedSearchItems' + repoID;
          const visitedItems = JSON.parse(localStorage.getItem(storeKey)) || [];
          const filteredItems = visitedItems.filter(item => item.repo_id !== repoID);
          localStorage.setItem(storeKey, JSON.stringify(filteredItems));
        } else {
          const errMessage = Utils.getErrorMsg(error);
          toaster.danger(errMessage);
        }
      }
    };
    const timer = setTimeout(fetchData, 100);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [repoID, path]);

  useEffect(() => {
    setDirentDetail(null);
    setErrMessage(null);
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
          const storeKey = 'sfVisitedSearchItems' + repoID;
          const visitedItems = JSON.parse(localStorage.getItem(storeKey)) || [];
          const filteredItems = visitedItems.filter(item =>
            item.path !== path || item.repo_id !== repoID
          );
          localStorage.setItem(storeKey, JSON.stringify(filteredItems));
          const err = `${dirent.type === 'file' ? 'File' : 'Folder'} does not exist`;
          setErrMessage(err);
          return;
        }
        const errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      }
    };

    const timer = setTimeout(fetchData, 100);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [repoID, repoInfo, path, dirent]);

  // search result is repo, this repo has been deleted; search result is file or folder, the repo has been deleted
  if (!repoInfo && libErrorMessage) {
    return (
      <div className="searched-item-details">
        <div
          className="cur-view-detail"
          style={{ width: 300 }}
        >
          <Header title={dirent?.name || ''} icon={dirent.path === '/' ? (mediaUrl + 'img/lib/256/lib.png') : Utils.getDirentIcon(dirent)}></Header>
          <Body className="error">
            {libErrorMessage}
          </Body>
        </div>
      </div>
    );
  }

  if (!repoInfo) return;

  // search result is file or folder, but the file or folder has been deleted
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

  let src = '';
  if (Utils.imageCheck(dirent.name)) {
    if (repoInfo.encrypted) {
      src = `${siteRoot}repo/${repoID}/raw` + Utils.encodePath(`${path === '/' ? '' : path}`);
    } else {
      src = `${siteRoot}thumbnail/${repoID}/${thumbnailSizeForGrid}` + Utils.encodePath(`${path === '/' ? '' : path}`) + '?mtime=' + direntDetail.mtime;
    }
  }

  return (
    <div className="searched-item-details">
      <div className="cur-view-detail" style={{ width: 300 }}>
        <Header title={dirent?.name || ''} icon={Utils.getDirentIcon(dirent, true)}></Header>
        <Body>
          {src && <div className="detail-image"><img src={src} alt="" /></div>}
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
                path={parentDir}
                dirent={dirent}
                direntDetail={direntDetail}
                errMessage={errMessage}
              />
            </MetadataDetailsProvider>
          </MetadataStatusProvider>
        </Body>
      </div>
    </div>
  );
};

SearchedItemDetails.propTypes = {
  repoID: PropTypes.string.isRequired,
  path: PropTypes.string.isRequired,
  dirent: PropTypes.object.isRequired,
};

export default SearchedItemDetails;

