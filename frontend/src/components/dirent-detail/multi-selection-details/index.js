import React, { useCallback, useMemo, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Detail, Header, Body } from '../detail';
import { Utils } from '../../../utils/utils';
import { gettext, siteRoot, thumbnailSizeForGrid } from '../../../utils/constants';
import DetailItem from '../detail-item';
import { CellType, PRIVATE_COLUMN_KEY } from '../../../metadata/constants';
import { useMetadataStatus } from '../../../hooks';
import RateEditor from '../../../metadata/components/detail-editor/rate-editor';
import metadataAPI from '../../../metadata/api';
import Loading from '../../loading';
import { getColumnDisplayName } from '../../../metadata/utils/column';
import DirentsTagsEditor from './dirents-tags-editor';
import { getCellValueByColumn, getFileObjIdFromRecord, getRecordIdFromRecord } from '../../../metadata/utils/cell';

import './index.css';

const MultiSelectionDetails = ({
  repoID,
  path,
  selectedDirents,
  currentRepoInfo,
  modifyLocalFileTags,
  onClose
}) => {
  const { enableMetadata, enableTags, globalHiddenColumns } = useMetadataStatus();
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fileCount = useMemo(() => selectedDirents.filter(dirent => dirent.type === 'file').length, [selectedDirents]);
  const folderCount = useMemo(() => selectedDirents.filter(dirent => dirent.type === 'dir').length, [selectedDirents]);
  const isRateHidden = useMemo(() => globalHiddenColumns.includes(PRIVATE_COLUMN_KEY.FILE_RATE), [globalHiddenColumns]);

  const onlyFiles = folderCount === 0;
  const hasFiles = fileCount > 0;

  const { imageDirents, fileDirents } = useMemo(() => ({
    imageDirents: selectedDirents.filter(dirent =>
      dirent.type === 'file' && Utils.imageCheck(dirent.name)
    ),
    fileDirents: selectedDirents.filter(dirent => dirent.type === 'file')
  }), [selectedDirents]);

  const { rateField, tagField } = useMemo(() => {
    const rateColumn = { key: PRIVATE_COLUMN_KEY.FILE_RATE, type: CellType.RATE, name: getColumnDisplayName(PRIVATE_COLUMN_KEY.FILE_RATE) };
    const tagColumn = { key: PRIVATE_COLUMN_KEY.TAGS, type: CellType.TAGS, name: getColumnDisplayName(PRIVATE_COLUMN_KEY.TAGS) };

    return {
      rateField: {
        ...rateColumn,
        name: getColumnDisplayName(rateColumn.key)
      },
      tagField: {
        ...tagColumn,
        name: getColumnDisplayName(tagColumn.key),
        type: CellType.TAGS
      }
    };
  }, []);

  const getRecords = useCallback(() => {
    if (!enableMetadata || !onlyFiles || !hasFiles) return;

    setIsLoading(true);
    const files = fileDirents.map(dirent => {
      return {
        parent_dir: path,
        file_name: dirent.name
      };
    });
    metadataAPI.getRecords(repoID, files)
      .then(res => {
        const { results } = res.data;
        const orderedRecords = fileDirents.map(dirent => {
          return results.find(record => {
            const recordPath = record[PRIVATE_COLUMN_KEY.PARENT_DIR] || '';
            const recordName = record[PRIVATE_COLUMN_KEY.FILE_NAME] || '';
            return recordPath === path && recordName === dirent.name;
          });
        }).filter(Boolean);

        setRecords(orderedRecords);
        setIsLoading(false);
      })
      .catch (err => {
        setRecords([]);
        setIsLoading(false);
      });
  }, [enableMetadata, onlyFiles, hasFiles, fileDirents, repoID, path]);

  const onChange = useCallback((key, value) => {
    const newRecords = records.map(record => ({
      ...record,
      [key]: value
    }));
    setRecords(newRecords);

    if (key === PRIVATE_COLUMN_KEY.TAGS) return;

    const recordsData = records.map(record => ({
      record_id: getRecordIdFromRecord(record),
      record: { [key]: value },
      obj_id: getFileObjIdFromRecord(record),
    }));
    metadataAPI.modifyRecords(repoID, recordsData);
  }, [repoID, records]);

  useEffect(() => {
    getRecords();
  }, [getRecords]);

  const rate = useMemo(() => {
    if (!records || records.length === 0) return null;

    return getCellValueByColumn(records[0], rateField);
  }, [records, rateField]);

  const getThumbnailSrc = (dirent) => {
    if (dirent.type === 'dir' || (dirent.type === 'file' && !Utils.imageCheck(dirent.name))) {
      return Utils.getDirentIcon(dirent, true);
    }

    if (dirent.type !== 'file' || !Utils.imageCheck(dirent.name)) {
      return null;
    }

    return currentRepoInfo.encrypted
      ? `${siteRoot}repo/${repoID}/raw${Utils.encodePath(`${path === '/' ? '' : path}/${dirent.name}`)}`
      : `${siteRoot}thumbnail/${repoID}/${thumbnailSizeForGrid}${Utils.encodePath(`${path === '/' ? '' : path}/${dirent.name}`)}`;
  };

  const renderOverlappingThumbnails = () => {
    const maxOverlayThumbnails = 6;
    const angles = [-15, 8, -8, 12, -10, 6];

    const renderOverlayItem = (dirent, index, isBackgroundMode = false) => {
      const src = getThumbnailSrc(dirent);
      const className = `overlay-thumbnail large${!isBackgroundMode ? ' no-background-item' : ''}`;

      return (
        <div
          key={dirent.name}
          className={className}
          style={{
            zIndex: 10 + index,
            transform: `rotate(${angles[index] || 0}deg)`,
          }}
        >
          <img
            src={src}
            alt={dirent.name}
            onError={(e) => {
              e.target.style.display = 'none';
              const iconContainer = e.target.parentNode.querySelector('.fallback-icon');
              if (iconContainer) iconContainer.style.display = 'flex';
            }}
          />
        </div>
      );
    };

    if (imageDirents.length === 0) {
      const overlayItems = selectedDirents.slice(0, maxOverlayThumbnails);

      return (
        <div className="multi-selection-thumbnails no-background">
          {overlayItems.map((dirent, index) => renderOverlayItem(dirent, index, false))}
        </div>
      );
    }

    // With background image mode
    const backgroundImage = imageDirents[0];
    const overlayItems = selectedDirents
      .filter(dirent => dirent.name !== backgroundImage.name)
      .slice(-maxOverlayThumbnails);
    const backgroundSrc = getThumbnailSrc(backgroundImage);

    return (
      <div className="multi-selection-thumbnails with-background">
        <div className="background-thumbnail">
          <img
            src={backgroundSrc}
            alt={backgroundImage.name}
          />
          <div className="background-overlay"></div>
        </div>
        {overlayItems.map((dirent, index) => renderOverlayItem(dirent, index, true))}
      </div>
    );
  };

  return (
    <Detail className="multi-selection-details">
      <Header
        title={gettext('Details')}
        icon=''
        onClose={onClose}
      />
      <Body>
        {renderOverlappingThumbnails()}

        <div className="detail-content">
          <p className="text-center">{gettext(`${selectedDirents.length} items have been selected`)}</p>

          {isLoading && (
            <div className="text-center py-4">
              <Loading />
              <p className="text-muted mt-2">{gettext('Loading metadata...')}</p>
            </div>
          )}

          {!isLoading && onlyFiles && hasFiles && enableTags && (
            <DetailItem field={tagField} readonly={false} className="sf-metadata-property-detail-editor sf-metadata-tags-property-detail-editor">
              <DirentsTagsEditor
                records={records}
                field={tagField}
                onChange={onChange}
                repoID={repoID}
                modifyLocalFileTags={modifyLocalFileTags}
              />
            </DetailItem>
          )}
          {!isLoading && onlyFiles && hasFiles && enableMetadata && !isRateHidden && (
            <DetailItem field={rateField} className="sf-metadata-property-detail-editor sf-metadata-rate-property-detail-editor">
              <RateEditor
                value={rate}
                field={rateField}
                onChange={(value) => onChange(PRIVATE_COLUMN_KEY.FILE_RATE, value)}
              />
            </DetailItem>
          )}
        </div>
      </Body>
    </Detail>
  );
};

MultiSelectionDetails.propTypes = {
  repoID: PropTypes.string.isRequired,
  path: PropTypes.string.isRequired,
  selectedDirents: PropTypes.array.isRequired,
  currentRepoInfo: PropTypes.object.isRequired,
  modifyLocalFileTags: PropTypes.func,
  onClose: PropTypes.func.isRequired,
};

export default MultiSelectionDetails;
