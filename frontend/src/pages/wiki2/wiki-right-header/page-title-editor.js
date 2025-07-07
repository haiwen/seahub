import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

function PageTitleEditor({ isUpdateBySide, currentPageConfig, onUpdatePage }) {

  const [pageName, setPageName] = useState(currentPageConfig.name);
  const isChineseInput = useRef(false);
  const contentEditableRef = useRef(null);
  const selectionRef = useRef(null);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      selectionRef.current = {
        startContainer: range.startContainer,
        startOffset: range.startOffset,
        endContainer: range.endContainer,
        endOffset: range.endOffset
      };
    }
  };

  const restoreSelection = useCallback(() => {
    if (selectionRef.current) {
      const { startContainer, startOffset, endContainer, endOffset } = selectionRef.current;
      // modify pageName by side panel
      if (pageName.length < startOffset) return;

      if (pageName.length === 1 && startOffset === 1) {
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(contentEditableRef.current);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }
      const range = window.document.createRange();
      range.setStart(startContainer, startOffset);
      range.setEnd(endContainer, endOffset);

      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }, [pageName]);

  const onKeyDown = (event) => {
    if (event.keyCode === 13) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const onCompositionStart = useCallback(() => {
    isChineseInput.current = true;
  }, []);

  const onCompositionEnd = useCallback((e) => {
    isChineseInput.current = false;
    setPageName(e.target.innerText);

    saveSelection();

    const newName = e.target.innerText.trim();
    const { id, icon } = currentPageConfig;
    const pageConfig = { name: newName, icon };
    onUpdatePage(id, pageConfig);
  }, [currentPageConfig, onUpdatePage]);

  const handleInput = useCallback((e) => {
    saveSelection();
    if (isChineseInput.current === false) {
      setPageName(e.target.innerText);

      const newName = e.target.innerText.trim();
      if (newName === pageName) return;
      const { id, icon } = currentPageConfig;
      const pageConfig = { name: newName, icon };

      onUpdatePage(id, pageConfig);
    }
  }, [currentPageConfig, onUpdatePage, pageName]);

  const handlePageNameUpdate = useCallback(() => {
    setPageName(currentPageConfig.name);
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(contentEditableRef.current);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }, [currentPageConfig.name]);

  useEffect(() => {
    handlePageNameUpdate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (pageName !== currentPageConfig.name && isUpdateBySide) {
      handlePageNameUpdate();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPageConfig.name, isUpdateBySide]);

  useEffect(() => {
    if (!isUpdateBySide) {
      restoreSelection();
    }
  }, [isUpdateBySide, restoreSelection]);

  return (
    <div
      className='wiki-sdoc-title'
      contentEditable
      suppressContentEditableWarning
      ref={contentEditableRef}
      onInput={handleInput}
      onKeyDown={onKeyDown}
      onCompositionStart={onCompositionStart}
      onCompositionEnd={onCompositionEnd}
    >
      {pageName}
    </div>
  );
}

PageTitleEditor.propTypes = {
  isUpdateBySide: PropTypes.bool,
  currentPageConfig: PropTypes.object,
  onUpdatePage: PropTypes.func,
};

export default PageTitleEditor;
