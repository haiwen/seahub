import React, { useContext, useEffect, useCallback, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import ModalPortal from '../../components/modal-portal';
import CreateFolderDialog from '../../components/dialog/create-folder-dialog';
import { EVENT_BUS_TYPE } from '../../components/common/event-bus-type';

// This hook provides content about create folder
const CreateFolderContext = React.createContext(null);

export const CreateFolderProvider = forwardRef(({ eventBus, onCreateFolder, children }, ref) => {
  const [isDialogShow, setDialogShow] = useState();

  const pathRef = useRef('');
  const direntListRef = useRef([]);

  const checkDuplicatedName = useCallback((newName) => {
    return direntListRef.current.some(object => object.name === newName);
  }, []);

  const handleCreateFolder = useCallback((path, direntList = []) => {
    pathRef.current = path;
    direntListRef.current = direntList;
    setDialogShow(true);
  }, []);

  const cancelCreateFolder = useCallback(() => {
    setDialogShow(false);
    pathRef.current = '';
    direntListRef.current = [];
  }, []);

  useEffect(() => {
    const unsubscribeCreateFolder = eventBus.subscribe(EVENT_BUS_TYPE.CREATE_FOLDER, handleCreateFolder);
    return () => {
      unsubscribeCreateFolder();
    };
  }, [eventBus, handleCreateFolder]);

  useImperativeHandle(ref, () => ({
    handleCreateFolder,
    cancelCreateFolder,
  }), [handleCreateFolder, cancelCreateFolder]);

  return (
    <CreateFolderContext.Provider value={{ eventBus, handleCreateFolder }}>
      {children}
      {isDialogShow && (
        <ModalPortal>
          <CreateFolderDialog
            parentPath={pathRef.current}
            onAddFolder={onCreateFolder}
            checkDuplicatedName={checkDuplicatedName}
            addFolderCancel={cancelCreateFolder}
          />
        </ModalPortal>
      )}
    </CreateFolderContext.Provider>
  );
});

export const useCreateFolder = () => {
  const context = useContext(CreateFolderContext);
  if (!context) {
    throw new Error('\'CreateFolderContext\' is null');
  }
  return context;
};

