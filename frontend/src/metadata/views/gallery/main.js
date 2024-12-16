import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { CenteredLoading } from '@seafile/sf-metadata-ui-component';
import metadataAPI from '../../api';
import URLDecorator from '../../../utils/url-decorator';
import toaster from '../../../components/toast';
import Content from './content';
import ImageDialog from '../../../components/dialog/image-dialog';
import ZipDownloadDialog from '../../../components/dialog/zip-download-dialog';
import ModalPortal from '../../../components/modal-portal';
import { useMetadataView } from '../../hooks/metadata-view';
import { Utils } from '../../../utils/utils';
import { getDateDisplayString, getFileNameFromRecord, getParentDirFromRecord } from '../../utils/cell';
import { siteRoot, fileServerRoot, useGoFileserver, thumbnailSizeForGrid, thumbnailSizeForOriginal, gettext } from '../../../utils/constants';
import { EVENT_BUS_TYPE, PRIVATE_COLUMN_KEY, GALLERY_DATE_MODE, DATE_TAG_HEIGHT, GALLERY_IMAGE_GAP } from '../../constants';
import { getRowById } from '../../utils/table';
import { getEventClassName } from '../../utils/common';
import ContextMenu from '../../components/context-menu';
import { downloadFile } from '../../utils/file';

import './index.css';

const OVER_SCAN_ROWS = 20;

