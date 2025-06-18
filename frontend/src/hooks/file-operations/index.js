import React, { useCallback, useContext, useRef } from 'react';
import { DownloadFileProvider } from './download';
import { CreateFileProvider } from './create-file';
import { CreateFolderProvider } from './create-folder';
import { RenameFileProvider } from './rename';
import { MoveFileProvider } from './move';
import { CopyFileProvider } from './copy';
import { ShareFileProvider } from './share';
import { LibSubFolderPermissionProvider } from './permission';
import { AccessLogProvider } from './access-log';

// This hook provides content about file operations, like a middleware
const FileOperationsContext = React.createContext(null);

export const FileOperationsProvider = ({
  repoID, repoInfo, eventBus, enableDirPrivateShare, isGroupOwnedRepo,
  onCreateFolder, onCreateFile,
  onRename,
  onMove, onMoveItem,
  onCopy, onCopyItem,
  children
}) => {
  const createFileRef = useRef(null);
  const createFolderRef = useRef(null);
  const renameRef = useRef(null);
  const downloadRef = useRef(null);
  const moveRef = useRef(null);
  const copyRef = useRef(null);
  const shareRef = useRef(null);
  const permissionRef = useRef(null);
  const logRef = useRef(null);

  const handleDownload = useCallback((...params) => {
    downloadRef.current.handleDownload(...params);
  }, []);

  const handleCreateFolder = useCallback((...params) => {
    createFolderRef.current.handleCreateFolder(...params);
  }, []);

  const handleCreateFile = useCallback((...params) => {
    createFileRef.current.handleCreateFile(...params);
  }, []);

  const handleMove = useCallback((...params) => {
    moveRef.current.handleMove(...params);
  }, []);

  const handleCopy = useCallback((...params) => {
    copyRef.current.handleCopy(...params);
  }, []);

  const handleShare = useCallback((...params) => {
    shareRef.current.handleShare(...params);
  }, []);

  const handleRename = useCallback((...params) => {
    renameRef.current.handleRename(...params);
  }, []);

  const handleLibSubFolderPermission = useCallback((...params) => {
    permissionRef.current.handleLibSubFolderPermission(...params);
  }, []);

  const handleAccessLog = useCallback((...params) => {
    logRef.current.handleAccessLog(...params);
  }, []);

  return (
    <FileOperationsContext.Provider value={{ eventBus, handleDownload, handleCreateFolder, handleCreateFile, handleMove, handleCopy, handleShare, handleRename, handleLibSubFolderPermission, handleAccessLog }}>
      <CreateFolderProvider eventBus={eventBus} onCreateFolder={onCreateFolder} ref={createFolderRef}>
        <CreateFileProvider eventBus={eventBus} onCreateFile={onCreateFile} ref={createFileRef}>
          <RenameFileProvider eventBus={eventBus} onRename={onRename} ref={renameRef}>
            <MoveFileProvider eventBus={eventBus} repoID={repoID} repoInfo={repoInfo} onCreateFolder={onCreateFolder} onMove={onMove} onMoveItem={onMoveItem} ref={moveRef}>
              <CopyFileProvider eventBus={eventBus} repoID={repoID} repoInfo={repoInfo} onCreateFolder={onCreateFolder} onCopy={onCopy} onCopyItem={onCopyItem} ref={copyRef}>
                <DownloadFileProvider repoID={repoID} eventBus={eventBus} ref={downloadRef}>
                  <ShareFileProvider repoID={repoID} eventBus={eventBus} repoInfo={repoInfo} isGroupOwnedRepo={isGroupOwnedRepo} enableDirPrivateShare={enableDirPrivateShare} ref={shareRef}>
                    <LibSubFolderPermissionProvider repoID={repoID} eventBus={eventBus} isGroupOwnedRepo={isGroupOwnedRepo} ref={permissionRef}>
                      <AccessLogProvider repoID={repoID} eventBus={eventBus} ref={logRef}>
                        {children}
                      </AccessLogProvider>
                    </LibSubFolderPermissionProvider>
                  </ShareFileProvider>
                </DownloadFileProvider>
              </CopyFileProvider>
            </MoveFileProvider>
          </RenameFileProvider>
        </CreateFileProvider>
      </CreateFolderProvider>
    </FileOperationsContext.Provider>
  );
};

export const useFileOperations = () => {
  const context = useContext(FileOperationsContext);
  if (!context) {
    throw new Error('\'FileOperationsContext\' is null');
  }
  return context;
};
