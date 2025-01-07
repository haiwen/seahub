import React, { useCallback, useState, useRef, useMemo } from 'react';
import { useTagView, useTags } from '../../hooks';
import { gettext } from '../../../utils/constants';
import TagFile from './tag-file';
import { getRecordIdFromRecord } from '../../../metadata/utils/cell';
import EmptyTip from '../../../components/empty-tip';
import ImagePreviewer from '../../../metadata/components/cell-formatter/image-previewer';
import FixedWidthTable from '../../../components/common/fixed-width-table';

import './index.css';

const TagFiles = () => {
  const { tagFiles, repoID, repoInfo } = useTagView();
  const { tagsData } = useTags();
  const [selectedFiles, setSelectedFiles] = useState(null);
  const [isImagePreviewerVisible, setImagePreviewerVisible] = useState(false);

  const currentImageRef = useRef(null);

  const isSelectedAll = useMemo(() => {
    return selectedFiles ? selectedFiles.length === tagFiles.rows.length : false;
  }, [selectedFiles, tagFiles]);

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
    if (isSelectedAll) {
      setSelectedFiles([]);
    } else {
      const allIds = tagFiles.rows.map(record => getRecordIdFromRecord(record));
      setSelectedFiles(allIds);
    }
  }, [tagFiles, isSelectedAll]);

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

  if (tagFiles.rows.length === 0) {
    return (<EmptyTip text={gettext('No files')} />);
  }

  const headers = [
    {
      isFixed: true,
      width: 31,
      className: 'pl10 pr-2',
      children: (
        <input
          type="checkbox"
          className="vam"
          onChange={onSelectedAll}
          checked={isSelectedAll}
          title={isSelectedAll ? gettext('Unselect all') : gettext('Select all')}
          disabled={tagFiles.rows.length === 0}
        />
      )
    }, {
      isFixed: true,
      width: 41,
      className: 'pl-2 pr-2',
    }, {
      isFixed: false,
      width: 0.5,
      children: (<a className="d-block table-sort-op" href="#">{gettext('Name')}</a>),
    }, {
      isFixed: false,
      width: 0.06,
    }, {
      isFixed: false,
      width: 0.18,
    }, {
      isFixed: false,
      width: 0.11,
      children: (<a className="d-block table-sort-op" href="#">{gettext('Size')}</a>),
    }, {
      isFixed: false,
      width: 0.15,
      children: (<a className="d-block table-sort-op" href="#">{gettext('Last Update')}</a>),
    }
  ];

  return (
    <>
      <div className="table-container">
        <FixedWidthTable
          headers={headers}
          className="table-hover"
          theadOptions={{
            onMouseDown: onThreadMouseDown,
            onContextMenu: onThreadContextMenu,
          }}
        >
          {tagFiles.rows.map(file => {
            const fileId = getRecordIdFromRecord(file);
            return (
              <TagFile
                key={fileId}
                repoID={repoID}
                isSelected={selectedFiles ? selectedFiles.includes(fileId) : false}
                file={file}
                tagsData={tagsData}
                onSelectFile={onSelectFile}
                reSelectFiles={reSelectFiles}
                openImagePreview={openImagePreview}
              />);
          })}
        </FixedWidthTable>
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
