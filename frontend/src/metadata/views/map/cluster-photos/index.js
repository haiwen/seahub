import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import deepCopy from 'deep-copy';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { CenteredLoading } from '@seafile/sf-metadata-ui-component';
import Gallery from '../../gallery/main';
import { EVENT_BUS_TYPE, UTC_FORMAT_DEFAULT } from '../../../constants';
import metadataAPI from '../../../api';
import { Utils } from '../../../../utils/utils';
import toaster from '../../../../components/toast';
import { useMetadataView } from '../../../hooks/metadata-view';
import { getRowsByIds } from '../../../utils/table';
import Metadata from '../../../model/metadata';
import { sortTableRows } from '../../../utils/sort';
import { useCollaborators } from '../../../hooks/collaborators';
import { getRecordIdFromRecord, getParentDirFromRecord, getFileNameFromRecord } from '../../../utils/cell';

import './index.css';

dayjs.extend(utc);

const ClusterPhotos = ({ photoIds, onClose }) => {
  const { repoID, viewID, metadata: allMetadata, store, addFolder, deleteRecords } = useMetadataView();
  const { collaborators } = useCollaborators();

  const [isLoading, setLoading] = useState(true);
  const [metadata, setMetadata] = useState({ rows: getRowsByIds(allMetadata, photoIds), columns: allMetadata?.columns || [] });

  const loadData = useCallback((view) => {
    setLoading(true);
    const columns = metadata.columns;
    const orderRows = sortTableRows({ columns }, metadata.rows, view?.sorts || [], { collaborators, isReturnID: false });
    let newMetadata = new Metadata({ rows: orderRows, columns, view });
    newMetadata.hasMore = false;
    setMetadata(newMetadata);
    window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.RESET_VIEW, newMetadata.view);
    setLoading(false);
  }, [metadata, collaborators]);

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

  const onRecordChange = useCallback(({ recordId, parentDir, fileName }, update) => {
    const modifyTime = dayjs().utc().format(UTC_FORMAT_DEFAULT);
    const modifier = window.sfMetadataContext.getUsername();
    const { rows, columns, view } = metadata;
    let newRows = [...rows];
    newRows.forEach((row, index) => {
      const _rowId = getRecordIdFromRecord(row);
      const _parentDir = getParentDirFromRecord(row);
      const _fileName = getFileNameFromRecord(row);
      if ((_rowId === recordId || (_parentDir === parentDir && _fileName === fileName)) && update) {
        const updatedRow = Object.assign({}, row, update, {
          '_mtime': modifyTime,
          '_last_modifier': modifier,
        });
        newRows[index] = updatedRow;
      }
    });
    let updatedColumnKeyMap = {
      '_mtime': true,
      '_last_modifier': true
    };
    Object.keys(update).forEach(key => {
      updatedColumnKeyMap[key] = true;
    });
    if (view.sorts.some(sort => updatedColumnKeyMap[sort.column_key])) {
      newRows = sortTableRows({ columns }, newRows, view?.sorts || [], { collaborators, isReturnID: false });
    }
    let newMetadata = new Metadata({ rows: newRows, columns, view });
    newMetadata.hasMore = false;
    setMetadata(newMetadata);
  }, [metadata, collaborators]);

  useEffect(() => {
    const eventBus = window?.sfMetadataContext?.eventBus;
    if (!eventBus) return;
    eventBus.dispatch(EVENT_BUS_TYPE.TOGGLE_VIEW_TOOLBAR, true);
    return () => {
      eventBus.dispatch(EVENT_BUS_TYPE.TOGGLE_VIEW_TOOLBAR, false);
    };
  }, []);

  useEffect(() => {
    const eventBus = window?.sfMetadataContext?.eventBus;
    if (!eventBus) return;
    const unsubscribeViewChange = eventBus.subscribe(EVENT_BUS_TYPE.UPDATE_SERVER_VIEW, onViewChange);
    const localRecordChangedSubscribe = eventBus.subscribe(EVENT_BUS_TYPE.LOCAL_RECORD_CHANGED, onRecordChange);
    return () => {
      unsubscribeViewChange && unsubscribeViewChange();
      localRecordChangedSubscribe && localRecordChangedSubscribe();
    };
  }, [onViewChange, onRecordChange]);

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
  photoIds: PropTypes.array,
  onClose: PropTypes.func,
};

export default ClusterPhotos;
