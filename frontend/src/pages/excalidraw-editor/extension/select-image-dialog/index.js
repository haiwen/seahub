import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Modal, ModalBody, Input } from 'reactstrap';
import isHotkey from 'is-hotkey';
import PropTypes from 'prop-types';
import LocalImage from './local-image';

import './index.css';
const { serviceURL, siteRoot } = window.app.config;
const { repoID } = window.app.pageOptions;

const SelectSdocFileDialog = ({ isOpen, insertImage, closeDialog }) => {
  const { t } = useTranslation('sdoc-editor');
  const [currentSelectedFile, setCurrentSelectedFile] = useState(null);
  const [temSearchContent, setTemSearchContent] = useState('');
  const [searchContent, setSearchContent] = useState('');
  const [isOpenSearch, setIsOpenSearch] = useState(false);

  let modalTitle = 'Select_image';

  const onSelectedFile = useCallback((fileInfo) => {
    setCurrentSelectedFile(fileInfo);
  }, []);

  const onSubmit = useCallback(() => {
    if (!currentSelectedFile) return;
    const path = currentSelectedFile.path;
    const filePath = `${serviceURL}${siteRoot}repo/${repoID}/raw${path}`;
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
    <Modal isOpen={isOpen} autoFocus={false} zIndex={1071} returnFocusAfterClose={false} className="sdoc-file-select-dialog" contentClassName="sdoc-file-select-modal">
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
