import React, { useCallback, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import Formatter from './formatter';
import {
  getCellValueByColumn,
  isValidCellValue,
  getParentDirFromRecord, getFileMTimeFromRecord
} from '../../../../utils/cell';
import { Utils } from '../../../../../utils/utils';
import { checkIsDir } from '../../../../utils/row';
import { siteRoot, thumbnailSizeForOriginal } from '../../../../../utils/constants';

import './index.css';

const CardItem = ({
  isSelected,
  record,
  tagsData,
  fileNameColumn,
  mtimeColumn,
  modifierColumn,
  displayColumns,
  displayEmptyValue,
  displayColumnName,
  onOpenFile,
  onSelectCard,
  onContextMenu,
}) => {
  const imgRef = useRef(null);

  const fileNameValue = getCellValueByColumn(record, fileNameColumn);
  const mtimeValue = getCellValueByColumn(record, mtimeColumn);
  const modifierValue = getCellValueByColumn(record, modifierColumn);

  // for the big image
  const parentDir = useMemo(() => getParentDirFromRecord(record), [record]);
  const isDir = useMemo(() => checkIsDir(record), [record]);
  const imageURLs = useMemo(() => {
    if (isDir) {
      const iconURL = Utils.getFolderIconUrl();
      return { URL: iconURL, iconURL: iconURL };
    }
    const value = fileNameValue;
    const fileIconURL = Utils.getFileIconUrl(value);
    if (Utils.imageCheck(value) ||
      Utils.pdfCheck(value) ||
      Utils.videoCheck(value)) {
      const path = Utils.encodePath(Utils.joinPath(parentDir, value));
      const repoID = window.sfMetadataStore.repoId;
      const thumbnailURL = `${siteRoot}thumbnail/${repoID}/${thumbnailSizeForOriginal}${path}?mtime=${getFileMTimeFromRecord(record)}`;
      return { URL: thumbnailURL, iconURL: fileIconURL };
    }
    return { URL: fileIconURL, iconURL: fileIconURL };
  }, [isDir, fileNameValue, parentDir, record]);

  const onLoadError = useCallback(() => {
    imgRef.current.src = imageURLs.iconURL;
  }, [imageURLs]);

  const handleClickCard = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    onSelectCard(record);
  }, [record, onSelectCard]);

  const handleFilenameClick = useCallback((event) => {
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();
    const canPreview = window.sfMetadataContext.canPreview();
    if (!canPreview) return;
    onOpenFile(record);
  }, [record, onOpenFile]);

  return (
    <article
      data-id={record._id}
      className={classnames('sf-metadata-card-item', { 'selected': isSelected })}
      onClick={handleClickCard}
      onContextMenu={onContextMenu}
    >
      <div className="sf-metadata-card-item-image-container d-flex justify-content-center align-items-center">
        <img className="mw-100 mh-100" ref={imgRef} src={imageURLs.URL} onError={onLoadError} alt="" />
      </div>
      <div className="sf-metadata-card-item-text-container">
        <Formatter value={fileNameValue} column={fileNameColumn} record={record} onFileNameClick={handleFilenameClick} tagsData={tagsData} />
        <div className="sf-metadata-card-last-modified-info">
          <Formatter value={modifierValue} column={modifierColumn} record={record} tagsData={tagsData} />
          <Formatter value={mtimeValue} format="relativeTime" column={mtimeColumn} record={record} tagsData={tagsData} />
        </div>
        {displayColumns.map((column) => {
          const value = getCellValueByColumn(record, column);
          if (!displayEmptyValue && !isValidCellValue(value)) {
            if (displayColumnName) {
              return (
                <div className="sf-metadata-card-item-field" key={column.key}>
                  <span className="sf-metadata-card-item-field-name">{column.name}</span>
                </div>
              );
            }
            return null;
          }

          return (
            <div className="sf-metadata-card-item-field" key={column.key}>
              {displayColumnName && (
                <span className="sf-metadata-card-item-field-name">{column.name}</span>
              )}
              <Formatter value={value} column={column} record={record} tagsData={tagsData} />
            </div>
          );
        })}
      </div>
    </article>
  );
};

CardItem.propTypes = {
  isSelected: PropTypes.bool,
  record: PropTypes.object,
  tagsData: PropTypes.object,
  fileNameColumn: PropTypes.object,
  mtimeColumn: PropTypes.object,
  modifierColumn: PropTypes.object,
  displayColumns: PropTypes.array,
  displayEmptyValue: PropTypes.bool,
  displayColumnName: PropTypes.bool,
  onOpenFile: PropTypes.func.isRequired,
  onSelectCard: PropTypes.func.isRequired,
  onContextMenu: PropTypes.func.isRequired,
};

export default CardItem;
