import classNames from 'classnames';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getFileMTimeFromRecord, getFileNameFromRecord, getParentDirFromRecord, getRecordIdFromRecord } from '../../../../metadata/utils/cell';
import { Utils } from '../../../../utils/utils';
import { enablePDFThumbnail, enableVideoThumbnail, siteRoot, thumbnailDefaultSize } from '../../../../utils/constants';
import { imageThumbnailCenter, videoThumbnailCenter } from '../../../../utils/thumbnail-center';
import { openFile } from '../../../../metadata/utils/file';

const TagFileGrid = ({ repoID, file, tagsData, selectedFileIds, onSelectFile, openImagePreview, onContextMenu }) => {
  const [dirent, setDirent] = useState(file);
  const [isThumbnailLoadErr, setIsThumbnailLoadErr] = useState(false);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);

  const thumbnailCenter = useRef(null);

  const canPreview = useMemo(() => window.sfTagsDataContext.canPreview(), []);
  const repoEncrypted = useMemo(() => window.sfTagsDataContext.getSetting('encrypted'), []);
  const fileId = useMemo(() => getRecordIdFromRecord(file), [file]);
  const name = useMemo(() => getFileNameFromRecord(file), [file]);
  const displayFilename = useMemo(() => {
    const convas = document.createElement('canvas');
    const ctx = convas.getContext('2d');
    ctx.font = '14px Arial';
    const metrics = ctx.measureText(name);
    const textWidth = metrics.width;
    const containerWidth = 230;
    if (textWidth > containerWidth) {
      let dotIndex = name.lastIndexOf('.');
      let frontName = name.slice(0, dotIndex - 2);
      let backName = name.slice(dotIndex - 2);
      let sum = 0;
      for (let i = 0; i < frontName.length; i++) {
        frontName.charCodeAt(i) > 127 ? (sum = sum + 2) : (sum = sum + 1);
        if (sum > 20) {
          frontName = frontName.slice(0, i) + '...';
          break;
        }
      }
      return frontName + backName;
    } else {
      return name;
    }
  }, [name]);
  const thumbnailUrl = useMemo(() => {
    const defaultIconUrl = Utils.getFileIconUrl(name);
    const isMedia = Utils.imageCheck(name) || Utils.videoCheck(name);
    if (!isMedia || isThumbnailLoadErr) return defaultIconUrl;

    const parentDir = getParentDirFromRecord(file);
    const path = Utils.encodePath(Utils.joinPath(parentDir, name));
    const thumbnail = `${siteRoot}thumbnail/${repoID}/${thumbnailDefaultSize}${path}?mtime=${getFileMTimeFromRecord(file)}`;
    return thumbnail;
  }, [repoID, file, name, isThumbnailLoadErr]);
  const isSelected = useMemo(() => selectedFileIds ? selectedFileIds.includes(fileId) : false, [fileId, selectedFileIds]);

  const onMouseDown = useCallback(() => {

  }, []);

  const onClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!canPreview) return;
    if (e.metaKey || e.ctrlKey) {
      const newSelectedFileIds = selectedFileIds.includes(fileId)
        ? selectedFileIds.filter(id => id !== fileId)
        : [...selectedFileIds, fileId];
      onSelectFile(newSelectedFileIds);
      return;
    }

    if (isSelected) {
      openFile(repoID, file, () => {
        openImagePreview(file);
      });
    }
    onSelectFile([fileId]);
  }, [repoID, fileId, file, canPreview, isSelected, openImagePreview, selectedFileIds, onSelectFile]);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(e, file);
  }, [file, onContextMenu]);

  const onLoadError = useCallback(() => {
    setIsThumbnailLoadErr(true);
  }, []);

  const checkGenerateThumbnail = useCallback((dirent) => {
    const name = getFileNameFromRecord(dirent);
    if (repoEncrypted || dirent.encoded_thumbnail_src || dirent.encoded_thumbnail_src === '') {
      return false;
    }
    if (enableVideoThumbnail && Utils.videoCheck(name)) {
      thumbnailCenter.current = videoThumbnailCenter;
      return true;
    }
    if (Utils.imageCheck(name) || (enablePDFThumbnail && Utils.pdfCheck(name))) {
      thumbnailCenter.current = imageThumbnailCenter;
      return true;
    }
    return false;
  }, [repoEncrypted]);

  useEffect(() => {
    if (isGeneratingThumbnail) return;
    if (checkGenerateThumbnail(dirent)) {
      setIsGeneratingThumbnail(true);
      thumbnailCenter.current.createThumbnail({
        repoID,
        path: Utils.joinPath(getParentDirFromRecord(file), name),
        callback: (thumbnailSrc) => {
          setIsGeneratingThumbnail(false);
          setDirent({ ...dirent, encoded_thumbnail_src: thumbnailSrc });
        }
      });
    }
  }, [repoID, file, name, dirent, isGeneratingThumbnail, checkGenerateThumbnail]);

  return (
    <>
      <li
        className={classNames('grid-item cursor-pointer', { 'grid-selected-active': isSelected })}
        onContextMenu={handleContextMenu}
        onMouseDown={onMouseDown}
        onClick={onClick}
      >
        <div className="grid-file-img-link">
          {canPreview && dirent.encoded_thumbnail_src ? (
            <img className="thumbnail" src={thumbnailUrl} onClick={onClick} alt="" onError={onLoadError} />
          ) : (
            <img src={Utils.getFileIconUrl(name)} width="80" height="80" alt="" />
          )}
        </div>
        <div className="grid-file-name">
          <a className="tag-file-name" title={name} onClick={onClick}>{displayFilename}</a>
        </div>
      </li>
    </>
  );
};

export default TagFileGrid;
