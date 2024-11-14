import React, { useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import Formatter from '../formatter';
import { FILE_TYPE } from '../../../../../constants';
import { useMetadataView } from '../../../../../hooks/metadata-view';
import { Utils } from '../../../../../../utils/utils';
import { geRecordIdFromRecord, getCellValueByColumn, getFileNameFromRecord, getParentDirFromRecord, isValidCellValue } from '../../../../../utils/cell';

import './index.css';

const Card = ({
  readonly,
  displayEmptyValue,
  displayColumnName,
  record,
  titleColumn,
  displayColumns,
  onCloseSettings,
  onOpenFile,
}) => {
  const cardRef = useRef(null);

  const { updateCurrentDirent, showDirentDetail } = useMetadataView();

  const titleValue = getCellValueByColumn(record, titleColumn);

  const handleClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const name = getFileNameFromRecord(record);
    const path = getParentDirFromRecord(record);
    updateCurrentDirent({
      type: 'file',
      name,
      path,
      file_tags: []
    });
    onCloseSettings();
    showDirentDetail();
  }, [record, updateCurrentDirent, showDirentDetail, onCloseSettings]);

  const getFileType = useCallback((fileName) => {
    if (!fileName) return '';
    const index = fileName.lastIndexOf('.');
    if (index === -1) return '';
    const suffix = fileName.slice(index).toLowerCase();
    if (suffix.indexOf(' ') > -1) return '';
    if (Utils.imageCheck(fileName)) return FILE_TYPE.IMAGE;
    if (Utils.isMarkdownFile(fileName)) return FILE_TYPE.MARKDOWN;
    if (Utils.isSdocFile(fileName)) return FILE_TYPE.SDOC;
    return '';
  }, []);

  const handleClickFilename = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    const fileName = getFileNameFromRecord(record);
    const fileType = getFileType(fileName);
    const parentDir = getParentDirFromRecord(record);
    const recordId = geRecordIdFromRecord(record);
    onOpenFile(fileType, fileName, parentDir, recordId);
  }, [record, getFileType, onOpenFile]);

  useEffect(() => {
    const cardElement = cardRef.current;
    if (!cardElement) return;

    const filenameElement = cardElement.querySelector('.file-name-formatter .sf-metadata-file-name');
    if (filenameElement) {
      filenameElement.addEventListener('click', handleClickFilename);
    }

    return () => {
      if (filenameElement) {
        filenameElement.removeEventListener('click', handleClickFilename);
      }
    };
  }, [handleClickFilename]);

  return (
    <article
      ref={cardRef}
      data-id={record._id}
      className={classnames('sf-metadata-kanban-card', { 'readonly': readonly })}
      onClick={handleClick}
    >
      {titleColumn && (
        <div className="sf-metadata-kanban-card-header">
          <Formatter value={titleValue} column={titleColumn} record={record}/>
        </div>
      )}
      <div className="sf-metadata-kanban-card-body">
        {displayColumns.map((column, index) => {
          const value = getCellValueByColumn(record, column);
          if (!displayEmptyValue && !isValidCellValue(value)) {
            if (displayColumnName) {
              return (
                <div className="sf-metadata-kanban-card-record" key={column.key}>
                  <div className="sf-metadata-kanban-card-record-name">{column.name}</div>
                </div>
              );
            }
            return null;
          }

          return (
            <div className="sf-metadata-kanban-card-record" key={column.key}>
              {displayColumnName && (<div className="sf-metadata-kanban-card-record-name">{column.name}</div>)}
              <Formatter value={value} column={column} record={record}/>
            </div>
          );
        })}
      </div>
    </article>
  );
};

Card.propTypes = {
  readonly: PropTypes.bool,
  displayEmptyValue: PropTypes.bool,
  displayColumnName: PropTypes.bool,
  record: PropTypes.object,
  titleColumn: PropTypes.object,
  displayColumns: PropTypes.array,
  onCloseSettings: PropTypes.func.isRequired,
  onOpenFile: PropTypes.func.isRequired,
};

export default Card;
