import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Input } from 'reactstrap';
import PropTypes from 'prop-types';
import { CustomizeAddTool } from '@seafile/sf-metadata-ui-component';
import toaster from '../../components/toast';
import Icon from '../../components/icon';
import ViewItem from './view-item';
import { AddView } from '../components/popover/view-popover';
import { gettext, mediaUrl } from '../../utils/constants';
import { useMetadata } from '../hooks';
import { PRIVATE_FILE_TYPE } from '../../constants';
import { VIEW_TYPE, VIEW_TYPE_ICON } from '../constants';
import { isValidViewName } from '../utils/validate';
import { isEnter } from '../utils/hotkey';

import './index.css';

const updateFavicon = (iconName) => {
  const favicon = document.getElementById('favicon');
  if (favicon) {
    switch (iconName) {
      case 'image':
        favicon.href = `${mediaUrl}favicons/gallery.png`;
        break;
      case VIEW_TYPE.TABLE:
        favicon.href = `${mediaUrl}favicons/table.png`;
        break;
      default:
        favicon.href = `${mediaUrl}favicons/favicon.png`;
    }
  }
};

const MetadataTreeView = ({ userPerm, currentPath }) => {
  const canAdd = useMemo(() => {
    if (userPerm !== 'rw' && userPerm !== 'admin') return false;
    return true;
  }, [userPerm]);
  const [, setState] = useState(0);
  const {
    showFirstView,
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
  const [originalTitle, setOriginalTitle] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    setOriginalTitle(document.title);
  }, []);

  useEffect(() => {
    const { origin, pathname, search } = window.location;
    const urlParams = new URLSearchParams(search);
    const viewID = urlParams.get('view');
    if (viewID) {
      const lastOpenedView = viewsMap[viewID] || '';
      if (lastOpenedView) {
        selectView(lastOpenedView);
        document.title = `${lastOpenedView.name} - Seafile`;
        updateFavicon(VIEW_TYPE_ICON[lastOpenedView.type] || VIEW_TYPE.TABLE);
        return;
      }
      const url = `${origin}${pathname}`;
      window.history.pushState({ url: url, path: '' }, '', url);
    }

    const firstViewObject = navigation.find(item => item.type === 'view');
    const firstView = firstViewObject ? viewsMap[firstViewObject._id] : '';
    if (showFirstView && firstView) {
      selectView(firstView);
      document.title = `${firstView.name} - Seafile`;
      updateFavicon(VIEW_TYPE_ICON[firstView.type] || VIEW_TYPE.TABLE);
    } else {
      document.title = originalTitle;
      updateFavicon('default');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const currentViewId = currentPath.split('/').pop();
    const currentView = viewsMap[currentViewId];
    if (currentView) {
      document.title = `${currentView.name} - Seafile`;
      updateFavicon(VIEW_TYPE_ICON[currentView.type] || VIEW_TYPE.TABLE);
    } else {
      document.title = originalTitle;
      updateFavicon('default');
    }
  }, [currentPath, viewsMap, originalTitle]);

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
