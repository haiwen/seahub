import React, { useState, useCallback } from 'react';
import toaster from '../../../components/toast';
import Main from './main';
import { useMetadataView } from '../../hooks/metadata-view';
import { Utils } from '../../../utils/utils';
import { PER_LOAD_NUMBER } from '../../constants';

import './index.css';

const Gallery = () => {
  const [isLoadingMore, setLoadingMore] = useState(false);

  const { metadata, store, deleteRecords, duplicateRecord } = useMetadataView();

  const onLoadMore = useCallback(async () => {
    if (isLoadingMore) return;
    if (!metadata.hasMore) return;
    setLoadingMore(true);

    try {
      await store.loadMore(PER_LOAD_NUMBER);
      setLoadingMore(false);
    } catch (error) {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
      setLoadingMore(false);
      return;
    }

  }, [isLoadingMore, metadata, store]);

  const handleDelete = useCallback((deletedImages, { success_callback } = {}) => {
    if (!deletedImages.length) return;
    let recordsIds = [];
    deletedImages.forEach((record) => {
      const { parentDir, name } = record || {};
      if (parentDir && name) {
        recordsIds.push(record.id);
      }
    });
    deleteRecords(recordsIds, { success_callback });
  }, [deleteRecords]);

  return (
    <div className="sf-metadata-container">
      <Main
        isLoadingMore={isLoadingMore}
        metadata={metadata}
        onDelete={handleDelete}
        onLoadMore={onLoadMore}
        duplicateRecord={duplicateRecord}
      />
    </div>
  );
};

export default Gallery;
