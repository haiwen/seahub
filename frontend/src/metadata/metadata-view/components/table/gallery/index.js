import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { CenteredLoading } from '@seafile/sf-metadata-ui-component';
import { useMetadata } from '../../../hooks';
import { Utils } from '../../../../../utils/utils';
import { PRIVATE_COLUMN_KEY } from '../../../_basic';
import { siteRoot } from '../../../../../utils/constants';
import { EVENT_BUS_TYPE } from '../../../constants';

import './index.css';

const BATCH_SIZE = 100;

const Gallery = () => {
  const [imageWidth, setImageWidth] = useState(100);
  const [columns, setColumns] = useState(8);
  const [containerWidth, setContainerWidth] = useState(960);
  const [adjustValue, setAdjustValue] = useState(0);
  const { isLoading, metadata } = useMetadata();
  const [visibleItems, setVisibleItems] = useState(BATCH_SIZE);
  const containerRef = useRef(null);
  const repoID = window.sfMetadataContext.getSetting('repoID');

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    const currentContainer = containerRef.current;

    if (currentContainer) {
      resizeObserver.observe(currentContainer);
    }

    return () => {
      if (currentContainer) {
        resizeObserver.unobserve(currentContainer);
      }
    };
  }, []);

  useEffect(() => {
    window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.MODIFY_GALLERY_COLUMNS, (adjust) => {
      setAdjustValue(adjust);
    });
  }, [columns]);

  useEffect(() => {
    const columns = (Utils.isDesktop() ? 8 : 4) - adjustValue;
    const adjustedImageWidth = (containerWidth - columns * 2 - 2) / columns;
    setColumns(columns);
    setImageWidth(adjustedImageWidth);
  }, [containerWidth, adjustValue]);

  const imageItems = useMemo(() => {
    return metadata.rows
      .filter(row => Utils.imageCheck(row[PRIVATE_COLUMN_KEY.FILE_NAME]))
      .map(item => {
        const fileName = item[PRIVATE_COLUMN_KEY.FILE_NAME];
        const parentDir = item[PRIVATE_COLUMN_KEY.PARENT_DIR];
        const path = Utils.encodePath(Utils.joinPath(parentDir, fileName));
        const date = item[PRIVATE_COLUMN_KEY.FILE_CTIME].split('T')[0];

        const src = `${siteRoot}thumbnail/${repoID}/192${path}`;

        return {
          name: fileName,
          url: `${siteRoot}lib/${repoID}/file${path}`,
          src: src,
          date: date,
        };
      });
  }, [metadata, repoID]);

  const groupedImages = useMemo(() => {
    return imageItems.reduce((acc, item) => {
      if (!acc[item.date]) {
        acc[item.date] = [];
      }
      acc[item.date].push(item);
      return acc;
    }, {});
  }, [imageItems]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  if (isLoading) return (<CenteredLoading />);
  return (
    <div ref={containerRef} className="metadata-gallery-container">
      {Object.keys(groupedImages).map(date => (
        <div key={date} className="metadata-gallery-date-group">
          <div className="metadata-gallery-date-tag">{date}</div>
          <ul className="metadata-gallery-image-list" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {groupedImages[date].map((img, index) => (
              <li key={index} tabindex={index} className='metadata-gallery-image-item' style={{ width: imageWidth, height: imageWidth }}>
                <img
                  className="metadata-gallery-grid-image"
                  src={img.src}
                  alt={img.name}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default Gallery;
