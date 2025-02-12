import React, { useCallback, useState, useRef, useMemo } from 'react';
import { useTagView, useTags } from '../../hooks';
import { gettext } from '../../../utils/constants';
import TagFile from './tag-file';
import { getRecordIdFromRecord } from '../../../metadata/utils/cell';
import EmptyTip from '../../../components/empty-tip';
import ImagePreviewer from '../../../metadata/components/cell-formatter/image-previewer';
import FixedWidthTable from '../../../components/common/fixed-width-table';
import TagFilesContextMenu from './context-menu';
import { PRIVATE_COLUMN_KEY } from '../../constants';
import { getRowById } from '../../../metadata/utils/table';
import { getTagFilesLinks } from '../../utils/cell';

import './index.css';

const TagFiles = () => {
  const { tagID, tagFiles, repoID, repoInfo, moveTagFile, copyTagFile, addFolder, deleteTagFiles, renameFileCallback } = useTagView();
  const { tagsData, updateLocalTag } = useTags();
  const [selectedFileIds, setSelectedFileIds] = useState([]);
  const [isImagePreviewerVisible, setImagePreviewerVisible] = useState(false);

  const currentImageRef = useRef(null);

  const isSelectedAll = useMemo(() => {
    return selectedFileIds ? selectedFileIds.length === tagFiles.rows.length : false;
  }, [selectedFileIds, tagFiles]);

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
      setSelectedFileIds([]);
    } else {
      const allIds = tagFiles.rows.map(record => getRecordIdFromRecord(record));
      setSelectedFileIds(allIds);
    }
  }, [tagFiles, isSelectedAll]);

  const onContainerClick = (event) => {
    if (selectedFileIds.length > 0) setSelectedFileIds([]);
  };

  const onSelectFile = useCallback((event, fileId) => {
    if (event.button === 0) {
      let newSelectedFiles = selectedFileIds ? selectedFileIds.slice(0) : [];
      if (newSelectedFiles.includes(fileId)) {
        newSelectedFiles = newSelectedFiles.filter(item => item !== fileId);
      } else {
        newSelectedFiles.push(fileId);
      }
      if (newSelectedFiles.length > 0) {
        setSelectedFileIds(newSelectedFiles);
      } else {
        setSelectedFileIds([]);
      }
    } else if (event.button === 2) {
      if (selectedFileIds.length <= 1) {
        setSelectedFileIds([fileId]);
      }
    }
  }, [selectedFileIds]);

  const reSelectFiles = useCallback((fileIds) => {
    setSelectedFileIds(fileIds);
  }, []);

  const openImagePreview = useCallback((record) => {
    currentImageRef.current = record;
    setImagePreviewerVisible(true);
  }, []);

  const closeImagePreviewer = useCallback(() => {
    currentImageRef.current = null;
    setImagePreviewerVisible(false);
  }, []);

  const handleDeleteTagFiles = useCallback((paths, fileNames) => {
    const row = getRowById(tagsData, tagID);
    const oldTagFileLinks = getTagFilesLinks(row);
    const newTagFileLinks = oldTagFileLinks.filter(link => !selectedFileIds.includes(link.row_id));
    const update = { [PRIVATE_COLUMN_KEY.TAG_FILE_LINKS]: newTagFileLinks };
    updateLocalTag(tagID, update);
    deleteTagFiles && deleteTagFiles(paths, fileNames, selectedFileIds);
    setSelectedFileIds([]);
  }, [tagID, tagsData, selectedFileIds, deleteTagFiles, updateLocalTag]);

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
      <div className="table-container" onClick={onContainerClick}>
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
                isSelected={selectedFileIds ? selectedFileIds.includes(fileId) : false}
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
      <TagFilesContextMenu
        repoID={repoID}
        repoInfo={repoInfo}
        tagFiles={tagFiles}
        selectedFileIds={selectedFileIds}
        reSelectFiles={reSelectFiles}
        moveTagFile={moveTagFile}
        copyTagFile={copyTagFile}
        addFolder={addFolder}
        deleteTagFiles={handleDeleteTagFiles}
      />
    </>
  );
};

export default TagFiles;
