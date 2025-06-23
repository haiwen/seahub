import React, { useContext, useEffect, useCallback, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import ModalPortal from '../../components/modal-portal';
import ShareDialog from '../../components/dialog/share-dialog';
import { EVENT_BUS_TYPE } from '../../components/common/event-bus-type';

// This hook provides content about share
const ShareFileContext = React.createContext(null);

export const ShareFileProvider = forwardRef(({ repoID, eventBus, repoInfo, enableDirPrivateShare, isGroupOwnedRepo, children }, ref) => {
  const [isDialogShow, setDialogShow] = useState();

  const pathRef = useRef('');
  const direntRef = useRef([]);

  const handleShare = useCallback((path, dirent) => {
    pathRef.current = path;
    direntRef.current = dirent;
    setDialogShow(true);
  }, []);

  const cancelShare = useCallback(() => {
    setDialogShow(false);
    pathRef.current = '';
    direntRef.current = [];
  }, []);

  useEffect(() => {
    const unsubscribeShareFile = eventBus.subscribe(EVENT_BUS_TYPE.SHARE_FILE, handleShare);
    return () => {
      unsubscribeShareFile();
    };
  }, [eventBus, handleShare]);

  useImperativeHandle(ref, () => ({
    handleShare,
    cancelShare,
  }), [handleShare, cancelShare]);

  return (
    <ShareFileContext.Provider value={{ eventBus, handleShare }}>
      {children}
      {isDialogShow && (
        <ModalPortal>
          <ShareDialog
            itemType={direntRef.current.type}
            itemName={direntRef.current.name}
            itemPath={pathRef.current}
            userPerm={direntRef.current.permission || repoInfo.permission }
            repoID={repoID}
            repoEncrypted={false}
            enableDirPrivateShare={enableDirPrivateShare}
            isGroupOwnedRepo={isGroupOwnedRepo}
            toggleDialog={cancelShare}
          />
        </ModalPortal>
      )}
    </ShareFileContext.Provider>
  );
});

export const useShareFile = () => {
  const context = useContext(ShareFileContext);
  if (!context) {
    throw new Error('\'ShareFileContext\' is null');
  }
  return context;
};

