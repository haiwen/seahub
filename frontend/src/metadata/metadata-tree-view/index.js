import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Input } from 'reactstrap';
import PropTypes from 'prop-types';
import { CustomizeAddTool } from '@seafile/sf-metadata-ui-component';
import toaster from '../../components/toast';
import Icon from '../../components/icon';
import ViewItem from './view-item';
import { AddView } from '../components/popover/view-popover';
import { gettext } from '../../utils/constants';
import { useMetadata } from '../hooks';
import { PRIVATE_FILE_TYPE } from '../../constants';
import { VIEW_TYPE, VIEW_TYPE_ICON } from '../constants';
import { isValidViewName } from '../utils/validate';
import { isEnter } from '../utils/hotkey';

import './index.css';

const MetadataTreeView = ({ userPerm, currentPath }) => {
  const canAdd = useMemo(() => {
    if (userPerm !== 'rw' && userPerm !== 'admin') return false;
    return true;
  }, [userPerm]);
  const [, setState] = useState(0);
  const {
    navigation,
    viewsMap,
    selectView,
    addView,
    duplicateView,
    deleteView,
    updateView,
    moveView
  } = useMetadata();
  const [newView, setNewView] = useState(null);
  const [showAddViewPopover, setShowAddViewPopover] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const inputRef = useRef(null);

  const onUpdateView = useCallback((viewId, update, successCallback, failCallback) => {
    updateView(viewId, update, () => {
      setState(n => n + 1);
      successCallback && successCallback();
    }, failCallback);
  }, [updateView]);

  const togglePopover = (event) => {
    event.stopPropagation();
    setShowAddViewPopover(!showAddViewPopover);
  };

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  const handlePopoverOptionClick = useCallback((option) => {
    setNewView(option);
    let newViewName = gettext('Untitled');
    const otherViewsName = Object.values(viewsMap).map(v => v.name);
    let i = 1;
    while (otherViewsName.includes(newViewName)) {
      newViewName = gettext('Untitled') + ' (' + (i++) + ')';
    }
    setInputValue(newViewName);
    setShowInput(true);
    setShowAddViewPopover(false);
  }, [viewsMap]);

  const handleInputSubmit = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    const viewNames = Object.values(viewsMap).map(v => v.name);
    const { isValid, message } = isValidViewName(inputValue, viewNames);
    if (!isValid) {
      toaster.danger(message);
      inputRef.current.focus();
      return;
    }
    addView(message, newView.type);
    setShowInput(false);
  }, [inputValue, viewsMap, addView, newView]);

  const onKeyDown = useCallback((event) => {
    if (isEnter(event)) {
      handleInputSubmit(event);
    }
  }, [handleInputSubmit]);

  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [showInput]);

  return (
    <>
      <div className="tree-view tree metadata-tree-view">
        <div className="tree-node">
          <div className="children">
            {navigation.map((item, index) => {
              const view = viewsMap[item._id];
              const viewPath = '/' + PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES + '/' + view._id;
              const isSelected = currentPath === viewPath;
              return (
                <ViewItem
                  key={view._id}
                  canDelete={index !== 0}
                  isSelected={isSelected}
                  userPerm={userPerm}
                  view={view}
                  onClick={(view) => selectView(view, isSelected)}
                  onDelete={() => deleteView(view._id, isSelected)}
                  onCopy={() => duplicateView(view._id)}
                  onUpdate={(update, successCallback, failCallback) => onUpdateView(view._id, update, successCallback, failCallback)}
                  onMove={moveView}
                />
              );
            })}
            {showInput && (
              <div className="tree-view-inner sf-metadata-view-form">
                <div className="left-icon">
                  <Icon symbol={VIEW_TYPE_ICON[newView.type] || VIEW_TYPE.TABLE} className="metadata-views-icon" />
                </div>
                <Input
                  className="sf-metadata-view-input"
                  innerRef={inputRef}
                  value={inputValue}
                  onChange={handleInputChange}
                  autoFocus={true}
                  onBlur={handleInputSubmit}
                  onKeyDown={onKeyDown}
                />
              </div>
            )}
            {canAdd && (
              <div id="sf-metadata-view-popover">
                <CustomizeAddTool
                  className="sf-metadata-add-view"
                  callBack={togglePopover}
                  footerName={gettext('Add view')}
                  addIconClassName="sf-metadata-add-view-icon"
                />
              </div>
            )}
          </div>
        </div>
      </div>
      {showAddViewPopover && (
        <AddView
          target='sf-metadata-view-popover'
          toggle={togglePopover}
          onOptionClick={handlePopoverOptionClick}
        />
      )}
    </>
  );
};

MetadataTreeView.propTypes = {
  userPerm: PropTypes.string,
  currentPath: PropTypes.string,
};

export default MetadataTreeView;
