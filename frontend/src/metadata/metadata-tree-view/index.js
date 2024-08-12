import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { CustomizeAddTool } from '@seafile/sf-metadata-ui-component';
import { gettext } from '../../utils/constants';
import { PRIVATE_FILE_TYPE } from '../../constants';
import ViewItem from './view-item';
import NameDialog from './name-dialog';
import { useMetadata } from '../hooks';

import './index.css';

const MetadataTreeView = ({ userPerm, currentPath }) => {
  const canAdd = useMemo(() => {
    if (userPerm !== 'rw' && userPerm !== 'admin') return false;
    return true;
  }, [userPerm]);
  const [showAddViewDialog, setSowAddViewDialog] = useState(false);
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

  const openAddView = useCallback(() => {
    setSowAddViewDialog(true);
  }, []);

  const closeAddView = useCallback(() => {
    setSowAddViewDialog(false);
  }, []);

  const onUpdateView = useCallback((viewId, update, successCallback, failCallback) => {
    updateView(viewId, update, () => {
      setState(n => n + 1);
      successCallback && successCallback();
    }, failCallback);
  }, [updateView]);

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
            {canAdd &&
              <CustomizeAddTool
                className="sf-metadata-add-view"
                callBack={openAddView}
                footerName={gettext('Add view')}
                addIconClassName="sf-metadata-add-view-icon"
              />
            }
          </div>
        </div>
      </div>
      {showAddViewDialog && (<NameDialog title={gettext('Add view')} onSubmit={addView} onToggle={closeAddView} />)}
    </>
  );
};

MetadataTreeView.propTypes = {
  userPerm: PropTypes.string,
  currentPath: PropTypes.string,
};

export default MetadataTreeView;
