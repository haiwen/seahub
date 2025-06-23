import React, { useContext, useEffect, useCallback, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import ModalPortal from '../../components/modal-portal';
import CopyDirentDialog from '../../components/dialog/copy-dirent-dialog';
import { EVENT_BUS_TYPE } from '../../components/common/event-bus-type';

// This hook provides content about copy file
const CopyFileContext = React.createContext(null);

export const CopyFileProvider = forwardRef(({ eventBus, repoID, repoInfo, onCopy, onCopyItem, onCreateFolder, children }, ref) => {
  const [isDialogShow, setDialogShow] = useState();

  const propsRef = useRef({});

  const handleCopy = useCallback((path, direntData, isMultipleOperation = false, customCallback = null) => {
    propsRef.current = {
      path,
      isMultipleOperation,
      [isMultipleOperation ? 'selectedDirentList' : 'dirent']: direntData,
      [isMultipleOperation ? 'onItemsCopy' : 'onItemCopy']: customCallback || (isMultipleOperation ? onCopy : onCopyItem),
    };
    setDialogShow(true);
  }, [onCopy, onCopyItem]);

  const cancelCopy = useCallback(() => {
    setDialogShow(false);
    propsRef.current = {};
  }, []);

  useEffect(() => {
    const unsubscribeCopyFile = eventBus.subscribe(EVENT_BUS_TYPE.COPY_FILE, handleCopy);
    return () => {
      unsubscribeCopyFile();
    };
  }, [eventBus, handleCopy]);

  useImperativeHandle(ref, () => ({
    handleCopy,
    cancelCopy,
  }), [handleCopy, cancelCopy]);

  const renderDialog = useCallback(() => {
    if (!isDialogShow) return null;
    const { encrypted: repoEncrypted } = repoInfo || {};

    return (
      <ModalPortal>
        <CopyDirentDialog repoID={repoID} repoEncrypted={repoEncrypted} onAddFolder={onCreateFolder} onCancelCopy={cancelCopy} { ...propsRef.current }/>
      </ModalPortal>
    );
  }, [repoID, repoInfo, isDialogShow, onCreateFolder, cancelCopy]);

  return (
    <CopyFileContext.Provider value={{ eventBus, handleCopy }}>
      {children}
      {renderDialog()}
    </CopyFileContext.Provider>
  );
});

export const useCopyFile = () => {
  const context = useContext(CopyFileContext);
  if (!context) {
    throw new Error('\'CopyFileContext\' is null');
  }
  return context;
};
