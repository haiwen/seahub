import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { CenteredLoading } from '@seafile/sf-metadata-ui-component';
import { useMetadata } from '../../../hooks';
import { Utils } from '../../../../../utils/utils';
import { getDateDisplayString, PRIVATE_COLUMN_KEY } from '../../../_basic';
import { siteRoot, thumbnailSizeForGrid } from '../../../../../utils/constants';
import { EVENT_BUS_TYPE, PER_LOAD_NUMBER } from '../../../constants';
import Main from './main';
import toaster from '../../../../../components/toast';

import './index.css';

const CONCURRENCY_LIMIT = 3;
const IMAGE_GAP = 2;

const Gallery = () => {
  const imageRefs = useRef([]);
  const containerRef = useRef(null);
  const [isFirstLoading, setFirstLoading] = useState(true);
  const [isLoadingMore, setLoadingMore] = useState(false);
  const [zoomGear, setZoomGear] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [loadingQueue, setLoadingQueue] = useState([]);
  const [concurrentLoads, setConcurrentLoads] = useState(0);
  const [overScan, setOverScan] = useState({ top: 0, bottom: 0 });

  const { metadata, store } = useMetadata();
  const repoID = window.sfMetadataContext.getSetting('repoID');

  // Number of images per row
  const columns = useMemo(() => {
    return 8 - zoomGear;
  }, [zoomGear]);

  const imageSize = useMemo(() => {
    return (containerWidth - columns * 2 - 2) / columns;
  }, [containerWidth, columns]);

  const groups = useMemo(() => {
    if (isFirstLoading) return [];
    const firstSort = metadata.view.sorts[0];
    let init = metadata.rows.reduce((_init, record) => {
      const fileName = record[PRIVATE_COLUMN_KEY.FILE_NAME];
      const parentDir = record[PRIVATE_COLUMN_KEY.PARENT_DIR];
      const path = Utils.encodePath(Utils.joinPath(parentDir, fileName));
      const date = getDateDisplayString(record[firstSort.column_key], 'YYYY-MM-DD');
      const img = {
        name: fileName,
        url: `${siteRoot}lib/${repoID}/file${path}`,
        src: `${siteRoot}thumbnail/${repoID}/${thumbnailSizeForGrid}${path}`,
        date: date,
      };
      let _group = _init.find(g => g.name === date);
      if (_group) {
        _group.children.push(img);
      } else {
        _init.push({
          name: date,
          children: [img],
        });
      }
      return _init;
    }, []);

    let _groups = [];
    init.forEach((_init, index) => {
      const { children } = _init;
      const childrenCount = children.length;
      const value = childrenCount / columns;
      const rows = childrenCount % columns ? Math.ceil(value) : ~~(value);
      const height = rows * (imageSize + IMAGE_GAP);
      let top = 0;
      if (index > 0) {
        const lastGroup = _groups[index - 1];
        const { top: lastGroupTop, height: lastGroupHeight } = lastGroup;
        top = lastGroupTop + lastGroupHeight;
      }
      _groups.push({
        ..._init,
        top,
        height,
      });
    });
    return _groups;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFirstLoading, metadata, metadata.recordsCount, repoID, columns, imageSize]);

  const loadMore = useCallback(async () => {
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

  const loadNextImage = useCallback(() => {
    if (loadingQueue.length === 0 || concurrentLoads >= CONCURRENCY_LIMIT) return;

    const nextImage = loadingQueue.shift();
    setConcurrentLoads(prev => prev + 1);

    const img = new Image();
    imageRefs.current.push(img);
    img.src = nextImage.src;
    img.onload = () => {
      setConcurrentLoads(prev => {
        const newCount = prev - 1;
        return newCount;
      });
      loadNextImage();
    };
    img.onerror = () => {
      setConcurrentLoads(prev => {
        const newCount = prev - 1;
        return newCount;
      });
      loadNextImage();
    };
  }, [loadingQueue, concurrentLoads]);

  useEffect(() => {
    loadNextImage();
  }, [loadingQueue, concurrentLoads, loadNextImage]);

  useEffect(() => {
    const gear = window.sfMetadataContext.localStorage.getItem('zoom-gear', 0) || 0;
    setZoomGear(gear);

    const container = containerRef.current;
    if (container) {
      const { offsetWidth, clientHeight } = container;
      setContainerWidth(offsetWidth);

      // Calculate initial overScan information
      const columns = 8 - gear;
      const imageSize = (offsetWidth - columns * 2 - 2) / columns;
      setOverScan({ top: 0, bottom: clientHeight + (imageSize + IMAGE_GAP) * 2 });
    }
    setFirstLoading(false);

    // resize
    const handleResize = () => {
      if (!containerRef.current) return;
      setContainerWidth(containerRef.current.offsetWidth);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    container && resizeObserver.observe(container);

    // op
    const modifyGalleryZoomGearSubscribe = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.MODIFY_GALLERY_ZOOM_GEAR, (zoomGear) => {
      window.sfMetadataContext.localStorage.setItem('zoom-gear', zoomGear);
      setZoomGear(zoomGear);
    });
    return () => {
      container && resizeObserver.unobserve(container);
      modifyGalleryZoomGearSubscribe();

      // Cleanup image references on unmount
      imageRefs.current.forEach(img => {
        img.onload = null;
        img.onerror = null;
      });
      imageRefs.current = [];
    };
  }, []);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      loadMore();
    } else {
      const overScanTop = Math.max(0, scrollTop - (imageSize + IMAGE_GAP) * 3);
      const overScanBottom = scrollTop + clientHeight + (imageSize + IMAGE_GAP) * 3;
      setOverScan({ top: overScanTop, bottom: overScanBottom });
    }
  }, [imageSize, loadMore]);

  const addToQueue = (image) => {
    setLoadingQueue(prev => [...prev, image]);
    loadNextImage();
  };

  return (
    <div className="sf-metadata-container">
      <div className="sf-metadata-gallery-container" ref={containerRef} onScroll={handleScroll} >
        {!isFirstLoading && (
          <>
            {Array.isArray(groups) && groups.length > 0 && (
              <Main groups={groups} size={imageSize} onLoad={addToQueue} columns={columns} overScan={overScan} gap={IMAGE_GAP} />
            )}
            {isLoadingMore && (<div className="sf-metadata-gallery-loading-more"><CenteredLoading /></div>)}
          </>
        )}
      </div>
    </div>
  );
};

export default Gallery;
