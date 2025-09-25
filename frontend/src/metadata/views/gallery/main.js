import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import CenteredLoading from '../../../components/centered-loading';
import ImageDialog from '../../../components/dialog/image-dialog';
import ModalPortal from '../../../components/modal-portal';
import Content from './content';
import GalleryContextmenu from './context-menu';
import { useMetadataView } from '../../hooks/metadata-view';
import { Utils } from '../../../utils/utils';
import { getDateDisplayString, getFileMTimeFromRecord, getFileNameFromRecord, getParentDirFromRecord, getRecordIdFromRecord } from '../../utils/cell';
import { siteRoot, fileServerRoot, thumbnailSizeForGrid, thumbnailSizeForOriginal, thumbnailDefaultSize, enableVideoThumbnail } from '../../../utils/constants';
import { EVENT_BUS_TYPE, GALLERY_DATE_MODE, DATE_TAG_HEIGHT, STORAGE_GALLERY_DATE_MODE_KEY, STORAGE_GALLERY_ZOOM_GEAR_KEY, VIEW_TYPE_DEFAULT_SORTS, VIEW_TYPE } from '../../constants';
import { getRowById } from '../../../components/sf-table/utils/table';
import { getEventClassName } from '../../../utils/dom';
import { getColumns, getImageSize, getRowHeight } from './utils';
import ObjectUtils from '../../../utils/object';
import { openFile } from '../../utils/file';
import PeoplesDialog from '../../components/dialog/peoples-dialog';

import './index.css';

const OVER_SCAN_ROWS = 20;

