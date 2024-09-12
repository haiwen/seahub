import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { CenteredLoading } from '@seafile/sf-metadata-ui-component';
import toaster from '../../../components/toast';
import GalleryMain from './gallery-main';
import { useMetadataView } from '../../hooks/metadata-view';
import { Utils } from '../../../utils/utils';
import { getDateDisplayString } from '../../utils/cell';
import { siteRoot, thumbnailSizeForGrid } from '../../../utils/constants';
import { EVENT_BUS_TYPE, PER_LOAD_NUMBER, PRIVATE_COLUMN_KEY, GALLERY_DATE_MODE, DATE_TAG_HEIGHT } from '../../constants';

import './index.css';

const IMAGE_GAP = 2;

const Gallery = () => {
  const [isFirstLoading, setFirstLoading] = useState(true);
  const [isLoadingMore, setLoadingMore] = useState(false);
  const [zoomGear, setZoomGear] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [overScan, setOverScan] = useState({ top: 0, bottom: 0 });
  const [mode, setMode] = useState(GALLERY_DATE_MODE.DAY);

  const containerRef = useRef(null);
  const renderMoreTimer = useRef(null);

  const { metadata, store } = useMetadataView();
  const repoID = window.sfMetadataContext.getSetting('repoID');

  // Number of images per row
  const columns = useMemo(() => {
    return 8 - zoomGear;
  }, [zoomGear]);

  const imageSize = useMemo(() => {
    return (containerWidth - columns * 2 - 2) / columns;
  }, [containerWidth, columns]);

  const dateMode = useMemo(() => {
    switch (mode) {
      case GALLERY_DATE_MODE.YEAR:
        return 'YYYY';
      case GALLERY_DATE_MODE.MONTH:
        return 'YYYY-MM';
      case GALLERY_DATE_MODE.DAY:
        return 'YYYY-MM-DD';
      default:
        return 'YYYY-MM-DD';
    }
  }, [mode]);

  const groups = useMemo(() => {
    if (isFirstLoading) return [];
    const firstSort = metadata.view.sorts[0];
    let init = metadata.rows
      .filter(row => Utils.imageCheck(row[PRIVATE_COLUMN_KEY.FILE_NAME]))
      .reduce((_init, record) => {
        const fileName = record[PRIVATE_COLUMN_KEY.FILE_NAME];
        const parentDir = record[PRIVATE_COLUMN_KEY.PARENT_DIR];
        const path = Utils.encodePath(Utils.joinPath(parentDir, fileName));
        const date = mode !== GALLERY_DATE_MODE.ALL ? getDateDisplayString(record[firstSort.column_key], dateMode) : '';
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
    const imageHeight = imageSize + IMAGE_GAP;
    init.forEach((_init, index) => {
      const { children, ...__init } = _init;
      let top = 0;
      let rows = [];
      if (index > 0) {
        const lastGroup = _groups[index - 1];
        const { top: lastGroupTop, height: lastGroupHeight } = lastGroup;
        top = lastGroupTop + lastGroupHeight;
      }
      children.forEach((child, childIndex) => {
        const rowIndex = ~~(childIndex / columns);
        if (!rows[rowIndex]) rows[rowIndex] = { top: top + rowIndex * imageHeight, children: [] };
        rows[rowIndex].children.push(child);
      });

      const paddingTop = mode === GALLERY_DATE_MODE.ALL ? 0 : DATE_TAG_HEIGHT;
      const height = rows.length * imageHeight + paddingTop;
      _groups.push({
        ...__init,
        top,
        height,
        paddingTop,
        children: rows
      });
    });
    return _groups;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFirstLoading, metadata, metadata.recordsCount, repoID, columns, imageSize, mode]);

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

  useEffect(() => {
    const gear = window.sfMetadataContext.localStorage.getItem('zoom-gear', 0) || 0;
    setZoomGear(gear);

    const mode = window.sfMetadataContext.localStorage.getItem('gallery-mode', GALLERY_DATE_MODE.DAY) || GALLERY_DATE_MODE.DAY;
    setMode(mode);

    const switchGalleryModeSubscribe = window.sfMetadataContext.eventBus.subscribe(
      EVENT_BUS_TYPE.SWITCH_GALLERY_MODE,
      (mode) => {
        setMode(mode);
        window.sfMetadataContext.localStorage.setItem('gallery-mode', mode);
      }
    );

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
      if (!container) return;
      setContainerWidth(container.offsetWidth);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    container && resizeObserver.observe(container);

    // op
    const modifyGalleryZoomGearSubscribe = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.MODIFY_GALLERY_ZOOM_GEAR, (zoomGear) => {
      window.sfMetadataContext.localStorage.setItem('zoom-gear', zoomGear);
      setZoomGear(zoomGear);
      setTimeout(() => {
        container.scrollTop += zoomGear * 10;
      }, 200);
    });
    return () => {
      container && resizeObserver.unobserve(container);
      modifyGalleryZoomGearSubscribe();
      switchGalleryModeSubscribe();
      renderMoreTimer.current && clearTimeout(renderMoreTimer.current);
    };
  }, []);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      loadMore();
    } else {
      renderMoreTimer.current && clearTimeout(renderMoreTimer.current);
      renderMoreTimer.current = setTimeout(() => {
        const { scrollTop, clientHeight } = containerRef.current;
        const overScanTop = Math.max(0, scrollTop - (imageSize + IMAGE_GAP) * 3);
        const overScanBottom = scrollTop + clientHeight + (imageSize + IMAGE_GAP) * 3;
        setOverScan({ top: overScanTop, bottom: overScanBottom });
        renderMoreTimer.current = null;
      }, 200);
    }
  }, [imageSize, loadMore, renderMoreTimer]);

  return (
    <div className="sf-metadata-container">
      <div className="sf-metadata-gallery-container" ref={containerRef} onScroll={handleScroll} >
        {!isFirstLoading && (
          <>
            <GalleryMain groups={groups} size={imageSize} columns={columns} overScan={overScan} gap={IMAGE_GAP} />
            {isLoadingMore &&
              <div className="sf-metadata-gallery-loading-more">
                <CenteredLoading />
              </div>
            }
          </>
        )}
      </div>
    </div>
  );
};

export default Gallery;
