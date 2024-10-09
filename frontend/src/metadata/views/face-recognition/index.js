import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { CenteredLoading } from '@seafile/sf-metadata-ui-component';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';
import metadataAPI from '../../api';
import FaceGroup from './face-group';
import ImageDialog from '../../../components/dialog/image-dialog';
import ModalPortal from '../../../components/modal-portal';
import { siteRoot, gettext, thumbnailSizeForOriginal, thumbnailDefaultSize } from '../../../utils/constants';

import './index.css';

const LIMIT = 1000;

const FaceRecognition = ({ repoID }) => {
  const [loading, setLoading] = useState(true);
  const [faceOriginData, setFaceOriginData] = useState([]);
  const [isLoadingMore, setLoadingMore] = useState(false);
  const [isImagePopupOpen, setIsImagePopupOpen] = useState(false);
  const [imageIndex, setImageIndex] = useState(-1);
  const containerRef = useRef(null);
  const hasMore = useRef(true);

  const faceData = useMemo(() => {
    if (!Array.isArray(faceOriginData) || faceOriginData.length === 0) return [];
    const data = faceOriginData.map(dataItem => {
      const { record_id, link_photos } = dataItem;
      const linkPhotos = link_photos || [];
      const name = dataItem.name || gettext('Person Image');
      return {
        record_id: record_id,
        name: name || gettext('Person Image'),
        photos: linkPhotos.map(photo => {
          const { path } = photo;
          return {
            ...photo,
            name: photo.file_name,
            url: `${siteRoot}lib/${repoID}/file${path}`,
            default_url: `${siteRoot}thumbnail/${repoID}/${thumbnailDefaultSize}${path}`,
            src: `${siteRoot}thumbnail/${repoID}/${thumbnailDefaultSize}${path}`,
            thumbnail: `${siteRoot}thumbnail/${repoID}/${thumbnailSizeForOriginal}${path}`,
          };
        }),
      };
    });
    return data;
  }, [repoID, faceOriginData]);

  const imageItems = useMemo(() => {
    return faceData.map(group => group.photos).flat();
  }, [faceData]);

  useEffect(() => {
    setLoading(true);
    metadataAPI.getFaceData(repoID, 0, LIMIT).then(res => {
      const faceOriginData = res.data.results || [];
      if (faceOriginData.length < LIMIT) {
        hasMore.current = false;
      }
      setFaceOriginData(faceOriginData);
      setLoading(false);
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = useCallback(() => {
    if (!hasMore.current) return;
    setLoadingMore(true);
    metadataAPI.getFaceData(repoID, faceOriginData.length, LIMIT).then(res => {
      const newFaceData = res.data.results || [];
      if (newFaceData.length < LIMIT) {
        hasMore.current = false;
      }
      setFaceOriginData([...faceOriginData, ...newFaceData]);
      setLoadingMore(false);
    }).catch(error => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);
      setLoadingMore(false);
    });
  }, [repoID, faceOriginData]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      loadMore();
    }
  }, [loadMore]);

  const onPhotoClick = useCallback((photo) => {
    let imageIndex = imageItems.findIndex(item => item.url === photo.url);
    if (imageIndex < 0) imageIndex = 0;
    setImageIndex(imageIndex);
    setIsImagePopupOpen(true);
  }, [imageItems]);

  const closeImagePopup = useCallback(() => {
    setIsImagePopupOpen(false);
    setImageIndex(-1);
  }, []);

  const moveToPrevImage = useCallback(() => {
    let prevImageIndex = imageIndex - 1;
    if (prevImageIndex < 0) prevImageIndex = imageItems.length - 1;
    setImageIndex(prevImageIndex);
  }, [imageIndex, imageItems]);

  const moveToNextImage = useCallback(() => {
    let nextImageIndex = imageIndex + 1;
    if (nextImageIndex > imageItems.length - 1) nextImageIndex = 0;
    setImageIndex(nextImageIndex);
  }, [imageIndex, imageItems]);

  if (loading) {
    return (<CenteredLoading />);
  }

  return (
    <>
      <div className="sf-metadata-wrapper">
        <div className="sf-metadata-main">
          <div className="sf-metadata-container">
            <div className="sf-metadata-face-recognition" ref={containerRef} onScroll={handleScroll}>
              {faceData.length > 0 && faceData.map((face) => {
                return (<FaceGroup key={face.record_id} group={face} repoID={repoID} onPhotoClick={onPhotoClick} />);
              })}
              {isLoadingMore && (
                <div className="sf-metadata-face-recognition-loading-more">
                  <CenteredLoading />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {isImagePopupOpen && (
        <ModalPortal>
          <ImageDialog
            imageItems={imageItems}
            imageIndex={imageIndex}
            closeImagePopup={closeImagePopup}
            moveToPrevImage={moveToPrevImage}
            moveToNextImage={moveToNextImage}
          />
        </ModalPortal>
      )}
    </>
  );
};

FaceRecognition.propTypes = {
  repoID: PropTypes.string.isRequired,
};

export default FaceRecognition;
