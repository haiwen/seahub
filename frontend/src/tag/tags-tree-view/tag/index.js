import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Input } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import ItemDropdownMenu from '../../../components/dropdown-menu/item-dropdown-menu';
import { isMobile } from '../../../utils/utils';
import { getTagColor, getTagName, getTagId, getTagFilesCount, isValidTagName } from '../../utils';
import { isEnter } from '../../../metadata/utils/hotkey';
import toaster from '../../../components/toast';
import { PRIVATE_COLUMN_KEY } from '../../constants';

import './index.css';

const Tag = ({
  userPerm,
  isSelected,
  tag,
  tags,
  onClick,
  onDelete,
  onCopy,
  onUpdateTag,
}) => {
  const tagName = useMemo(() => getTagName(tag), [tag]);
  const tagColor = useMemo(() => getTagColor(tag), [tag]);
  const tagId = useMemo(() => getTagId(tag), [tag]);
  const tagCount = useMemo(() => getTagFilesCount(tag), [tag]);
  const [highlight, setHighlight] = useState(false);
  const [freeze, setFreeze] = useState(false);
  const [isRenaming, setRenaming] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const inputRef = useRef(null);

  const otherTagsName = useMemo(() => {
    return tags.filter(tagItem => getTagId(tagItem) !== tagId).map(tagItem => getTagName(tagItem));
  }, [tags, tagId]);

  const canUpdate = useMemo(() => {
    if (userPerm !== 'rw' && userPerm !== 'admin') return false;
    return true;
  }, [userPerm]);

  const operations = useMemo(() => {
    if (!canUpdate) return [];
    const value = [
      { key: 'rename', value: gettext('Rename') },
      { key: 'duplicate', value: gettext('Duplicate') },
      { key: 'delete', value: gettext('Delete') }
    ];
    return value;
  }, [canUpdate]);

  const onMouseEnter = useCallback(() => {
    if (freeze) return;
    setHighlight(true);
  }, [freeze]);

  const onMouseOver = useCallback(() => {
    if (freeze) return;
    setHighlight(true);
  }, [freeze]);

  const onMouseLeave = useCallback(() => {
    if (freeze) return;
    setHighlight(false);
  }, [freeze]);

  const freezeItem = useCallback(() => {
    setFreeze(true);
  }, []);

  const unfreezeItem = useCallback(() => {
    setFreeze(false);
    setHighlight(false);
  }, []);

  const operationClick = useCallback((operationKey) => {
    switch (operationKey) {
      case 'rename': {
        setInputValue(tagName);
        setRenaming(true);
        return;
      }
      case 'duplicate': {
        onCopy();
        return;
      }
      case 'delete': {
        onDelete();
        return;
      }
      default: {
        return;
      }
    }
  }, [tagName, onDelete, onCopy]);

  const renameTag = useCallback((name, failCallback) => {
    onUpdateTag(tagId, { [PRIVATE_COLUMN_KEY.TAG_NAME]: name }, {
      success_callback: () => {
        setRenaming(false);
        if (!isSelected) return;
        document.title = `${name} - Seafile`;
      },
      fail_callback: (error) => {
        failCallback(error);
        if (!isSelected) return;
        document.title = `${tagName} - Seafile`;
      }
    });
  }, [onUpdateTag, isSelected, tagId, tagName]);

  const handleSubmit = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    const { isValid, message } = isValidTagName(inputValue, otherTagsName);
    if (!isValid) {
      toaster.danger(message);
      return;
    }
    if (message === tagName) {
      setRenaming(false);
      return;
    }
    renameTag(message);
  }, [tagName, inputValue, otherTagsName, renameTag]);

  const onChange = useCallback((e) => {
    setInputValue(e.target.value);
  }, []);

  const onKeyDown = useCallback((event) => {
    if (isEnter(event)) {
      handleSubmit(event);
      unfreezeItem();
    }
  }, [handleSubmit, unfreezeItem]);

  const onInputClick = useCallback((event) => {
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
  }, []);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (inputRef.current && !inputRef.current.contains(event.target)) {
        handleSubmit(event);
      }
    };

    if (isRenaming) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isRenaming, handleSubmit]);

  return (
    <>
      <div
        className={classnames('tree-node-inner text-nowrap tag-tree-node', { 'tree-node-inner-hover': highlight, 'tree-node-hight-light': isSelected })}
        title={tagName}
        onMouseEnter={onMouseEnter}
        onMouseOver={onMouseOver}
        onMouseLeave={onMouseLeave}
        onClick={() => onClick(tag)}
      >
        <div className="tree-node-text tag-tree-node-text">
          <div className="tag-tree-node-name">
            {isRenaming ? (
              <Input
                innerRef={inputRef}
                className="sf-metadata-view-input mt-0"
                value={inputValue}
                onChange={onChange}
                autoFocus={true}
                onBlur={() => setRenaming(false)}
                onClick={onInputClick}
                onKeyDown={onKeyDown}
              />
            ) : (
              <>{tagName}</>
            )}
          </div>
          <div className="tag-tree-node-count">{` (${tagCount})`}</div>
        </div>
        <div className="left-icon">
          <div className="tree-node-icon">
            <div className="tag-tree-node-color" style={{ backgroundColor: tagColor }}></div>
          </div>
        </div>
        <div className="right-icon" id={`metadata-tag-dropdown-item-${tagId}`} >
          {highlight && operations.length > 0 && (
            <ItemDropdownMenu
              item={{ name: 'tags' }}
              toggleClass="sf3-font sf3-font-more"
              freezeItem={freezeItem}
              unfreezeItem={unfreezeItem}
              getMenuList={() => operations}
              onMenuItemClick={operationClick}
              menuStyle={isMobile ? { zIndex: 1050 } : {}}
            />
          )}
        </div>
      </div>
    </>
  );
};

Tag.propTypes = {
  canDelete: PropTypes.bool,
  isSelected: PropTypes.bool,
  tag: PropTypes.object,
  onClick: PropTypes.func,
};

export default Tag;
