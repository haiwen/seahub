import React, { useCallback, useEffect, useState } from 'react';
import { Button, Modal, ModalBody, Input } from 'reactstrap';
import isHotkey from 'is-hotkey';
import PropTypes from 'prop-types';
import LocalImage from './local-image';
import { gettext } from '../../../../utils/constants';
import { Utils } from '../../../../utils/utils';

import './index.css';

const { serviceURL } = window.app.config;
const { repoID } = window.app.pageOptions;

const SelectSdocFileDialog = ({ isOpen, insertImage, closeDialog }) => {
  const [currentSelectedFile, setCurrentSelectedFile] = useState(null);
  const [temSearchContent, setTemSearchContent] = useState('');
  const [searchContent, setSearchContent] = useState('');
  const [isOpenSearch, setIsOpenSearch] = useState(false);

  const onSelectedFile = useCallback((fileInfo) => {
    setCurrentSelectedFile(fileInfo);
  }, []);

  const onSubmit = useCallback(() => {
    if (!currentSelectedFile) return;
    const path = currentSelectedFile.path;
    const filePath = serviceURL + '/lib/' + repoID + '/file' + Utils.encodePath(path) + '?raw=1';
    insertImage(filePath);

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
    <Modal isOpen={isOpen} autoFocus={false} zIndex={1071} returnFocusAfterClose={false} className="exdraw-file-select-dialog" contentClassName="file-select-modal">
      <div className='modal-header-container'>
        <h5 className='modal-title-container'>{gettext('Select image')}</h5>
        <div className='search-container'>
          {!isOpenSearch && (
            <div className='search-disable-container'>
              <div className='sdocfont sdoc-find-replace sdoc-files-search-popover' onClick={toggleSearch} ></div>
            </div>
          )}
          {isOpenSearch && (
            <div className='files-search-popover-container'>
              <div className='search-enable-container'>
                <div className='sdocfont sdoc-find-replace'></div>
                <Input autoFocus className='search-input' onKeyUp={handleInputKeyDown} onChange={handleSearchInputChange} placeholder={gettext('Search')} />
                <div className='sdocfont sdoc-close1' onClick={toggleSearch}></div>
              </div>
            </div>
          )}
        </div>
        <div className='sdocfont sdoc-close1' onClick={closeDialog}></div>
      </div>
      <ModalBody className='p-0'>
        <div className='file-select-container'>
          <LocalImage fileType='image' onSelectedFile={onSelectedFile} toggle={closeDialog} searchContent={searchContent} isOpenSearch={isOpenSearch} />
          <div className='file-select-footer'>
            <Button color='secondary' className='mr-2' onClick={closeDialog}>{gettext('Cancel')}</Button>
            <Button color='primary' className='highlight-bg-color' disabled={!currentSelectedFile} onClick={onSubmit}>{gettext('Confirm')}</Button>
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
