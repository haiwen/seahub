import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { EventBus } from '@seafile/seafile-sdoc-editor';

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

  const isAtEndOfTitle = useCallback((el) => {
    const sel = window.getSelection();
    if (!sel.rangeCount) return false;

    const range = sel.getRangeAt(0);

    const end = document.createRange();
    end.selectNodeContents(el);
    end.collapse(false);
    return range.compareBoundaryPoints(Range.END_TO_END, end) === 0 || range.endContainer?.length === range.endOffset;
  }, []);

  const onKeyDown = useCallback((event) => {
    const sel = window.getSelection();
    const eventBus = EventBus.getInstance();

    if (sel.isCollapsed && isAtEndOfTitle(contentEditableRef.current)) {
      if (['ArrowRight', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
        eventBus.dispatch('wiki_editor_focus_internal', { key: event.key });
      }
    }
    if (event.keyCode === 13) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, [isAtEndOfTitle]);

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

  const focusTitle = useCallback(() => {
    contentEditableRef.current && contentEditableRef.current.focus();
    const range = document.createRange();
    const selection = window.getSelection();

    range.selectNodeContents(contentEditableRef.current);
    range.collapse(false);

    selection.removeAllRanges();
    selection.addRange(range);
  }, []);

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

  useEffect(() => {
    const eventBus = EventBus.getInstance();
    const unsubscribe = eventBus.subscribe('wiki_editor_focus_page_title', focusTitle);
    return () => {
      unsubscribe();
    };
  }, [focusTitle]);

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