const Main = ({ isLoadingMore, metadata, onDelete, onLoadMore, duplicateRecord, onRemoveImage, onAddImage, onSetPeoplePhoto, isSomeone }) => {
  const [isFirstLoading, setFirstLoading] = useState(true);
  const [zoomGear, setZoomGear] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [overScan, setOverScan] = useState({ top: 0, bottom: 0 });
  const [mode, setMode] = useState(GALLERY_DATE_MODE.YEAR);
  const [isImagePopupOpen, setIsImagePopupOpen] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [selectedImages, setSelectedImages] = useState([]);
  const [lastSelectedImage, setLastSelectedImage] = useState(null);
  const [isPeoplesDialogShow, setPeoplesDialogShow] = useState(false);

  const containerRef = useRef(null);
  const scrollContainer = useRef(null);
  const lastState = useRef({ scrollPos: 0 });

  const { repoID, updateCurrentDirent, updateSelectedRecordIds } = useMetadataView();
  const repoInfo = window.sfMetadataContext.getSetting('repoInfo');
  const canPreview = window.sfMetadataContext.canPreview();

  const images = useMemo(() => {
    if (isFirstLoading) return [];
    if (!Array.isArray(metadata.rows) || metadata.rows.length === 0) return [];
    const firstSort = metadata.view.sorts[0] || VIEW_TYPE_DEFAULT_SORTS[VIEW_TYPE.GALLERY];
    return metadata.rows
      .filter(record => {
        const fileName = getFileNameFromRecord(record);
        return Utils.imageCheck(fileName) || Utils.videoCheck(fileName);
      })
      .map(record => {
        const id = getRecordIdFromRecord(record);
        const fileName = getFileNameFromRecord(record);
        const parentDir = getParentDirFromRecord(record);
        const mtime = getFileMTimeFromRecord(record);
        let size = thumbnailDefaultSize;
        if (mode === GALLERY_DATE_MODE.YEAR) {
          size = thumbnailSizeForOriginal;
        } else if (mode === GALLERY_DATE_MODE.MONTH || mode === GALLERY_DATE_MODE.DAY) {
          size = thumbnailSizeForGrid;
        }
        const path = Utils.encodePath(Utils.joinPath(parentDir, fileName));
        const date = getDateDisplayString(record[firstSort.column_key], 'YYYY-MM-DD');
        const year = date.slice(0, 4);
        const month = date.slice(0, -3);
        const day = date.slice(-2,);

        const isVideo = Utils.videoCheck(fileName);
        const useFallbackIcon = isVideo && !enableVideoThumbnail;

        const baseThumbnailPath = `${siteRoot}thumbnail/${repoID}`;
        let src = useFallbackIcon
          ? Utils.getFileIconUrl(fileName)
          : `${baseThumbnailPath}/${size}${path}`;

        let thumbnail = useFallbackIcon
          ? Utils.getFileIconUrl(fileName)
          : `${baseThumbnailPath}/${thumbnailSizeForOriginal}${path}?mtime=${mtime}`;

        if (!canPreview) {
          const fileIcon = Utils.getFileIconUrl(fileName);
          src = fileIcon;
          thumbnail = fileIcon;
        }

        return {
          id,
          name: fileName,
          parentDir,
          url: `${siteRoot}lib/${repoID}/file${path}`,
          src,
          thumbnail,
          downloadURL: `${fileServerRoot}repos/${repoID}/files${path}?op=download`,
          year,
          month,
          day,
          date,
        };
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFirstLoading, repoID, metadata, metadata.recordsCount]);
  const columns = useMemo(() => getColumns(mode, zoomGear), [mode, zoomGear]);
  const imageSize = useMemo(() => getImageSize(containerWidth, columns, mode), [containerWidth, columns, mode]);
  const rowHeight = useMemo(() => getRowHeight(imageSize, mode), [mode, imageSize]);
  const groups = useMemo(() => {
    let init = images
      .reduce((_init, image) => {
        let name = '';
        if (mode === GALLERY_DATE_MODE.YEAR) name = image.year;
        if (mode === GALLERY_DATE_MODE.MONTH) name = image.month;
        if (mode === GALLERY_DATE_MODE.DAY || mode === GALLERY_DATE_MODE.ALL) name = image.date;
        let _group = _init.find(g => g.name === name);
        if (_group) {
          _group.children.push(image);
        } else {
          _init.push({
            name,
            children: [image],
          });
        }
        return _init;
      }, []);

    let _groups = [];
    const paddingTop = DATE_TAG_HEIGHT;
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
        if (!rows[rowIndex]) rows[rowIndex] = { top: paddingTop + top + rowIndex * rowHeight, children: [] };
        child.groupIndex = index;
        child.rowIndex = rowIndex;
        rows[rowIndex].children.push(child);
      });

      if (mode === GALLERY_DATE_MODE.YEAR) rows = rows.slice(0, 1);
      if (mode === GALLERY_DATE_MODE.MONTH) rows = rows.slice(0, 1);
      if (mode === GALLERY_DATE_MODE.DAY) rows = [{ top: rows[0].top, children: rows.slice(0, 2).flatMap(r => r.children) }];
      _groups.push({
        ...__init,
        top,
        height: rows.length * rowHeight + paddingTop,
        paddingTop,
        children: rows
      });
    });
    return _groups;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFirstLoading, images, repoID, columns, mode, containerWidth]);
  const containerHeight = useMemo(() => {
    return groups.reduce((cur, g) => cur + g.height, 0);
  }, [groups]);

  const handleScroll = useCallback(() => {
    if (!scrollContainer.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainer.current;

    if (scrollTop + clientHeight >= scrollHeight - 10) {
      onLoadMore && onLoadMore();
    }

    const scrollPos = (scrollTop + clientHeight / 2) / scrollHeight;
    lastState.current = { ...lastState.current, scrollPos };

    const newOverScan = {
      top: Math.max(0, scrollTop - rowHeight * OVER_SCAN_ROWS),
      bottom: scrollTop + clientHeight + rowHeight * OVER_SCAN_ROWS
    };
    setOverScan(newOverScan);
  }, [rowHeight, onLoadMore]);

  const updateSelectedImage = useCallback((image = null) => {
    const imageInfo = image ? getRowById(metadata, image.id) : null;
    if (!imageInfo) {
      updateCurrentDirent();
      return;
    }
    updateCurrentDirent({
      id: image.id,
      type: 'file',
      name: image.name,
      path: image.parentDir,
      file_tags: []
    });
  }, [metadata, updateCurrentDirent]);

  const updateSelectedImages = useCallback((selectedImages) => {
    const ids = selectedImages.map(item => item.id);
    if (isSomeone != undefined) { // 'face recognition'
      updateSelectedRecordIds(ids, isSomeone);
    } else {
      updateSelectedRecordIds(ids);
    }
  }, [isSomeone, updateSelectedRecordIds]);

  const handleClick = useCallback((event, image) => {
    if (event.metaKey || event.ctrlKey) {
      const updatedSelectedImages = selectedImages.includes(image)
        ? selectedImages.filter(img => img !== image)
        : [...selectedImages, image];
      setSelectedImages(updatedSelectedImages);
      updateSelectedImage(image);
      updateSelectedImages(updatedSelectedImages);
      return;
    }
    if (event.shiftKey && lastSelectedImage) {
      const lastSelectedIndex = images.findIndex(img => img.id === lastSelectedImage.id);
      const currentIndex = images.findIndex(img => img.id === image.id);
      const start = Math.min(lastSelectedIndex, currentIndex);
      const end = Math.max(lastSelectedIndex, currentIndex);
      const range = images.slice(start, end + 1);
      const updatedSelectedImages = Array.from(new Set([...selectedImages, ...range]));
      setSelectedImages(updatedSelectedImages);
      updateSelectedImage(null);
      updateSelectedImages(updatedSelectedImages);
      return;
    }
    const updatedSelectedImages = [image];
    setSelectedImages(updatedSelectedImages);
    updateSelectedImage(image);
    setLastSelectedImage(image);
    updateSelectedImages(updatedSelectedImages);
  }, [images, selectedImages, updateSelectedImage, lastSelectedImage, updateSelectedImages]);

  const handleDoubleClick = useCallback((event, image) => {
    event.preventDefault();
    const record = getRowById(metadata, image.id);
    if (!canPreview) return;
    openFile(repoID, record, () => {
      const index = images.findIndex(item => item.id === image.id);
      setImageIndex(index);
      setIsImagePopupOpen(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoID, metadata, images]);

  const handleContextMenu = useCallback((event, image) => {
    event.preventDefault();
    const index = images.findIndex(item => item.id === image.id);
    if (isNaN(index) || index === -1) return;

    const updatedSelectedImages = selectedImages.length < 2 ? [image] : [...selectedImages];
    setSelectedImages(updatedSelectedImages);
    updateSelectedImages(updatedSelectedImages);
  }, [images, selectedImages, updateSelectedImages]);

  const moveToPrevImage = useCallback(() => {
    const imageItemsLength = images.length;
    const selectedImage = images[(imageIndex + imageItemsLength - 1) % imageItemsLength];
    setImageIndex((prevState) => (prevState + imageItemsLength - 1) % imageItemsLength);
    const updatedSelectedImages = [selectedImage];
    setSelectedImages(updatedSelectedImages);
    updateSelectedImage(selectedImage);
    updateSelectedImages(updatedSelectedImages);
  }, [images, imageIndex, updateSelectedImage, updateSelectedImages]);

  const moveToNextImage = useCallback(() => {
    const imageItemsLength = images.length;
    const selectedImage = images[(imageIndex + 1) % imageItemsLength];
    setImageIndex((prevState) => (prevState + 1) % imageItemsLength);
    const updatedSelectedImages = [selectedImage];
    setSelectedImages(updatedSelectedImages);
    updateSelectedImage(selectedImage);
    updateSelectedImages(updatedSelectedImages);
  }, [images, imageIndex, updateSelectedImage, updateSelectedImages]);

  const handleImageSelection = useCallback((selectedImages) => {
    setSelectedImages(selectedImages);
    updateSelectedImages(selectedImages);
  }, [updateSelectedImages]);

  const selectNone = useCallback(() => {
    setSelectedImages([]);
    updateSelectedImages([]);
  }, [updateSelectedImages]);

  const closeImagePopup = useCallback(() => {
    setIsImagePopupOpen(false);
  }, []);

  const handleDeleteSelectedImages = useCallback((selectedImages) => {
    if (!selectedImages.length) return;
    onDelete(selectedImages, {
      success_callback: () => {
        updateCurrentDirent();
        setSelectedImages([]);
        updateSelectedImages([]);
      }
    });
  }, [onDelete, updateCurrentDirent, updateSelectedImages]);

  const handleRemoveSelectedImages = useCallback((selectedImages) => {
    if (!selectedImages.length) return;
    onRemoveImage && onRemoveImage(selectedImages, () => {
      updateCurrentDirent();
      setSelectedImages([]);
      updateSelectedImages([]);
    });
  }, [onRemoveImage, updateCurrentDirent, updateSelectedImages]);

  const handleAddPhotoToGroup = useCallback((selectedImages) => {
    setPeoplesDialogShow(true);
  }, []);

  const closePeoplesDialog = useCallback(() => {
    setPeoplesDialogShow(false);
  }, []);

  const addPhotoToGroup = useCallback((peopleIds, addedImages, callback) => {
    onAddImage(peopleIds, addedImages, callback);
    updateCurrentDirent();
    setSelectedImages([]);
    updateSelectedImages([]);
  }, [onAddImage, updateCurrentDirent, updateSelectedImages]);

  const setSelectedImageAsCover = useCallback((selectedImage) => {
    onSetPeoplePhoto(selectedImage, {
      success_callback: () => {
        updateCurrentDirent();
        setSelectedImages([]);
        updateSelectedImages([]);
      }
    });
  }, [onSetPeoplePhoto, updateCurrentDirent, updateSelectedImages]);

  const handleClickOutside = useCallback((event) => {
    const className = getEventClassName(event);
    const isClickInsideImage = className.includes('metadata-gallery-image-item') || className.includes('metadata-gallery-grid-image');

    if (!isClickInsideImage && containerRef.current.contains(event.target)) {
      handleImageSelection([]);
      updateSelectedImage();
      setLastSelectedImage(null);
    }
  }, [handleImageSelection, updateSelectedImage]);

  const deleteImage = useCallback(() => {
    const image = selectedImages[0];
    const index = images.findIndex(item => item.id === image.id);
    onDelete(selectedImages);

    const newImageItems = images.filter(item => item.id !== image.id);
    let newSelectedImage;

    if (newImageItems.length === 0) {
      setSelectedImages([]);
      updateSelectedImages([]);
      setIsImagePopupOpen(false);
      setImageIndex(0);
    } else {
      const newIndex = index >= newImageItems.length ? 0 : index;
      newSelectedImage = newImageItems[newIndex];
      setImageIndex(newIndex);
    }

    const updatedSelectedImages = newSelectedImage ? [newSelectedImage] : [];
    setSelectedImages(updatedSelectedImages);
    updateSelectedImage(newSelectedImage);
    updateSelectedImages(updatedSelectedImages);
  }, [selectedImages, images, onDelete, updateSelectedImage, updateSelectedImages]);

  const handleDateTagClick = useCallback((event, groupName) => {
    event.preventDefault();
    const image = groups.find(group => group.name === groupName)?.children[0]?.children[0];
    if (image) {
      lastState.current = { ...lastState.current, targetGroupFirstImageId: image.id };
    }
    if (mode === GALLERY_DATE_MODE.YEAR) {
      window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SWITCH_GALLERY_GROUP_BY, GALLERY_DATE_MODE.MONTH);
    } else if (mode === GALLERY_DATE_MODE.MONTH) {
      window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.SWITCH_GALLERY_GROUP_BY, GALLERY_DATE_MODE.DAY);
    }
  }, [mode, groups]);

  useEffect(() => {
    updateCurrentDirent();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const gear = window.sfMetadataContext.localStorage.getItem(STORAGE_GALLERY_ZOOM_GEAR_KEY, 0) || 0;
    setZoomGear(gear);

    const mode = window.sfMetadataContext.localStorage.getItem(STORAGE_GALLERY_DATE_MODE_KEY, GALLERY_DATE_MODE.DAY) || GALLERY_DATE_MODE.DAY;
    setMode(mode);
    lastState.current = { ...lastState.current, mode };

    const switchGalleryModeSubscribe = window.sfMetadataContext.eventBus.subscribe(
      EVENT_BUS_TYPE.SWITCH_GALLERY_GROUP_BY,
      (mode) => {
        setSelectedImages([]);
        updateSelectedImages([]);
        setMode(mode);
        lastState.current = { ...lastState.current, mode };
        window.sfMetadataContext.localStorage.setItem(STORAGE_GALLERY_DATE_MODE_KEY, mode);
      }
    );

    const container = containerRef.current;
    if (container) {
      const { offsetWidth, clientHeight } = container;
      setContainerWidth(offsetWidth);

      // Calculate initial overScan information
      setOverScan({ top: 0, bottom: clientHeight + rowHeight * OVER_SCAN_ROWS });
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
      window.sfMetadataContext.localStorage.setItem(STORAGE_GALLERY_ZOOM_GEAR_KEY, zoomGear);
      setZoomGear(zoomGear);
    });

    const unsubscribeSelectNone = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.SELECT_NONE, selectNone);
    const unsubscribeRemovePhotosFromCurrentSet = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.REMOVE_PHOTOS_FROM_CURRENT_SET, handleRemoveSelectedImages);
    const unsubscribeSetPhotoAsCover = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.SET_PHOTO_AS_COVER, setSelectedImageAsCover);
    const unsubscribeAddPhotoToGroups = window.sfMetadataContext.eventBus.subscribe(EVENT_BUS_TYPE.ADD_PHOTO_TO_GROUPS, handleAddPhotoToGroup);

    return () => {
      container && resizeObserver.unobserve(container);
      modifyGalleryZoomGearSubscribe();
      unsubscribeSelectNone();
      unsubscribeRemovePhotosFromCurrentSet();
      unsubscribeSetPhotoAsCover();
      unsubscribeAddPhotoToGroups();
      switchGalleryModeSubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!imageSize || imageSize?.large < 0) return;
    if (lastState.current?.mode === mode && mode === GALLERY_DATE_MODE.ALL && !ObjectUtils.isSameObject(imageSize, lastState.current.imageSize)) {
      const { scrollHeight, clientHeight } = scrollContainer.current;
      const { scrollPos } = lastState.current;
      scrollContainer.current.scrollTop = scrollHeight * scrollPos - clientHeight / 2;
      lastState.current = { ...lastState.current, imageSize, mode };
    } else {
      const { targetGroupFirstImageId: imageId } = lastState.current;
      if (imageId) {
        const targetGroup = groups.find(group => group.children.some(row => row.children.some(img => img.id === imageId)));
        if (targetGroup) {
          scrollContainer.current.scrollTop = targetGroup.top;
        }
        lastState.current = { ...lastState.current, targetGroupFirstImageId: null, mode };
      }
    }
  }, [mode, imageSize, groups]);

  useEffect(() => {
    if (containerHeight < window.innerHeight) {
      onLoadMore && onLoadMore();
    }
  }, [containerHeight, onLoadMore]);

  return (
    <div className="sf-metadata-gallery-scroll-container" ref={scrollContainer} onScroll={handleScroll}>
      <div
        className={`sf-metadata-gallery-container sf-metadata-gallery-container-${mode}`}
        ref={containerRef}
        onMouseDown={handleClickOutside}
      >
        {!isFirstLoading && (
          <>
            <Content
              groups={groups}
              size={imageSize}
              columns={columns}
              overScan={overScan}
              mode={mode}
              rowHeight={rowHeight}
              selectedImages={selectedImages}
              onImageSelect={handleImageSelection}
              onImageClick={handleClick}
              onImageDoubleClick={handleDoubleClick}
              onContextMenu={handleContextMenu}
              onDateTagClick={handleDateTagClick}
            />
            {isLoadingMore &&
              <div className="sf-metadata-gallery-loading-more">
                <CenteredLoading />
              </div>
            }
          </>
        )}
      </div>
      <GalleryContextmenu
        selectedImages={selectedImages}
        isSomeone={isSomeone}
        onDelete={handleDeleteSelectedImages}
        onDuplicate={duplicateRecord}
        onRemoveImage={onRemoveImage ? handleRemoveSelectedImages : null}
        onAddImage={onAddImage ? handleAddPhotoToGroup : null}
        onSetPeoplePhoto={setSelectedImageAsCover}
      />
      {isImagePopupOpen && (
        <ModalPortal>
          <ImageDialog
            repoID={repoID}
            repoInfo={repoInfo}
            imageItems={images}
            imageIndex={imageIndex}
            closeImagePopup={closeImagePopup}
            moveToPrevImage={moveToPrevImage}
            moveToNextImage={moveToNextImage}
            onDeleteImage={deleteImage}
          />
        </ModalPortal>
      )}
      {isPeoplesDialogShow && (
        <ModalPortal>
          <PeoplesDialog selectedImages={selectedImages} onToggle={closePeoplesDialog} onSubmit={addPhotoToGroup} />
        </ModalPortal>
      )}
    </div>
  );
};

Main.propTypes = {
  isLoadingMore: PropTypes.bool,
  metadata: PropTypes.object,
  onDelete: PropTypes.func,
  onLoadMore: PropTypes.func,
  duplicateRecord: PropTypes.func,
  onAddFolder: PropTypes.func,
};

export default Main;
