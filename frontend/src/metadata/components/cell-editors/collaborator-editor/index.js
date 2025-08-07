import React, { forwardRef, useMemo, useImperativeHandle, useCallback, useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import SearchInput from '../../../../components/search-input';
import DeleteCollaborator from './delete-collaborator';
import { Utils } from '../../../../utils/utils';
import { KeyCodes } from '../../../../constants';
import { gettext } from '../../../../utils/constants';
import { useCollaborators } from '../../../hooks';

import './index.css';

const CollaboratorEditor = forwardRef(({
  height,
  saveImmediately = false,
  column,
  value: oldValue,
  editorPosition = { left: 0, top: 0 },
  onCommit,
  onPressTab,
  onClose,
}, ref) => {
  const [value, setValue] = useState(oldValue || []);
  const [searchValue, setSearchValue] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [maxItemNum, setMaxItemNum] = useState(0);
  const [itemHeight, setItemHeight] = useState(0);
  const editorContainerRef = useRef(null);
  const editorRef = useRef(null);
  const collaboratorItemRef = useRef(null);

  const { collaborators } = useCollaborators();
  const displayCollaborators = useMemo(() => {
    const validSearchValue = searchValue ? searchValue.trim().toLowerCase() : '';
    const validCollaborators = Array.isArray(collaborators) && collaborators.length > 0 ? collaborators : [];
    if (!validSearchValue) return validCollaborators;
    return validCollaborators.filter((collaborator) => {
      const { name, name_pinyin = '' } = collaborator;
      if (name.toString().toLowerCase().indexOf(validSearchValue) > -1) return true;
      if (!name_pinyin) return false;
      const validNamePinyin = name_pinyin.toString().toLowerCase();
      const validSearchPinyinValue = validSearchValue.replace(/ |'/g, '');

      // complete
      if (validNamePinyin.indexOf(validSearchPinyinValue) > -1) return true;
      if (validNamePinyin.replace(/'/g, '').indexOf(validSearchPinyinValue) > -1) return true;

      const validNamePinyinList = validNamePinyin.split('\'');
      // acronym
      const namePinyinAcronym = validNamePinyinList.map((item) => (item && item.trim()) ? item.trim().slice(0, 1) : '');
      if (namePinyinAcronym.join('').indexOf(validSearchPinyinValue) > -1) return true;

      return false;
    });
  }, [searchValue, collaborators]);

  const blur = useCallback(() => {
    onCommit && onCommit();
  }, [onCommit]);

  const onChangeSearch = useCallback((newSearchValue) => {
    if (searchValue === newSearchValue) return;
    setSearchValue(newSearchValue);
  }, [searchValue]);

  const onSelectCollaborator = useCallback((email) => {
    const newValue = value.slice(0);
    const collaboratorIndex = newValue.indexOf(email);
    if (collaboratorIndex > -1) {
      newValue.splice(collaboratorIndex, 1);
    } else {
      newValue.push(email);
    }
    setValue(newValue);
    if (saveImmediately) {
      onCommit && onCommit(newValue);
    }
  }, [saveImmediately, value, onCommit]);

  const onDeleteCollaborator = useCallback((email) => {
    const newValue = value.slice(0);
    const collaboratorIndex = newValue.indexOf(email);
    if (collaboratorIndex > -1) {
      newValue.splice(collaboratorIndex, 1);
    }
    setValue(newValue);
    if (saveImmediately) {
      onCommit && onCommit(newValue);
    }
  }, [saveImmediately, value, onCommit]);

  const onMenuMouseEnter = useCallback((highlightIndex) => {
    setHighlightIndex(highlightIndex);
  }, []);

  const onMenuMouseLeave = useCallback((index) => {
    setHighlightIndex(-1);
  }, []);

  const getMaxItemNum = useCallback(() => {
    let selectContainerStyle = getComputedStyle(editorContainerRef.current, null);
    let selectItemStyle = getComputedStyle(collaboratorItemRef.current, null);
    let maxSelectItemNum = Math.floor(parseInt(selectContainerStyle.maxHeight) / parseInt(selectItemStyle.height));
    return maxSelectItemNum - 1;
  }, [editorContainerRef, collaboratorItemRef]);

  const onEnter = useCallback((event) => {
    event.preventDefault();
    let collaborator;
    if (displayCollaborators.length === 1) {
      collaborator = displayCollaborators[0];
    } else if (highlightIndex > -1) {
      collaborator = displayCollaborators[highlightIndex];
    }
    if (!collaborator) return;
    onSelectCollaborator(collaborator.email);
  }, [displayCollaborators, highlightIndex, onSelectCollaborator]);

  const onUpArrow = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    if (highlightIndex === 0) {
      setHighlightIndex(displayCollaborators.length - 1);
      editorContainerRef.current.scrollTop = 0;
      return;
    }
    setHighlightIndex(highlightIndex - 1);
    if (highlightIndex > displayCollaborators.length - maxItemNum) {
      editorContainerRef.current.scrollTop -= itemHeight;
    }
  }, [editorContainerRef, highlightIndex, maxItemNum, displayCollaborators, itemHeight]);

  const onDownArrow = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    if (highlightIndex === displayCollaborators.length - 1) {
      setHighlightIndex(0);
      editorContainerRef.current.scrollTop = 0;
      return;
    }
    setHighlightIndex(highlightIndex + 1);
    if (highlightIndex >= maxItemNum) {
      editorContainerRef.current.scrollTop += itemHeight;
    }
  }, [editorContainerRef, highlightIndex, maxItemNum, displayCollaborators, itemHeight]);

  const onEsc = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    blur();
  }, [blur]);

  const onHotKey = useCallback((event) => {
    if (event.keyCode === KeyCodes.Enter) {
      onEnter(event);
    } else if (event.keyCode === KeyCodes.UpArrow) {
      onUpArrow(event);
    } else if (event.keyCode === KeyCodes.DownArrow) {
      onDownArrow(event);
    } else if (event.keyCode === KeyCodes.Tab) {
      if (Utils.isFunction(onPressTab)) {
        onPressTab(event);
      }
    } else if (event.keyCode === KeyCodes.Esc) {
      onEsc(event);
    }
  }, [onEnter, onUpArrow, onDownArrow, onPressTab, onEsc]);

  const onKeyDown = useCallback((event) => {
    if (
      event.keyCode === KeyCodes.ChineseInputMethod ||
      event.keyCode === KeyCodes.LeftArrow ||
      event.keyCode === KeyCodes.RightArrow
    ) {
      event.stopPropagation();
    }
  }, []);

  useEffect(() => {
    if (editorRef.current) {
      const { bottom } = editorRef.current.getBoundingClientRect();
      if (bottom > window.innerHeight) {
        editorRef.current.style.top = 'unset';
        editorRef.current.style.bottom = editorPosition.top + height - window.innerHeight + 'px';
      }
    }
    if (editorContainerRef.current && collaboratorItemRef.current) {
      setMaxItemNum(getMaxItemNum());
      setItemHeight(parseInt(getComputedStyle(collaboratorItemRef.current, null).height));
    }
    document.addEventListener('keydown', onHotKey, true);
    return () => {
      document.removeEventListener('keydown', onHotKey, true);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onHotKey]);

  useEffect(() => {
    const highlightIndex = displayCollaborators.length === 0 ? -1 : 0;
    setHighlightIndex(highlightIndex);
  }, [displayCollaborators]);

  useImperativeHandle(ref, () => ({
    getValue: () => {
      const { key } = column;
      return { [key]: value };
    },
    onBlur: () => blur(),
    onClose: () => onClose(),
  }), [column, value, blur, onClose]);

  const renderCollaborators = useCallback(() => {
    if (displayCollaborators.length === 0) {
      const noOptionsTip = searchValue ? gettext('No collaborators available') : gettext('No collaborators');
      return (<span className="none-search-result">{noOptionsTip}</span>);
    }

    return displayCollaborators.map((collaborator, i) => {
      const isSelected = value.includes(collaborator.email);
      return (
        <div key={collaborator.email} className="sf-metadata-collaborator-item" ref={collaboratorItemRef}>
          <div
            className={classnames('collaborator-container', { 'collaborator-container-highlight': i === highlightIndex })}
            onMouseDown={() => onSelectCollaborator(collaborator.email)}
            onMouseEnter={() => onMenuMouseEnter(i)}
            onMouseLeave={() => onMenuMouseLeave(i)}
          >
            <div className="collaborator">
              <img className="collaborator-avatar" alt={collaborator.name} src={collaborator.avatar_url} />
              <span className="collaborator-name" title={collaborator.name} aria-label={collaborator.name} >
                {collaborator.name}
              </span>
            </div>
            <div className="collaborator-check-icon">
              {isSelected && <i className="sf2-icon-tick"></i>}
            </div>
          </div>
        </div>
      );
    });

  }, [displayCollaborators, searchValue, value, highlightIndex, onMenuMouseEnter, onMenuMouseLeave, onSelectCollaborator]);

  const isBeyondScreen = editorPosition.left + 300 > window.innerWidth;

  return (
    <div className="sf-metadata-collaborator-editor" style={{ top: -38, left: isBeyondScreen ? 'unset' : 0, right: isBeyondScreen ? -column.width : 'unset' }} ref={editorRef}>
      <DeleteCollaborator value={value} onDelete={onDeleteCollaborator} />
      <div className="sf-metadata-search-collaborator-options">
        <SearchInput placeholder={gettext('Search collaborators')} onKeyDown={onKeyDown} onChange={onChangeSearch} autoFocus={true} className="sf-metadata-search-collaborators" />
      </div>
      <div className="sf-metadata-collaborator-editor-container" ref={editorContainerRef}>
        {renderCollaborators()}
      </div>
    </div>
  );
});

CollaboratorEditor.propTypes = {
  saveImmediately: PropTypes.bool,
  height: PropTypes.number,
  column: PropTypes.object,
  value: PropTypes.array,
  editorPosition: PropTypes.object,
  onCommit: PropTypes.func,
  onClose: PropTypes.func,
  onPressTab: PropTypes.func,
};

export default CollaboratorEditor;
