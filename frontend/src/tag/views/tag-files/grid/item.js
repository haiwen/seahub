import classNames from 'classnames';
import React, { useCallback, useMemo, useState } from 'react';
import { getFileMTimeFromRecord, getFileNameFromRecord, getParentDirFromRecord, getRecordIdFromRecord } from '../../../../metadata/utils/cell';
import { Utils } from '../../../../utils/utils';
import { siteRoot, thumbnailDefaultSize } from '../../../../utils/constants';
import { openFile } from '../../../../metadata/utils/file';

const TagFile = ({ repoID, file, selectedFileIds, onSelectFile, onMultiSelect, openImagePreview, onContextMenu }) => {
  const [isThumbnailLoadErr, setIsThumbnailLoadErr] = useState(false);

  const canPreview = useMemo(() => window.sfTagsDataContext.canPreview(), []);
  const fileId = useMemo(() => getRecordIdFromRecord(file), [file]);
  const name = useMemo(() => getFileNameFromRecord(file), [file]);
  const displayFilename = useMemo(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
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
  const isMedia = useMemo(() => Utils.imageCheck(name) || Utils.videoCheck(name), [name]);
  const thumbnailUrl = useMemo(() => {
    const defaultIconUrl = Utils.getFileIconUrl(name);
    if (!isMedia || isThumbnailLoadErr) return defaultIconUrl;

    const parentDir = getParentDirFromRecord(file);
    const path = Utils.encodePath(Utils.joinPath(parentDir, name));
    const thumbnail = `${siteRoot}thumbnail/${repoID}/${thumbnailDefaultSize}${path}?mtime=${getFileMTimeFromRecord(file)}`;
    return thumbnail;
  }, [repoID, file, name, isMedia, isThumbnailLoadErr]);
  const isSelected = useMemo(() => selectedFileIds ? selectedFileIds.includes(fileId) : false, [fileId, selectedFileIds]);

  const onClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!canPreview) return;
    const isMultiSelect = e.ctrlKey || e.metaKey || e.shiftKey;
    if (isMultiSelect) {
      onMultiSelect(e, fileId);
      return;
    }

    if (isSelected) {
      openFile(repoID, file, () => {
        openImagePreview(file);
      });
    }
    onSelectFile([fileId]);
  }, [repoID, fileId, file, canPreview, isSelected, openImagePreview, onSelectFile, onMultiSelect]);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(e, file);
  }, [file, onContextMenu]);

  const onLoadError = useCallback(() => {
    setIsThumbnailLoadErr(true);
  }, []);

  return (
    <>
      <li
        className={classNames('grid-item cursor-pointer', { 'grid-selected-active': isSelected })}
        data-fileid={fileId}
        onContextMenu={handleContextMenu}
        onClick={onClick}
      >
        <div className="grid-file-img-link" onDragStart={(e) => e.preventDefault()}>
          {canPreview && isMedia ? (
            <img className="thumbnail" src={thumbnailUrl} onClick={onClick} alt="" onError={onLoadError} />
          ) : (
            <img src={Utils.getFileIconUrl(name)} width="80" height="80" alt="" />
          )}
        </div>
        <div className="grid-file-name">
          <a className="grid-file-name-link" title={name} onClick={onClick}>{displayFilename}</a>
        </div>
      </li>
    </>
  );
};

export default TagFile;
