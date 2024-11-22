import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { wikiPermission } from '../../../utils/constants';

function PageTitleEditor({ isUpdateBySide, currentPageConfig, onUpdatePage }) {

  const [pageName, setPageName] = useState(currentPageConfig.name);
  const isChineseInput = useRef(false);
  const contentEditableRef = useRef(null);

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

    const newName = e.target.innerText.trim();
    const { id, icon } = currentPageConfig;
    const pageConfig = { name: newName, icon };
    onUpdatePage(id, pageConfig);
  }, [currentPageConfig, onUpdatePage]);

  const handleInput = useCallback((e) => {
    if (isChineseInput.current === false) {
      setPageName(e.target.innerText);

      const newName = e.target.innerText.trim();
      if (newName === pageName) return;
      const { id, icon } = currentPageConfig;
      const pageConfig = { name: newName, icon };

      onUpdatePage(id, pageConfig);
    }
  }, [currentPageConfig, onUpdatePage, pageName]);

  useEffect(() => {
    if (pageName !== currentPageConfig.name && isUpdateBySide) {
      setPageName(currentPageConfig.name);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPageConfig.name, isUpdateBySide]);

  useEffect(() => {
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(contentEditableRef.current);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }, [pageName]);


  return (
    <div>
      {wikiPermission === 'public' ?
        <div
          className='wiki-sdoc-title'
        >
          {pageName}
        </div> :
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
      }
    </div>

  );
}

PageTitleEditor.propTypes = {
  isUpdateBySide: PropTypes.bool,
  currentPageConfig: PropTypes.object,
  onUpdatePage: PropTypes.func,
};

export default PageTitleEditor;
