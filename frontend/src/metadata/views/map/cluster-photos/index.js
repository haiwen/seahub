import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import deepCopy from 'deep-copy';
import { CenteredLoading } from '@seafile/sf-metadata-ui-component';
import Gallery from '../../gallery/main';
import { gettext } from '../../../../utils/constants';
import { EVENT_BUS_TYPE, PER_LOAD_NUMBER } from '../../../constants';
import metadataAPI from '../../../api';
import { normalizeColumns } from '../../../utils/column';
import Metadata from '../../../model/metadata';
import { Utils } from '../../../../utils/utils';
import toaster from '../../../../components/toast';
import { useMetadataView } from '../../../hooks/metadata-view';

import './index.css';

const ClusterPhotos = ({ view, markerIds, onClose, onDelete }) => {
  const [isLoading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState({ rows: [] });

  const { deleteFilesCallback } = useMetadataView();

  const repoID = window.sfMetadataContext.getSetting('repoID');

  const loadData = useCallback((view) => {
    setLoading(true);
    const params = {
      view_id: view._id,
      start: 0,
      limit: PER_LOAD_NUMBER,
    };
    metadataAPI.getMetadata(repoID, params).then(res => {
      const rows = res?.data?.results || [];
      const filteredRows = rows.filter(row => markerIds.includes(row._id));
      const columns = normalizeColumns(res?.data?.metadata);
      const metadata = new Metadata({ rows: filteredRows, columns, view });
      metadata.hasMore = rows.length >= PER_LOAD_NUMBER;
      setMetadata(metadata);
      window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.MAP_VIEW, metadata.view);
      setLoading(false);
    }).catch(error => {
      const errorMessage = Utils.getErrorMsg(error);
      toaster.danger(errorMessage);
      setLoading(false);
    });
  }, [repoID, markerIds]);

  const deletedByIds = useCallback((ids) => {
    if (!Array.isArray(ids) || ids.length === 0) return;
    const newMetadata = deepCopy(metadata);
    const idNeedDeletedMap = ids.reduce((currIdNeedDeletedMap, rowId) => ({ ...currIdNeedDeletedMap, [rowId]: true }), {});
    newMetadata.rows = newMetadata.rows.filter((row) => !idNeedDeletedMap[row._id]);
    newMetadata.row_ids = newMetadata.row_ids.filter((id) => !idNeedDeletedMap[id]);

    // delete rows in id_row_map
    ids.forEach(rowId => {
      delete newMetadata.id_row_map[rowId];
    });
    newMetadata.recordsCount = newMetadata.row_ids.length;
    setMetadata(newMetadata);

    if (newMetadata.rows.length === 0) {
      onClose && onClose();
    }

    onDelete(ids);
  }, [metadata, onClose, onDelete]);

  const handelDelete = useCallback((deletedImages, { success_callback } = {}) => {
    if (!deletedImages.length) return;
    let recordIds = [];
    let paths = [];
    let fileNames = [];
    deletedImages.forEach((record) => {
      const { id, parentDir, name } = record || {};
      if (parentDir && name) {
        const path = Utils.joinPath(parentDir, name);
        paths.push(path);
        fileNames.push(name);
        recordIds.push(id);
      }
    });
    window.sfMetadataContext.batchDeleteFiles(repoID, paths).then(res => {
      deletedByIds(recordIds);
      deleteFilesCallback(paths, fileNames);
      let msg = fileNames.length > 1
        ? gettext('Successfully deleted {name} and {n} other items')
        : gettext('Successfully deleted {name}');
      msg = msg.replace('{name}', fileNames[0])
        .replace('{n}', fileNames.length - 1);
      toaster.success(msg);
      success_callback && success_callback();
    }).catch(error => {
      toaster.danger(gettext('Failed to delete records'));
    });
  }, [deleteFilesCallback, repoID, deletedByIds]);

  const handleViewChange = useCallback((update) => {
    metadataAPI.modifyView(repoID, view._id, update).then(res => {
      const newView = { ...view, ...update };
      loadData(newView);
    }).catch(error => {
      const errorMessage = Utils.getErrorMsg(error);
      toaster.danger(errorMessage);
    });
  }, [view, repoID, loadData]);

  useEffect(() => {
    loadData({ _id: view._id, sorts: view.sorts });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const unsubscribeViewChange = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.MAP_GALLERY_VIEW_CHANGE, handleViewChange);
    return () => {
      unsubscribeViewChange();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    isLoading ? (
      <CenteredLoading />
    ) : (
      <div className="sf-metadata-view-map sf-metadata-map-photos-container">
        <div className="sf-metadata-map-photos-header" onClick={onClose}>
          <div className="sf-metadata-map-photos-header-back">
            <i className="sf3-font sf3-font-arrow rotate-180"></i>
          </div>
          <div className="sf-metadata-map-location">{gettext('Location')}</div>
        </div>
        <Gallery metadata={metadata} onDelete={handelDelete} />
      </div>
    )
  );
};

ClusterPhotos.propTypes = {
  view: PropTypes.object,
  markerIds: PropTypes.array,
  onClose: PropTypes.func,
  onDelete: PropTypes.func,
};

export default ClusterPhotos;
