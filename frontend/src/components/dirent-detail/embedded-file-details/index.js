import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { seafileAPI } from '../../../utils/seafile-api';
import { Utils } from '../../../utils/utils';
import toaster from '../../toast';
import { Header, Body } from '../detail';
import FileDetails from './file-details';
import { MetadataContext } from '../../../metadata';
import { MetadataDetailsProvider } from '../../../metadata/hooks';

import './index.css';

const EmbeddedFileDetails = ({ repoID, repoInfo, dirent, path, onClose, width = 300, className, component = {} }) => {
  const { headerComponent } = component;
  const [direntDetail, setDirentDetail] = useState('');

  useEffect(() => {
    // init context
    const context = new MetadataContext();
    window.sfMetadataContext = context;
    window.sfMetadataContext.init({ repoID, repoInfo });
    seafileAPI.getFileInfo(repoID, path).then(res => {
      setDirentDetail(res.data);
    }).catch(error => {
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });

    return () => {
      if (window.sfMetadataContext) {
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
      direntType="file"
    >
      <div
        className={classnames('cur-view-detail', className, {
          'cur-view-detail-small': width < 400,
          'cur-view-detail-large': width > 400
        })}
        style={{ width }}
      >
        <Header title={dirent?.name || ''} icon={Utils.getDirentIcon(dirent, true)} onClose={onClose} component={headerComponent} />
        <Body>
          {dirent && direntDetail && (
            <div className="detail-content">
              <FileDetails direntDetail={direntDetail} />
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
  onClose: PropTypes.func.isRequired,
};

export default EmbeddedFileDetails;
