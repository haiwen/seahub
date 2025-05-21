import React, { useEffect, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils';
import toaster from '../../toast';
import { Header, Body } from '../detail';
import FileDetails from '../dirent-details/file-details';
import { MetadataContext } from '../../../metadata';
import { MetadataDetailsProvider } from '../../../metadata/hooks';
import AIIcon from '../../../metadata/components/metadata-details/ai-icon';
import SettingsIcon from '../../../metadata/components/metadata-details/settings-icon';
import Loading from '../../loading';
import DirDetails from '../dirent-details/dir-details';

import './index.css';

const { enableSeafileAI } = window.app.config;

const EmbeddedFileDetails = ({ repoID, repoInfo, dirent, path, onClose, width = 300, className, component = {} }) => {
  const { headerComponent } = component;
  const [direntDetail, setDirentDetail] = useState('');
  const [isFetching, setIsFetching] = useState(true);

  const isView = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.has('view');
  }, []);

  useEffect(() => {
    const fullPath = path.split('/').pop() === dirent?.name ? path : Utils.joinPath(path, dirent?.name || '');
    seafileAPI[dirent.type === 'file' ? 'getFileInfo' : 'getDirInfo'](repoID, fullPath).then(res => {
      setDirentDetail(res.data);
      setIsFetching(false);
    }).catch(error => {
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }, [repoID, path, dirent]);

  useEffect(() => {
    if (isView) return;

    let isExistContext = true;
    if (!window.sfMetadataContext) {
      const context = new MetadataContext();
      window.sfMetadataContext = context;
      window.sfMetadataContext.init({ repoID, repoInfo });
      isExistContext = false;
    }

    return () => {
      if (window.sfMetadataContext && !isExistContext) {
        window.sfMetadataContext.destroy();
        delete window['sfMetadataContext'];
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <MetadataDetailsProvider
      repoID={repoID}
      repoInfo={repoInfo}
      path={path}
      dirent={dirent}
      direntDetail={direntDetail}
      direntType={dirent?.type !== 'file' ? 'dir' : 'file'}
    >
      <div
        className={classnames('cur-view-detail', className, {
          'cur-view-detail-small': width < 400,
          'cur-view-detail-large': width > 400
        })}
        style={{ width }}
      >
        <Header title={dirent?.name || ''} icon={Utils.getDirentIcon(dirent, true)} onClose={onClose} component={headerComponent}>
          {onClose && (
            <>
              {enableSeafileAI && <AIIcon />}
              <SettingsIcon />
            </>
          )}
        </Header>
        <Body>
          {isFetching ?
            <div className="detail-content"><Loading /></div>
            :
            dirent && direntDetail && (
              <div className="detail-content">
                {dirent.type !== 'file' ? (
                  <DirDetails direntDetail={direntDetail} />
                ) : (
                  <FileDetails repoID={repoID} isShowRepoTags={false} dirent={dirent} direntDetail={direntDetail} />
                )}
              </div>
            )}
        </Body>
      </div>
    </MetadataDetailsProvider>
  );
};

EmbeddedFileDetails.propTypes = {
  repoID: PropTypes.string.isRequired,
  dirent: PropTypes.object,
  path: PropTypes.string.isRequired,
  repoInfo: PropTypes.object.isRequired,
  component: PropTypes.object,
  onClose: PropTypes.func,
};

export default EmbeddedFileDetails;
