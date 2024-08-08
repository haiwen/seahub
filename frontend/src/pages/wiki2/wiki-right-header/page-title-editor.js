import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { throttle } from '../utils';

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

  const restoreSelection = () => {
    if (selectionRef.current) {
      const { startContainer, startOffset, endContainer, endOffset } = selectionRef.current;
      const range = window.document.createRange();
      range.setStart(startContainer, startOffset);
      range.setEnd(endContainer, endOffset);

      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

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
    const delayUpdate = throttle(onUpdatePage, 500);
    delayUpdate(id, pageConfig);
  }, [currentPageConfig, onUpdatePage]);

  const handleInput = useCallback((e) => {
    saveSelection();
    if (isChineseInput.current === false) {
      setPageName(e.target.innerText);

      const newName = e.target.innerText.trim();
      if (newName === pageName) return;
      const { id, icon } = currentPageConfig;
      const pageConfig = { name: newName, icon };

      const delayUpdate = throttle(onUpdatePage, 500);
      delayUpdate(id, pageConfig);
    }
  }, [currentPageConfig, onUpdatePage, pageName]);

  useEffect(() => {
    if (pageName !== currentPageConfig.name && isUpdateBySide) {
      setPageName(currentPageConfig.name);
      selectionRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPageConfig.name, isUpdateBySide]);

  useEffect(() => {
    restoreSelection();
  }, [pageName]);


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
