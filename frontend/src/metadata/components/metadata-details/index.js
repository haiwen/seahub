import React, { useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import CellFormatter from '../cell-formatter';
import DetailEditor from '../detail-editor';
import DetailItem from '../../../components/dirent-detail/detail-item';
import { Utils } from '../../../utils/utils';
import { getCellValueByColumn, getFileNameFromRecord } from '../../utils/cell';
import { gettext } from '../../../utils/constants';
import { PRIVATE_COLUMN_KEY, IMAGE_PRIVATE_COLUMN_KEYS } from '../../constants';
import { useMetadataDetails } from '../../hooks';
import { checkIsDir } from '../../utils/row';
import { FOLDER_NOT_DISPLAY_COLUMN_KEYS } from './constants';

import './index.css';

const MetadataDetails = ({ onPositionChange }) => {
  const { isLoading, canModifyRecord, record, columns, onChange, modifyColumnData, updateFileTags } = useMetadataDetails();

  const displayColumns = useMemo(() => columns.filter(c => c.shown), [columns]);

  useEffect(() => {
    if (!record) return;
    const fileName = getFileNameFromRecord(record);
    const isImage = Utils.imageCheck(fileName);

    if (isImage) {
      const position = getCellValueByColumn(record, {
        key: PRIVATE_COLUMN_KEY.LOCATION
      });
      onPositionChange?.(position);
    }
  }, [record, onPositionChange]);

  if (isLoading || !record || !record._id) return null;

  const fileName = getFileNameFromRecord(record);
  const isImageOrVideo = Utils.imageCheck(fileName) || Utils.videoCheck(fileName);
  const isDir = checkIsDir(record);

  return (
    <>
      {displayColumns.map(field => {
        if (isDir && FOLDER_NOT_DISPLAY_COLUMN_KEYS.includes(field.key)) return null;
        const value = getCellValueByColumn(record, field);

        if (field.key === PRIVATE_COLUMN_KEY.LOCATION) return null;

        let canEdit = canModifyRecord && field.editable;
        if (!isImageOrVideo && IMAGE_PRIVATE_COLUMN_KEYS.includes(field.key)) {
          canEdit = false;
        } else if (field.key === PRIVATE_COLUMN_KEY.TAGS && isDir) {
          canEdit = false;
        }
        return (
          <DetailItem key={field.key} field={field} readonly={!canEdit}>
            {canEdit ?
              <DetailEditor
                field={field}
                value={value}
                fields={columns}
                record={record}
                modifyColumnData={modifyColumnData}
                onChange={onChange}
                updateFileTags={updateFileTags}
              />
              :
              <CellFormatter
                readonly={true}
                field={field}
                value={value}
                emptyTip={gettext('Empty')}
                className="sf-metadata-property-detail-formatter"
              />
            }
          </DetailItem>
        );
      })}
    </>
  );
};

MetadataDetails.propTypes = {
  onPositionChange: PropTypes.func,
};

export default MetadataDetails;
