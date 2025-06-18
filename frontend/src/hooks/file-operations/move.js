import React, { useContext, useEffect, useCallback, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import ModalPortal from '../../components/modal-portal';
import MoveDirentDialog from '../../components/dialog/move-dirent-dialog';
import { EVENT_BUS_TYPE } from '../../components/common/event-bus-type';

// This hook provides content about move file
const MoveFileContext = React.createContext(null);

export const MoveFileProvider = forwardRef(({ eventBus, repoID, repoInfo, onMove, onMoveItem, onCreateFolder, children }, ref) => {
  const [isDialogShow, setDialogShow] = useState();

  const propsRef = useRef({});

  const handleMove = useCallback((path, direntData, isMultipleOperation = false, customCallback) => {
    propsRef.current = {
      path,
      isMultipleOperation,
      [isMultipleOperation ? 'selectedDirentList' : 'dirent']: direntData,
      [isMultipleOperation ? 'onItemsMove' : 'onItemMove']: customCallback || (isMultipleOperation ? onMove : onMoveItem),
    };
    setDialogShow(true);
  }, [onMove, onMoveItem]);

  const cancelMove = useCallback(() => {
    setDialogShow(false);
    propsRef.current = {};
  }, []);

  const renderDialog = useCallback(() => {
    if (!isDialogShow) return null;
    const { encrypted: repoEncrypted } = repoInfo || {};
    return (
      <ModalPortal>
        <MoveDirentDialog repoID={repoID} repoEncrypted={repoEncrypted} onAddFolder={onCreateFolder} onCancelMove={cancelMove} { ...propsRef.current }/>
      </ModalPortal>
    );
  }, [repoID, repoInfo, isDialogShow, onCreateFolder, cancelMove]);

  useEffect(() => {
    const unsubscribeMoveFile = eventBus.subscribe(EVENT_BUS_TYPE.MOVE_FILE, handleMove);
    return () => {
      unsubscribeMoveFile();
    };
  }, [eventBus, handleMove]);

  useImperativeHandle(ref, () => ({
    handleMove,
    cancelMove,
  }), [handleMove, cancelMove]);

  return (
    <MoveFileContext.Provider value={{ eventBus, handleMove }}>
      {children}
      {renderDialog()}
    </MoveFileContext.Provider>
  );
});

export const useMoveFile = () => {
  const context = useContext(MoveFileContext);
  if (!context) {
    throw new Error('\'MoveFileContext\' is null');
  }
  return context;
};
