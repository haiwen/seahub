import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Form, Input } from 'reactstrap';
import PropTypes from 'prop-types';
import { CustomizeAddTool } from '@seafile/sf-metadata-ui-component';
import Icon from '../../components/icon';
import { gettext } from '../../utils/constants';
import { PRIVATE_FILE_TYPE } from '../../constants';
import ViewItem from './view-item';
import { useMetadata } from '../hooks';
import { AddView } from '../metadata-view/components/popover/view-popover';

import './index.css';

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
    deleteView,
    updateView,
    moveView
  } = useMetadata();
  const [newView, setNewView] = useState(null);

  const [showAddViewPopover, setShowAddViewPopover] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef(null);
  const [inputValue, setInputValue] = useState('Untitled');

  useEffect(() => {
    const { origin, pathname, search } = window.location;
    const urlParams = new URLSearchParams(search);
    const viewID = urlParams.get('view');
    if (viewID) {
      const lastOpenedView = viewsMap[viewID] || '';
      if (lastOpenedView) {
        selectView(lastOpenedView);
        return;
      }
      const url = `${origin}${pathname}`;
      window.history.pushState({ url: url, path: '' }, '', url);
    }

    const firstViewObject = navigation.find(item => item.type === 'view');
    const firstView = firstViewObject ? viewsMap[firstViewObject._id] : '';
    if (showFirstView && firstView) {
      selectView(firstView);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handlePopoverOptionClick = (option) => {
    setNewView(option);
    setShowInput(true);
    setShowAddViewPopover(false);
  };

  const handleInputSubmit = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    addView(inputValue, newView.type);
    setShowInput(false);
    setInputValue('Untitled');
  }, [inputValue, addView, newView]);

  const handleClickOutsideInput = useCallback((event) => {
    if (inputRef.current && !inputRef.current.contains(event.target)) {
      setShowInput(false);
    }
  }, []);

  useEffect(() => {
    if (showInput) {
      inputRef.current.select();
      document.addEventListener('click', handleClickOutsideInput);
    }

    return () => {
      document.removeEventListener('click', handleClickOutsideInput);
    };
  }, [showInput, inputRef, handleClickOutsideInput]);


  return (
    <>
      <div className="tree-view tree metadata-tree-view">
        <div className="tree-node">
          <div className="children">
            {navigation.map((item, index) => {
              const view = viewsMap[item._id];
              const viewPath = '/' + PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES + '/' + view.name;
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
                  onUpdate={(update, successCallback, failCallback) => onUpdateView(view._id, update, successCallback, failCallback)}
                  onMove={moveView}
                />);
            })}
            {showInput && (
              <Form onSubmit={handleInputSubmit} className='tree-view-inner sf-metadata-view-form'>
                <div className="left-icon">
                  <Icon symbol={newView.type} className="metadata-views-icon" />
                </div>
                <Input
                  className='sf-metadata-view-input'
                  innerRef={inputRef}
                  type='text'
                  id='add-view-input'
                  name='add-view'
                  value={inputValue}
                  onChange={handleInputChange}
                  autoFocus={true}
                />
              </Form>
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
