import React, { useMemo, useState, useEffect, useRef } from 'react';
import { CenteredLoading } from '@seafile/sf-metadata-ui-component';
import { useMetadata } from '../../../hooks';
import { Utils } from '../../../../../utils/utils';
import { PRIVATE_COLUMN_KEY } from '../../../_basic';
import { siteRoot } from '../../../../../utils/constants';
import { EVENT_BUS_TYPE } from '../../../constants';

import './index.css';

const DEFAULT_COLUMNS = 8;

const Gallery = () => {
  const [imageWidth, setImageWidth] = useState(100);
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const [containerWidth, setContainerWidth] = useState(960);
  const [adjustValue, setAdjustValue] = useState(0);
  const { isLoading, metadata } = useMetadata();
  const containerRef = useRef(null);
  const repoID = window.sfMetadataContext.getSetting('repoID');

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    handleResize();

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.MODIFY_GALLERY_COLUMNS, (adjust) => {
      setAdjustValue(adjust);
    });
  }, [columns]);

  const imageItems = useMemo(() => {
    return metadata.rows
      .filter(row => Utils.imageCheck(row[PRIVATE_COLUMN_KEY.FILE_NAME]))
      .map(item => {
        const fileName = item[PRIVATE_COLUMN_KEY.FILE_NAME];
        const parentDir = item[PRIVATE_COLUMN_KEY.PARENT_DIR];
        const path = Utils.encodePath(Utils.joinPath(parentDir, fileName));
        const date = item[PRIVATE_COLUMN_KEY.FILE_CTIME].split('T')[0];

        const src = `${siteRoot}repo/${repoID}/raw${path}`;

        return {
          name: fileName,
          url: `${siteRoot}lib/${repoID}/file${path}`,
          src: src,
          date: date,
        };
      });
  }, [metadata, repoID]);

  useEffect(() => {
    const columns = DEFAULT_COLUMNS - adjustValue;
    const adjustedImageWidth = (containerWidth - 20) / columns;
    setColumns(columns);
    setImageWidth(adjustedImageWidth);
  }, [containerWidth, adjustValue]);

  if (isLoading) return (<CenteredLoading />);
  return (
    <div ref={containerRef} className="gallery-container">
      <ul className="image-list" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {imageItems.map((img, index) => (
          <li key={index} className='image-item' style={{ width: imageWidth, height: imageWidth }}>
            <img
              className="grid-image"
              src={img.src}
              alt={img.name}
            />
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Gallery;