const Main = ({ isLoadingMore, metadata, onDelete, onLoadMore }) => {
  const [isFirstLoading, setFirstLoading] = useState(true);
  const [zoomGear, setZoomGear] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [overScan, setOverScan] = useState({ top: 0, bottom: 0 });
  const [mode, setMode] = useState(GALLERY_DATE_MODE.DAY);
  const [isImagePopupOpen, setIsImagePopupOpen] = useState(false);
  const [isZipDialogOpen, setIsZipDialogOpen] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [selectedImages, setSelectedImages] = useState([]);

  const containerRef = useRef(null);
  const lastState = useRef({ visibleAreaFirstImage: { groupIndex: 0, rowIndex: 0 } });

  const repoID = window.sfMetadataContext.getSetting('repoID');
  const { updateCurrentDirent } = useMetadataView();

  useEffect(() => {
    updateCurrentDirent();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Number of images per row
  const columns = useMemo(() => {
    return 8 - zoomGear;
  }, [zoomGear]);

  const imageSize = useMemo(() => {
    return (containerWidth - (columns - 1) * 2 - 32) / columns;
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
    let init = metadata.rows.filter(row => Utils.imageCheck(getFileNameFromRecord(row)))
      .reduce((_init, record) => {
        const id = record[PRIVATE_COLUMN_KEY.ID];
        const fileName = getFileNameFromRecord(record);
        const parentDir = getParentDirFromRecord(record);
        const path = Utils.encodePath(Utils.joinPath(parentDir, fileName));
        const date = mode !== GALLERY_DATE_MODE.ALL ? getDateDisplayString(record[firstSort.column_key], dateMode) : '';
        const img = {
          id,
          name: fileName,
          path: parentDir,
          url: `${siteRoot}lib/${repoID}/file${path}`,
          src: `${siteRoot}thumbnail/${repoID}/${thumbnailSizeForGrid}${path}`,
          thumbnail: `${siteRoot}thumbnail/${repoID}/${thumbnailSizeForOriginal}${path}`,
          downloadURL: `${fileServerRoot}repos/${repoID}/files${path}?op=download`,
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
    const imageHeight = imageSize + GALLERY_IMAGE_GAP;
    const paddingTop = mode === GALLERY_DATE_MODE.ALL ? 0 : DATE_TAG_HEIGHT;
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
        if (!rows[rowIndex]) rows[rowIndex] = { top: paddingTop + top + rowIndex * imageHeight, children: [] };
        child.groupIndex = index;
        child.rowIndex = rowIndex;
        rows[rowIndex].children.push(child);
      });

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

  useEffect(() => {
    const gear = window.sfMetadataContext.localStorage.getItem('zoom-gear', 0) || 0;
    setZoomGear(gear);

    const mode = window.sfMetadataContext.localStorage.getItem('gallery-group-by', GALLERY_DATE_MODE.DAY) || GALLERY_DATE_MODE.DAY;
    setMode(mode);

    const switchGalleryModeSubscribe = window.sfMetadataContext.eventBus.subscribe(
      EVENT_BUS_TYPE.SWITCH_GALLERY_GROUP_BY,
      (mode) => {
        setMode(mode);
        window.sfMetadataContext.localStorage.setItem('gallery-group-by', mode);
      }
    );

    const container = containerRef.current;
    if (container) {
      const { offsetWidth, clientHeight } = container;
      setContainerWidth(offsetWidth);

      // Calculate initial overScan information
      const columns = 8 - gear;
      const imageSize = (offsetWidth - columns * 2 - 2) / columns;
      setOverScan({ top: 0, bottom: clientHeight + (imageSize + GALLERY_IMAGE_GAP) * OVER_SCAN_ROWS });
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
    });

    return () => {
      container && resizeObserver.unobserve(container);
      modifyGalleryZoomGearSubscribe();
      switchGalleryModeSubscribe();
    };
  }, []);

  useEffect(() => {
    if (!imageSize || imageSize < 0) return;
    if (imageSize === lastState.current.imageSize) return;
    const perImageOffset = imageSize - lastState.current.imageSize;
    const { groupIndex, rowIndex } = lastState.current.visibleAreaFirstImage;
    const rowOffset = groups.reduce((previousValue, current, currentIndex) => {
      if (currentIndex < groupIndex) {
        return previousValue + current.children.length;
      }
      return previousValue;
    }, 0) + rowIndex;
    const topOffset = rowOffset * perImageOffset + groupIndex * (mode === GALLERY_DATE_MODE.ALL ? 0 : DATE_TAG_HEIGHT);
    containerRef.current.scrollTop = containerRef.current.scrollTop + topOffset;
    lastState.current = { ...lastState.current, imageSize };
  }, [imageSize, groups, mode]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      onLoadMore();
    } else {
      const { scrollTop, clientHeight } = containerRef.current;
      const overScanTop = Math.max(0, scrollTop - (imageSize + GALLERY_IMAGE_GAP) * OVER_SCAN_ROWS);
      const overScanBottom = scrollTop + clientHeight + (imageSize + GALLERY_IMAGE_GAP) * OVER_SCAN_ROWS;
      let groupIndex = 0;
      let rowIndex = 0;
      let flag = false;
      for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        for (let j = 0; j < group.children.length; j++) {
          const row = group.children[j];
          if (row.top >= scrollTop) {
            groupIndex = i;
            rowIndex = j;
            flag = true;
          }
          if (flag) break;
        }
        if (flag) break;
      }
      lastState.current = { ...lastState.current, visibleAreaFirstImage: { groupIndex, rowIndex } };
      setOverScan({ top: overScanTop, bottom: overScanBottom });
    }
  }, [imageSize, onLoadMore, groups]);

  const imageItems = useMemo(() => {
    return groups.flatMap(group => group.children.flatMap(row => row.children));
  }, [groups]);

  const updateSelectedImage = useCallback((image = null) => {
    const imageInfo = image ? getRowById(metadata, image.id) : null;
    if (!imageInfo) {
      updateCurrentDirent();
      return;
    }
    updateCurrentDirent({
      type: 'file',
      name: image.name,
      path: image.path,
      file_tags: []
    });
  }, [metadata, updateCurrentDirent]);

  const handleClick = useCallback((event, image) => {
    if (event.metaKey || event.ctrlKey) {
      setSelectedImages(prev =>
        prev.includes(image) ? prev.filter(img => img !== image) : [...prev, image]
      );
      updateSelectedImage(image);
    } else if (event.shiftKey && selectedImages.length > 0) {
      const lastSelected = selectedImages[selectedImages.length - 1];
      const start = imageItems.indexOf(lastSelected);
      const end = imageItems.indexOf(image);
      const range = imageItems.slice(Math.min(start, end), Math.max(start, end) + 1);
      setSelectedImages(prev => Array.from(new Set([...prev, ...range])));
      updateSelectedImage(null);
    } else {
      setSelectedImages([image]);
      updateSelectedImage(image);
    }
  }, [imageItems, selectedImages, updateSelectedImage]);

  const handleDoubleClick = useCallback((event, image) => {
    const index = imageItems.findIndex(item => item.id === image.id);
    setImageIndex(index);
    setIsImagePopupOpen(true);
  }, [imageItems]);

  const handleContextMenu = useCallback((event, image) => {
    event.preventDefault();
    const index = imageItems.findIndex(item => item.id === image.id);
    if (isNaN(index) || index === -1) return;

    setSelectedImages(prev => prev.length < 2 ? [image] : [...prev]);
  }, [imageItems]);

  const moveToPrevImage = useCallback(() => {
    const imageItemsLength = imageItems.length;
    setImageIndex((prevState) => (prevState + imageItemsLength - 1) % imageItemsLength);
    setSelectedImages([imageItems[(imageIndex + imageItemsLength - 1) % imageItemsLength]]);
  }, [imageItems, imageIndex]);

  const moveToNextImage = useCallback(() => {
    const imageItemsLength = imageItems.length;
    setImageIndex((prevState) => (prevState + 1) % imageItemsLength);
    setSelectedImages([imageItems[(imageIndex + 1) % imageItemsLength]]);
  }, [imageItems, imageIndex]);

  const handleImageSelection = useCallback((selectedImages) => {
    setSelectedImages(selectedImages);
  }, []);

  const closeImagePopup = () => {
    setIsImagePopupOpen(false);
  };

  const handleDownload = useCallback(() => {
    if (!selectedImages.length) return;
    if (selectedImages.length === 1) {
      const image = selectedImages[0];
      const record = getRowById(metadata, image.id);
      downloadFile(repoID, record);
      return;
    }
    if (!useGoFileserver) {
      setIsZipDialogOpen(true);
      return;
    }
    const dirents = selectedImages.map(image => {
      const value = image.path === '/' ? image.name : `${image.path}/${image.name}`;
      return value;
    });
    metadataAPI.zipDownload(repoID, '/', dirents).then((res) => {
      const zipToken = res.data['zip_token'];
      location.href = `${fileServerRoot}zip/${zipToken}`;
    }).catch(error => {
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }, [repoID, metadata, selectedImages]);

  const handleDelete = useCallback(() => {
    if (!selectedImages.length) return;
    onDelete(selectedImages, () => {
      setSelectedImages([]);
    });
  }, [selectedImages, onDelete]);

  const closeZipDialog = () => {
    setIsZipDialogOpen(false);
  };

  const handleClickOutside = useCallback((event) => {
    const className = getEventClassName(event);
    const isClickInsideImage = className.includes('metadata-gallery-image-item') || className.includes('metadata-gallery-grid-image');

    if (!isClickInsideImage && containerRef.current.contains(event.target)) {
      handleImageSelection([]);
      updateSelectedImage();
    }
  }, [handleImageSelection, updateSelectedImage]);

  const deleteImage = useCallback(() => {
    const image = selectedImages[0];
    const index = imageItems.findIndex(item => item.id === image.id);
    onDelete(selectedImages);

    const newImageItems = imageItems.filter(item => item.id !== image.id);
    let newSelectedImage;

    if (newImageItems.length === 0) {
      setSelectedImages([]);
      setIsImagePopupOpen(false);
      setImageIndex(0);
    } else {
      const newIndex = index >= newImageItems.length ? 0 : index;
      newSelectedImage = newImageItems[newIndex];
      setImageIndex(newIndex);
    }

    setSelectedImages(newSelectedImage ? [newSelectedImage] : []);
    updateSelectedImage(newSelectedImage);
  }, [selectedImages, imageItems, onDelete, updateSelectedImage]);

  const options = useMemo(() => {
    return [
      { value: 'download', label: gettext('Download') },
      { value: 'delete', label: gettext('Delete') }
    ];
  }, []);

  const handleOptionClick = useCallback(option => {
    switch (option.value) {
      case 'download':
        handleDownload();
        break;
      case 'delete':
        handleDelete();
        break;
      default:
        break;
    }
  }, [handleDownload, handleDelete]);

  return (
    <>
      <div
        className={`sf-metadata-gallery-container sf-metadata-gallery-container-${mode}`}
        ref={containerRef}
        onScroll={handleScroll}
        onMouseDown={handleClickOutside}
      >
        {!isFirstLoading && (
          <>
            <Content
              groups={groups}
              size={imageSize}
              columns={columns}
              overScan={overScan}
              gap={GALLERY_IMAGE_GAP}
              mode={mode}
              selectedImages={selectedImages}
              onImageSelect={handleImageSelection}
              onImageClick={handleClick}
              onImageDoubleClick={handleDoubleClick}
              onContextMenu={handleContextMenu}
            />
            {isLoadingMore &&
              <div className="sf-metadata-gallery-loading-more">
                <CenteredLoading />
              </div>
            }
          </>
        )}
      </div>
      <ContextMenu
        options={options}
        onOptionClick={handleOptionClick}
        boundaryCoordinates={containerRef?.current?.getBoundingClientRect() || {}}
        ignoredTriggerElements={['.metadata-gallery-image-item', '.metadata-gallery-grid-image']}
      />
      {isImagePopupOpen && (
        <ModalPortal>
          <ImageDialog
            imageItems={imageItems}
            imageIndex={imageIndex}
            closeImagePopup={closeImagePopup}
            moveToPrevImage={moveToPrevImage}
            moveToNextImage={moveToNextImage}
            onDeleteImage={deleteImage}
          />
        </ModalPortal>
      )}
      {isZipDialogOpen && (
        <ModalPortal>
          <ZipDownloadDialog
            repoID={repoID}
            path={'/'}
            target={selectedImages.map(image => image.path === '/' ? image.name : `${image.path}/${image.name}`)}
            toggleDialog={closeZipDialog}
          />
        </ModalPortal>
      )}
    </>
  );
};

Main.propTypes = {
  isLoadingMore: PropTypes.bool,
  metadata: PropTypes.object,
  onDelete: PropTypes.func,
  onLoadMore: PropTypes.func
};

export default Main;
