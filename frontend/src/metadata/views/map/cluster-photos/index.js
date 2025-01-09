import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import deepCopy from 'deep-copy';
import { CenteredLoading } from '@seafile/sf-metadata-ui-component';
import Gallery from '../../gallery/main';
import { EVENT_BUS_TYPE } from '../../../constants';
import metadataAPI from '../../../api';
import { Utils } from '../../../../utils/utils';
import toaster from '../../../../components/toast';
import { useMetadataView } from '../../../hooks/metadata-view';
import { getRowsByIds } from '../../../utils/table';
import Metadata from '../../../model/metadata';
import { sortTableRows } from '../../../utils/sort';
import { useCollaborators } from '../../../hooks/collaborators';

import './index.css';

const ClusterPhotos = ({ markerIds, onClose }) => {
  const [isLoading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState({ rows: [] });

  const { repoID, viewID, metadata: allMetadata, store, addFolder, deleteRecords } = useMetadataView();
  const { collaborators } = useCollaborators();

  const rows = useMemo(() => getRowsByIds(allMetadata, markerIds), [allMetadata, markerIds]);
  const columns = useMemo(() => allMetadata?.columns || [], [allMetadata]);

  const loadData = useCallback((view) => {
    setLoading(true);
    const orderRows = sortTableRows({ columns }, rows, view?.sorts || [], { collaborators });
    let metadata = new Metadata({ rows, columns, view });
    metadata.hasMore = false;
    metadata.row_ids = orderRows;
    metadata.view.rows = orderRows;
    setMetadata(metadata);
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.RESET_VIEW, metadata.view);
    setLoading(false);
  }, [rows, columns, collaborators]);

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
  }, [metadata, onClose]);

  const handelDelete = useCallback((deletedImages, { success_callback } = {}) => {
    if (!deletedImages.length) return;
    let recordIds = [];
    deletedImages.forEach((record) => {
      const { id, parentDir, name } = record || {};
      if (parentDir && name) {
        recordIds.push(id);
      }
    });
    deleteRecords(recordIds, {
      success_callback: () => {
        success_callback();
        deletedByIds(recordIds);
      }
    });
  }, [deleteRecords, deletedByIds]);

  const onViewChange = useCallback((update) => {
    metadataAPI.modifyView(repoID, viewID, update).then(res => {
      store.modifyLocalView(update);
      const newView = { ...metadata.view, ...update };
      loadData(newView);
    }).catch(error => {
      const errorMessage = Utils.getErrorMsg(error);
      toaster.danger(errorMessage);
    });
  }, [metadata, repoID, viewID, store, loadData]);

  useEffect(() => {
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.TOGGLE_VIEW_TOOLBAR, true);
    return () => {
      window?.sfMetadataContext?.eventBus?.dispatch(EVENT_BUS_TYPE.TOGGLE_VIEW_TOOLBAR, false);
    };
  }, []);

  useEffect(() => {
    const unsubscribeViewChange = window?.sfMetadataContext?.eventBus?.subscribe(EVENT_BUS_TYPE.UPDATE_SERVER_VIEW, onViewChange);
    return () => {
      unsubscribeViewChange && unsubscribeViewChange();
    };
  }, [onViewChange]);

  useEffect(() => {
    loadData({ sorts: allMetadata.view.sorts });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) return (<CenteredLoading />);

  return (
    <div className="sf-metadata-view-map sf-metadata-map-photos-container">
      <Gallery metadata={metadata} onDelete={handelDelete} onAddFolder={addFolder} />
    </div>
  );
};

ClusterPhotos.propTypes = {
  markerIds: PropTypes.array,
  onClose: PropTypes.func,
};

export default ClusterPhotos;
