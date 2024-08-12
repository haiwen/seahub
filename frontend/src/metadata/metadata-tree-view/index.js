import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { CustomizeAddTool } from '@seafile/sf-metadata-ui-component';
import { gettext } from '../../utils/constants';
import { PRIVATE_FILE_TYPE } from '../../constants';
import metadataAPI from '../api';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import ViewItem from './view-item';
import NameDialog from './name-dialog';
import { useMetadataStatus } from '../hooks';

import './index.css';

const MetadataTreeView = ({ userPerm, repoID, currentPath, onNodeClick }) => {
  const canAdd = useMemo(() => {
    if (userPerm !== 'rw' && userPerm !== 'admin') return false;
    return true;
  }, [userPerm]);
  const [views, setViews] = useState([]);
  const [showAddViewDialog, setSowAddViewDialog] = useState(false);
  const [, setState] = useState(0);
  const viewsMap = useRef({});
  const { showFirstView, setShowFirstView } = useMetadataStatus();

  const onClick = useCallback((view, isSelected) => {
    if (isSelected) return;
    const node = {
      children: [],
      path: '/' + PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES + '/' + view.name,
      isExpanded: false,
      isLoaded: true,
      isPreload: true,
      object: {
        file_tags: [],
        id: PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES,
        name: gettext('File extended properties'),
        type: PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES,
        isDir: () => false,
      },
      parentNode: {},
      key: repoID,
      view_id: view._id,
      view_name: view.name,
    };
    onNodeClick(node);
    setShowFirstView(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoID, onNodeClick]);

  useEffect(() => {
    metadataAPI.listViews(repoID).then(res => {
      const { navigation, views } = res.data;
      if (Array.isArray(views)) {
        views.forEach(view => {
          viewsMap.current[view._id] = view;
        });
      }
      setViews(navigation);
      const firstViewObject = navigation.find(item => item.type === 'view');
      const firstView = firstViewObject ? viewsMap.current[firstViewObject._id] : '';
      if (showFirstView && firstView) {
        onClick(firstView);
      }
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAddView = useCallback(() => {
    setSowAddViewDialog(true);
  }, []);

  const closeAddView = useCallback(() => {
    setSowAddViewDialog(false);
  }, []);

  const addView = useCallback((name, failCallback) => {
    metadataAPI.addView(repoID, name).then(res => {
      const view = res.data.view;
      let newViews = views.slice(0);
      newViews.push({ _id: view._id, type: 'view' });
      viewsMap.current[view._id] = view;
      setSowAddViewDialog(false);
      setViews(newViews);
      onClick(view);
    }).catch(error => {
      failCallback && failCallback(error);
    });
  }, [views, repoID, viewsMap, onClick]);

  const onDeleteView = useCallback((viewId, isSelected) => {
    metadataAPI.deleteView(repoID, viewId).then(res => {
      const newViews = views.filter(item => item._id !== viewId);
      delete viewsMap.current[viewId];
      setViews(newViews);
      if (isSelected) {
        const currentViewIndex = views.findIndex(item => item._id === viewId);
        const lastViewId = views[currentViewIndex - 1]._id;
        const lastView = viewsMap.current[lastViewId];
        onClick(lastView);
      }
    }).catch((error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    }));
  }, [repoID, views, onClick, viewsMap]);

  const onUpdateView = useCallback((viewId, update, successCallback, failCallback) => {
    metadataAPI.modifyView(repoID, viewId, update).then(res => {
      successCallback && successCallback();
      const currentView = viewsMap.current[viewId];
      viewsMap.current[viewId] = { ...currentView, ...update };
      setState(n => n + 1);
    }).catch(error => {
      failCallback && failCallback(error);
    });
  }, [repoID, viewsMap]);

  const onMoveView = useCallback((sourceViewId, targetViewId) => {
    metadataAPI.moveView(repoID, sourceViewId, targetViewId).then(res => {
      const { navigation } = res.data;
      setViews(navigation);
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
    });
  }, [repoID]);

  return (
    <>
      <div className="tree-view tree metadata-tree-view">
        <div className="tree-node">
          <div className="children">
            {views.map((item, index) => {
              if (item.type !== 'view') return null;
              const view = viewsMap.current[item._id];
              const viewPath = '/' + PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES + '/' + view.name;
              const isSelected = currentPath === viewPath;
              return (
                <ViewItem
                  key={view._id}
                  canDelete={index !== 0}
                  isSelected={isSelected}
                  userPerm={userPerm}
                  view={view}
                  onClick={(view) => onClick(view, isSelected)}
                  onDelete={() => onDeleteView(view._id, isSelected)}
                  onUpdate={(update, successCallback, failCallback) => onUpdateView(view._id, update, successCallback, failCallback)}
                  onMove={onMoveView}
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
  repoID: PropTypes.string.isRequired,
  currentPath: PropTypes.string,
  onNodeClick: PropTypes.func,
};

export default MetadataTreeView;
