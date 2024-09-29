import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { CenteredLoading } from '@seafile/sf-metadata-ui-component';
import metadataAPI from '../../api';
import URLDecorator from '../../../utils/url-decorator';
import toaster from '../../../components/toast';
import GalleryMain from './gallery-main';
import ContextMenu from './context-menu';
import ImageDialog from '../../../components/dialog/image-dialog';
import ZipDownloadDialog from '../../../components/dialog/zip-download-dialog';
import ModalPortal from '../../../components/modal-portal';
import { useMetadataView } from '../../hooks/metadata-view';
import { Utils } from '../../../utils/utils';
import { getDateDisplayString, getFileNameFromRecord, getParentDirFromRecord } from '../../utils/cell';
import { siteRoot, fileServerRoot, useGoFileserver, gettext, thumbnailSizeForGrid, thumbnailSizeForOriginal } from '../../../utils/constants';
import { EVENT_BUS_TYPE, PER_LOAD_NUMBER, PRIVATE_COLUMN_KEY, GALLERY_DATE_MODE, DATE_TAG_HEIGHT, GALLERY_IMAGE_GAP } from '../../constants';

import './index.css';

const Gallery = () => {
  const [isFirstLoading, setFirstLoading] = useState(true);
  const [isLoadingMore, setLoadingMore] = useState(false);
  const [zoomGear, setZoomGear] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [overScan, setOverScan] = useState({ top: 0, bottom: 0 });
  const [mode, setMode] = useState(GALLERY_DATE_MODE.DAY);
  const [isImagePopupOpen, setIsImagePopupOpen] = useState(false);
  const [isZipDialogOpen, setIsZipDialogOpen] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [selectedImages, setSelectedImages] = useState([]);

  const containerRef = useRef(null);
  const renderMoreTimer = useRef(null);

  const { metadata, store } = useMetadataView();
  const repoID = window.sfMetadataContext.getSetting('repoID');

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
      setOverScan({ top: 0, bottom: clientHeight + (imageSize + GALLERY_IMAGE_GAP) * 2 });
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
        const overScanTop = Math.max(0, scrollTop - (imageSize + GALLERY_IMAGE_GAP) * 3);
        const overScanBottom = scrollTop + clientHeight + (imageSize + GALLERY_IMAGE_GAP) * 3;
        setOverScan({ top: overScanTop, bottom: overScanBottom });
        renderMoreTimer.current = null;
      }, 200);
    }
  }, [imageSize, loadMore, renderMoreTimer]);

  const imageItems = useMemo(() => {
    return groups.flatMap(group => group.children.flatMap(row => row.children));
  }, [groups]);

  const handleClick = useCallback((event, image) => {
    if (event.metaKey || event.ctrlKey) {
      setSelectedImages(prev =>
        prev.includes(image) ? prev.filter(img => img !== image) : [...prev, image]
      );
    } else if (event.shiftKey && selectedImages.length > 0) {
      const lastSelected = selectedImages[selectedImages.length - 1];
      const start = imageItems.indexOf(lastSelected);
      const end = imageItems.indexOf(image);
      const range = imageItems.slice(Math.min(start, end), Math.max(start, end) + 1);
      setSelectedImages(prev => Array.from(new Set([...prev, ...range])));
    } else {
      setSelectedImages([image]);
    }
  }, [imageItems, selectedImages]);

  const handleDoubleClick = useCallback((event, image) => {
    const index = imageItems.findIndex(item => item.id === image.id);
    setImageIndex(index);
    setIsImagePopupOpen(true);
  }, [imageItems]);

  const handleRightClick = useCallback((event, image) => {
    event.preventDefault();
    const index = imageItems.findIndex(item => item.id === image.id);
    if (isNaN(index) || index === -1) return;

    setSelectedImages(prev => prev.length < 2 ? [image] : [...prev]);
  }, [imageItems]);

  const moveToPrevImage = () => {
    const imageItemsLength = imageItems.length;
    setImageIndex((prevState) => (prevState + imageItemsLength - 1) % imageItemsLength);
  };

  const moveToNextImage = () => {
    const imageItemsLength = imageItems.length;
    setImageIndex((prevState) => (prevState + 1) % imageItemsLength);
  };


  const closeImagePopup = () => {
    setIsImagePopupOpen(false);
  };

  const handleDownload = useCallback(() => {
    if (selectedImages.length) {
      if (selectedImages.length === 1) {
        const image = selectedImages[0];
        let direntPath = image.path === '/' ? image.name : Utils.joinPath(image.path, image.name);
        let url = URLDecorator.getUrl({ type: 'download_file_url', repoID: repoID, filePath: direntPath });
        location.href = url;
      } else {
        if (!useGoFileserver) {
          setIsZipDialogOpen(true);
        } else {
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
        }
      }
    }
  }, [repoID, selectedImages]);

  const handleDelete = () => {
    if (selectedImages.length) {
      metadataAPI.batchDeleteFiles(repoID, selectedImages.map(image => image.path === '/' ? image.name : `${image.path}/${image.name}`))
        .then(() => {
          setSelectedImages([]);
          let msg = selectedImages.length > 1
            ? gettext('Successfully deleted {n} images.')
            : gettext('Successfully deleted {name}');
          msg = msg.replace('{name}', selectedImages[0].name)
            .replace('{n}', selectedImages.length);
          toaster.success(msg, { duration: 3 });

          // filter out related rows according to selected images, then update metadata's rows
          const selectedIdMap = {};
          selectedImages.forEach(image => selectedIdMap[image.id] = true);
          const newMetadata = {
            ...metadata,
            rows: metadata.rows.filter(row => !selectedIdMap[row[PRIVATE_COLUMN_KEY.ID]]),
          };
          window.sfMetadataContext.eventBus.dispatch(EVENT_BUS_TYPE.UPDATE_TABLE_ROWS, newMetadata);
        }).catch(error => {
          const errMessage = Utils.getErrorMsg(error);
          toaster.danger(errMessage);
        });
    }
  };

  const closeZipDialog = () => {
    setIsZipDialogOpen(false);
  };

  return (
    <div className="sf-metadata-container">
      <div className="sf-metadata-gallery-container" ref={containerRef} onScroll={handleScroll} >
        {!isFirstLoading && (
          <>
            <GalleryMain
              groups={groups}
              size={imageSize}
              columns={columns}
              overScan={overScan}
              gap={GALLERY_IMAGE_GAP}
              selectedImages={selectedImages}
              setSelectedImages={setSelectedImages}
              onImageClick={handleClick}
              onImageDoubleClick={handleDoubleClick}
              onImageRightClick={handleRightClick}
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
        getContentRect={() => containerRef.current.getBoundingClientRect()}
        getContainerRect={() => containerRef.current.getBoundingClientRect()}
        onDownload={handleDownload}
        onDelete={handleDelete}
      />
      {isImagePopupOpen &&
      <ModalPortal>
        <ImageDialog
          imageItems={imageItems}
          imageIndex={imageIndex}
          closeImagePopup={closeImagePopup}
          moveToPrevImage={moveToPrevImage}
          moveToNextImage={moveToNextImage}
        />
      </ModalPortal>
      }
      {isZipDialogOpen &&
        <ModalPortal>
          <ZipDownloadDialog
            repoID={repoID}
            path={'/'}
            target={selectedImages.map(image => image.path === '/' ? image.name : `${image.path}/${image.name}`)}
            toggleDialog={closeZipDialog}
          />
        </ModalPortal>
      }
    </div>
  );
};

export default Gallery;
