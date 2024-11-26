import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useTagView } from '../../hooks';
import { gettext } from '../../../utils/constants';
import TagFile from './tag-file';
import { getRecordIdFromRecord } from '../../../metadata/utils/cell';
import EmptyTip from '../../../components/empty-tip';
import ImagePreviewer from '../../../metadata/components/cell-formatter/image-previewer';

import './index.css';

const TagFiles = () => {
  const { tagFiles, repoID, repoInfo } = useTagView();
  const [selectedFiles, setSelectedFiles] = useState(null);
  const [isImagePreviewerVisible, setImagePreviewerVisible] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);

  const currentImageRef = useRef(null);
  const containerRef = useRef(null);

  const onMouseDown = useCallback((event) => {
    if (event.button === 2) {
      event.stopPropagation();
      return;
    }
  }, []);

  const onThreadMouseDown = useCallback((event) => {
    onMouseDown(event);
  }, [onMouseDown]);

  const onThreadContextMenu = useCallback((event) => {
    event.stopPropagation();
  }, []);

  const onSelectedAll = useCallback(() => {
    const allIds = tagFiles.rows.map(record => getRecordIdFromRecord(record));
    setSelectedFiles(allIds);
  }, [tagFiles]);

  const onSelectFile = useCallback((fileId) => {
    let newSelectedFiles = selectedFiles ? selectedFiles.slice(0) : [];
    if (newSelectedFiles.includes(fileId)) {
      newSelectedFiles = newSelectedFiles.filter(item => item !== fileId);
    } else {
      newSelectedFiles.push(fileId);
    }
    if (newSelectedFiles.length > 0) {
      setSelectedFiles(newSelectedFiles);
    } else {
      setSelectedFiles(null);
    }
  }, [selectedFiles]);

  const reSelectFiles = useCallback((fileId) => {
    setSelectedFiles([fileId]);
  }, []);

  const openImagePreview = useCallback((record) => {
    currentImageRef.current = record;
    setImagePreviewerVisible(true);
  }, []);

  const closeImagePreviewer = useCallback(() => {
    currentImageRef.current = null;
    setImagePreviewerVisible(false);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const handleResize = () => {
      if (!container) return;
      // 32: container padding left + container padding right
      setContainerWidth(container.offsetWidth - 32);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    container && resizeObserver.observe(container);

    return () => {
      container && resizeObserver.unobserve(container);
    };
  }, []);

  if (tagFiles.rows.length === 0) {
    return (<EmptyTip text={gettext('No files')} />);
  }

  const isSelectedAll = selectedFiles && selectedFiles.length === tagFiles.rows.length;

  return (
    <>
      <div className="table-container" ref={containerRef}>
        <table className="table-hover">
          <thead onMouseDown={onThreadMouseDown} onContextMenu={onThreadContextMenu}>
            <tr>
              <th style={{ width: 31 }} className="pl10 pr-2">
                <input
                  type="checkbox"
                  className="vam"
                  onChange={onSelectedAll}
                  checked={isSelectedAll}
                  title={isSelectedAll ? gettext('Unselect all') : gettext('Select all')}
                  disabled={tagFiles.rows.length === 0}
                />
              </th>
              <th style={{ width: 40 }} className="pl-2 pr-2">{/* icon */}</th>
              <th style={{ width: (containerWidth - 71) * 0.5 }}><a className="d-block table-sort-op" href="#">{gettext('Name')}</a></th>
              <th style={{ width: (containerWidth - 71) * 0.06 }}>{/* tag */}</th>
              <th style={{ width: (containerWidth - 71) * 0.18 }}>{/* operation */}</th>
              <th style={{ width: (containerWidth - 71) * 0.11 }}><a className="d-block table-sort-op" href="#">{gettext('Size')}</a></th>
              <th style={{ width: (containerWidth - 71) * 0.15 }}><a className="d-block table-sort-op" href="#">{gettext('Last Update')}</a></th>
            </tr>
          </thead>
          <tbody>
            {tagFiles.rows.map(file => {
              const fileId = getRecordIdFromRecord(file);
              return (
                <TagFile
                  key={fileId}
                  repoID={repoID}
                  isSelected={selectedFiles && selectedFiles.includes(fileId)}
                  file={file}
                  onSelectFile={onSelectFile}
                  reSelectFiles={reSelectFiles}
                  openImagePreview={openImagePreview}
                />);
            })}
          </tbody>
        </table>
      </div>
      {isImagePreviewerVisible && (
        <ImagePreviewer
          repoID={repoID}
          repoInfo={repoInfo}
          record={currentImageRef.current}
          table={tagFiles}
          closeImagePopup={closeImagePreviewer}
        />
      )}
    </>
  );
};

export default TagFiles;
