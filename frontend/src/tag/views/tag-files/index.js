import React, { useCallback, useState } from 'react';
import { useTagView } from '../../hooks';
import { gettext } from '../../../utils/constants';
import TagFile from './tag-file';
import { getRecordIdFromRecord } from '../../../metadata/utils/cell';
import EmptyTip from '../../../components/empty-tip';

import './index.css';

const TagFiles = () => {
  const { tagFiles, repoID } = useTagView();
  const [selectedFiles, setSelectedFiles] = useState(null);

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

  if (tagFiles.rows.length === 0) {
    return (<EmptyTip text={gettext('No files')} />);
  }

  const isSelectedAll = selectedFiles && selectedFiles.length === tagFiles.rows.length;

  return (
    <div className="table-container">
      <table className="table-hover">
        <thead onMouseDown={onThreadMouseDown} onContextMenu={onThreadContextMenu}>
          <tr>
            <th width="3%" className="pl10">
              <input
                type="checkbox"
                className="vam"
                onChange={onSelectedAll}
                checked={isSelectedAll}
                title={isSelectedAll ? gettext('Unselect all') : gettext('Select all')}
                disabled={tagFiles.rows.length === 0}
              />
            </th>
            <th width="3%" className="pl10">{/* icon */}</th>
            <th width="45%"><a className="d-block table-sort-op" href="#">{gettext('Name')}</a></th>
            <th width="18%">{/* operation */}</th>
            <th width="6%">{/* tag */}</th>
            <th width="11%"><a className="d-block table-sort-op" href="#">{gettext('Size')}</a></th>
            <th width="15%"><a className="d-block table-sort-op" href="#">{gettext('Last Update')}</a></th>
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
              />);
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TagFiles;
