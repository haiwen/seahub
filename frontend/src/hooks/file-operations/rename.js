import React, { useContext, useEffect, useCallback, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import ModalPortal from '../../components/modal-portal';
import RenameDialog from '../../components/dialog/rename-dialog';
import { EVENT_BUS_TYPE } from '../../components/common/event-bus-type';

// This hook provides content about rename file
const RenameFileContext = React.createContext(null);

export const RenameFileProvider = forwardRef(({ eventBus, onRename, children }, ref) => {
  const [isDialogShow, setDialogShow] = useState();

  const direntRef = useRef('');
  const direntListRef = useRef([]);
  const callbackRef = useRef(() => {});

  const checkDuplicatedName = useCallback((newName) => {
    return direntListRef.current.some(object => object.name === newName);
  }, []);

  const handleRename = useCallback((dirent, direntList = [], callback) => {
    direntRef.current = dirent;
    direntListRef.current = direntList;
    callbackRef.current = callback || ((newName) => onRename(dirent, newName));
    setDialogShow(true);
  }, [onRename]);

  const cancelRename = useCallback(() => {
    setDialogShow(false);
    direntRef.current = null;
    direntListRef.current = [];
  }, []);

  useEffect(() => {
    const unsubscribeCreateFile = eventBus.subscribe(EVENT_BUS_TYPE.RENAME_FILE, handleRename);
    return () => {
      unsubscribeCreateFile();
    };
  }, [eventBus, handleRename]);

  useImperativeHandle(ref, () => ({
    handleRename,
    cancelRename,
  }), [handleRename, cancelRename]);

  return (
    <RenameFileContext.Provider value={{ eventBus, handleRename }}>
      {children}
      {isDialogShow && (
        <ModalPortal>
          <RenameDialog
            dirent={direntRef.current}
            onRename={callbackRef.current}
            checkDuplicatedName={checkDuplicatedName}
            toggleCancel={cancelRename}
          />
        </ModalPortal>
      )}
    </RenameFileContext.Provider>
  );
});

export const useRenameFile = () => {
  const context = useContext(RenameFileContext);
  if (!context) {
    throw new Error('\'RenameFileContext\' is null');
  }
  return context;
};

