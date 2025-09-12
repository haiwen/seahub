import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Modal, ModalBody, Input } from 'reactstrap';
import isHotkey from 'is-hotkey';
import PropTypes from 'prop-types';
import FileManager from '../../data/file-manager';
import { loadFilesFromRepo, saveFilesToRepo } from '../../data/server-storage';
import LocalImage from './local-image';

import './index.css';
import { updateStaleImageStatuses } from '../../utils/exdraw-utils';
import { isInitializedImageElement } from '../../utils/element-utils';
import { CaptureUpdateAction } from '@excalidraw/excalidraw';
import LocalData from '../../data/local-data';
import SocketManager from '../../socket/socket-manager';

const SelectSdocFileDialog = ({ excalidrawAPI, closeDialog, insertLinkCallback }) => {
  const { t } = useTranslation('sdoc-editor');
  const [currentSelectedFile, setCurrentSelectedFile] = useState(null);
  const [temSearchContent, setTemSearchContent] = useState('');
  const [searchContent, setSearchContent] = useState('');
  const [isOpenSearch, setIsOpenSearch] = useState(false);
  const fileManagerRef = useRef(null);

  let modalTitle = 'Select_image';
  fileManagerRef.current = new FileManager({
    getFiles: async (ids) => {
      return loadFilesFromRepo(ids);
    },
    saveFiles: async ({ addedFiles }) => {
      const { savedFiles, erroredFiles } = await saveFilesToRepo(addedFiles);

      return {
        savedFiles: savedFiles.reduce((acc, id) => {
          const fileData = addedFiles.get(id);
          if (fileData) {
            acc.set(id, fileData);
          }
          return acc;
        }, new Map()),
        erroredFiles: erroredFiles.reduce((acc, id) => {
          const fileData = addedFiles.get(id);
          if (fileData) {
            acc.set(id, fileData);
          }
          return acc;
        }, new Map())
      };
    }
  });

  const onSelectedFile = useCallback((fileInfo) => {
    setCurrentSelectedFile(fileInfo);
  }, []);

  const insertFile = useCallback(async (fileInfo) => {
    const imageElement = {
      'type': 'image',
      'version': 1,
      'versionNonce': Math.random(),
      'isDeleted': false,
      'id': Date.now(),
      'fillStyle': 'hachure',
      'strokeWidth': 1,
      'strokeStyle': 'solid',
      'roughness': 1,
      'opacity': 100,
      'angle': 0,
      'x': 100,
      'y': 200,
      'strokeColor': '#000000',
      'backgroundColor': 'transparent',
      'width': 300,
      'height': 200,
      'seed': 987654321,
      'groupIds': [],
      'frameId': null,
      'roundness': null,
      'boundElements': null,
      'updated': 1630000000000,
      'link': null,
      'locked': false,
      'status': 'saved',
      'fileId': fileInfo.name.split('.')[0],
      'scale': [1, 1]
    };
    excalidrawAPI.updateScene({
      elements: [imageElement],
      captureUpdate: CaptureUpdateAction.IMMEDIATELY,
    });
    const newElement = [...excalidrawAPI.getSceneElementsIncludingDeleted(), imageElement];

    loadImages(newElement, true);
  }, [excalidrawAPI]);

  const loadImages = (data, isInitialLoad) => {
    const socketManager = SocketManager.getInstance();
    if (socketManager) {
      if (data) {
        socketManager.fetchImageFilesFromRepo({
          elements: data,
          forceFetchFiles: true,
        }).then(({ loadedFiles, erroredFiles }) => {
          excalidrawAPI.addFiles(loadedFiles);
          updateStaleImageStatuses({
            excalidrawAPI,
            erroredFiles,
            elements: excalidrawAPI.getSceneElementsIncludingDeleted(),
          });
        });
      }
    } else {
      const fileIds =
        data.scene.elements?.reduce((acc, element) => {
          if (isInitializedImageElement(element)) {
            return acc.concat(element.fileId);
          }
          return acc;
        }, []) || [];
      if (isInitialLoad && fileIds.length) {
        LocalData.fileStorage
          .getFiles(fileIds)
          .then(({ loadedFiles, erroredFiles }) => {
            if (loadedFiles.length) {
              excalidrawAPI.addFiles(loadedFiles);
            }
            updateStaleImageStatuses({
              excalidrawAPI,
              erroredFiles,
              elements: excalidrawAPI.getSceneElementsIncludingDeleted(),
            });
          });

        LocalData.fileStorage.clearObsoleteFiles({ currentFileIds: fileIds });
      }
    }
  };

  const onSubmit = useCallback(() => {
    if (!currentSelectedFile) return;

    insertFile(currentSelectedFile);
    closeDialog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSelectedFile]);

  const toggleSearch = useCallback(() => {
    setIsOpenSearch((prev) => !prev);
  }, []);

  const handleSearchInputChange = useCallback((e) => {
    const keyword = e.target.value.toLowerCase();
    setTemSearchContent(keyword);
  }, []);

  const executeSearch = useCallback(() => {
    if (!temSearchContent.trim()) {
      setSearchContent('');
      return;
    }
    setSearchContent(temSearchContent);
  }, [temSearchContent]);

  const handleInputKeyDown = useCallback((e) => {
    if (isHotkey('enter', e)) {
      e.preventDefault();
      executeSearch();
    }
    if (isHotkey('escape', e)) {
      e.preventDefault();
      e.stopPropagation();
      setIsOpenSearch(!isOpenSearch);
    }
  }, [executeSearch, isOpenSearch]);

  useEffect(() => {
    if (!isOpenSearch) {
      setSearchContent('');
    }
  }, [isOpenSearch]);

  return (
    <Modal isOpen={true} autoFocus={false} zIndex={1071} returnFocusAfterClose={false} className="sdoc-file-select-dialog" contentClassName="sdoc-file-select-modal">
      <div className='modal-header-container'>
        <h5 className='modal-title-container'>{t(modalTitle)}</h5>
        <div className='search-container'>
          {!isOpenSearch && <div className='search-icon-container'><div className='sdocfont sdoc-find-replace sdoc-files-search-popover' onClick={toggleSearch} ></div></div>}
          {isOpenSearch && (
            <div className='sdoc-files-search-popover-container'>
              <div className='sdoc-search-wrapper'>
                <div className='sdocfont sdoc-find-replace sdoc-search'></div>
                <Input autoFocus className='sdoc-search-input' onKeyUp={handleInputKeyDown} onChange={handleSearchInputChange} id='sdoc-search' placeholder={t('Search')} />
                <div className='sdocfont sdoc-close1 sdoc-close' onClick={toggleSearch}></div>
              </div>
            </div>
          )}
        </div>
        <div className='sdocfont sdoc-close1 sdoc-close-dialog' onClick={closeDialog}></div>
      </div>
      <ModalBody className='p-0'>
        <div className='sdoc-file-select-container'>
          <LocalImage fileType='image' onSelectedFile={onSelectedFile} toggle={closeDialog} searchContent={searchContent} isOpenSearch={isOpenSearch} />
          <div className='sdoc-file-select-footer'>
            <Button color='secondary' className='mr-2' onClick={closeDialog}>{t('Cancel')}</Button>
            <Button color='primary' className='highlight-bg-color' disabled={!currentSelectedFile} onClick={onSubmit}>{t('Confirm')}</Button>
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
};

SelectSdocFileDialog.propTypes = {
  closeDialog: PropTypes.func,
};

export default SelectSdocFileDialog;
