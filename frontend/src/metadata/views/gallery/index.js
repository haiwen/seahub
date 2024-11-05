import React, { useState, useCallback } from 'react';
import toaster from '../../../components/toast';
import Main from './main';
import { useMetadataView } from '../../hooks/metadata-view';
import { Utils } from '../../../utils/utils';
import { gettext } from '../../../utils/constants';
import { PER_LOAD_NUMBER } from '../../constants';

import './index.css';

const Gallery = () => {
  const [isLoadingMore, setLoadingMore] = useState(false);

  const { metadata, store, deleteFilesCallback } = useMetadataView();

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

  const handleDelete = useCallback((deletedImages, callback) => {
    if (!deletedImages.length) return;
    let recordsIds = [];
    let paths = [];
    let fileNames = [];
    deletedImages.forEach((record) => {
      const { path: parentDir, name } = record || {};
      if (parentDir && name) {
        const path = Utils.joinPath(parentDir, name);
        recordsIds.push(record.id);
        paths.push(path);
        fileNames.push(name);
      }
    });
    store.deleteRecords(recordsIds, {
      fail_callback: (error) => {
        toaster.danger(error);
      },
      success_callback: () => {
        callback && callback();
        deleteFilesCallback(paths, fileNames);
        let msg = fileNames.length > 1
          ? gettext('Successfully deleted {name} and {n} other items')
          : gettext('Successfully deleted {name}');
        msg = msg.replace('{name}', fileNames[0])
          .replace('{n}', fileNames.length - 1);
        toaster.success(msg);
      },
    });
  }, [store, deleteFilesCallback]);

  return (
    <div className="sf-metadata-container">
      <Main isLoadingMore={isLoadingMore} metadata={metadata} onDelete={handleDelete} onLoadMore={onLoadMore} />
    </div>
  );
};

export default Gallery;
