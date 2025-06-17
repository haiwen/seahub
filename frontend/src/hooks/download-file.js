import React, { useContext, useEffect, useCallback, useState, useRef } from 'react';
import { useGoFileserver, fileServerRoot } from '../utils/constants';
import { Utils } from '../utils/utils';
import { seafileAPI } from '../utils/seafile-api';
import URLDecorator from '../utils/url-decorator';
import ModalPortal from '../components/modal-portal';
import ZipDownloadDialog from '../components/dialog/zip-download-dialog';
import toaster from '../components/toast';
import { EVENT_BUS_TYPE } from '../components/common/event-bus-type';

// This hook provides content about download
const DownloadFileContext = React.createContext(null);

export const DownloadFileProvider = ({ repoID, eventBus, children }) => {
  const [isZipDialogOpen, setZipDialogOpen] = useState();

  const pathRef = useRef('');
  const direntListRef = useRef([]);

  const handleDownload = useCallback((path, direntList = []) => {
    const direntCount = direntList.length;
    if (direntCount === 0) return;
    if (direntCount === 1 && !direntList[0].is_dir) {
      const direntPath = Utils.joinPath(path, direntList[0].name);
      const url = URLDecorator.getUrl({ type: 'download_file_url', repoID: repoID, filePath: direntPath });
      location.href = url;
      return;
    }
    direntListRef.current = direntList.map(dirent => dirent.name);

    if (!useGoFileserver) {
      pathRef.current = path;
      setZipDialogOpen(true);
      return;
    }

    seafileAPI.zipDownload(repoID, path, direntListRef.current).then((res) => {
      const zipToken = res.data['zip_token'];
      location.href = `${fileServerRoot}zip/${zipToken}`;
    }).catch((error) => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    });
  }, [repoID]);

  const cancelDownload = useCallback(() => {
    setZipDialogOpen(false);
    pathRef.current = '';
    direntListRef.current = [];
  }, []);

  useEffect(() => {
    const unsubscribeDownloadFile = eventBus.subscribe(EVENT_BUS_TYPE.DOWNLOAD_FILE, handleDownload);
    return () => {
      unsubscribeDownloadFile();
    };
  }, [eventBus, handleDownload]);

  return (
    <DownloadFileContext.Provider value={{ eventBus, handleDownload }}>
      {children}
      {isZipDialogOpen && (
        <ModalPortal>
          <ZipDownloadDialog
            repoID={repoID}
            path={pathRef.current}
            target={direntListRef.current}
            toggleDialog={cancelDownload}
          />
        </ModalPortal>
      )}
    </DownloadFileContext.Provider>
  );
};

export const useDownloadFile = () => {
  const context = useContext(DownloadFileContext);
  if (!context) {
    throw new Error('\'DownloadFileContext\' is null');
  }
  return context;
};

