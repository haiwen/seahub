import React, { useContext, useEffect, useCallback, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import ModalPortal from '../../components/modal-portal';
import CreateFileDialog from '../../components/dialog/create-file-dialog';
import { EVENT_BUS_TYPE } from '../../components/common/event-bus-type';

// This hook provides content about create file
const CreateFileContext = React.createContext(null);

export const CreateFileProvider = forwardRef(({ eventBus, onCreateFile, children }, ref) => {
  const [isDialogShow, setDialogShow] = useState();

  const pathRef = useRef('');
  const fileTypeRef = useRef('');
  const direntListRef = useRef([]);

  const checkDuplicatedName = useCallback((newName) => {
    return direntListRef.current.some(object => object.name === newName);
  }, []);

  const handleCreateFile = useCallback((path, direntList = [], fileType = '') => {
    pathRef.current = path;
    fileTypeRef.current = fileType;
    direntListRef.current = direntList;
    setDialogShow(true);
  }, []);

  const cancelCreateFile = useCallback(() => {
    setDialogShow(false);
    pathRef.current = '';
    fileTypeRef.current = '';
    direntListRef.current = [];
  }, []);

  useEffect(() => {
    const unsubscribeCreateFile = eventBus.subscribe(EVENT_BUS_TYPE.CREATE_FILE, handleCreateFile);
    return () => {
      unsubscribeCreateFile();
    };
  }, [eventBus, handleCreateFile]);

  useImperativeHandle(ref, () => ({
    handleCreateFile,
    cancelCreateFile,
  }), [handleCreateFile, cancelCreateFile]);

  return (
    <CreateFileContext.Provider value={{ eventBus, handleCreateFile }}>
      {children}
      {isDialogShow && (
        <ModalPortal>
          <CreateFileDialog
            parentPath={pathRef.current}
            fileType={fileTypeRef.current}
            onAddFile={onCreateFile}
            checkDuplicatedName={checkDuplicatedName}
            toggleDialog={cancelCreateFile}
          />
        </ModalPortal>
      )}
    </CreateFileContext.Provider>
  );
});

export const useCreateFile = () => {
  const context = useContext(CreateFileContext);
  if (!context) {
    throw new Error('\'CreateFileContext\' is null');
  }
  return context;
};

