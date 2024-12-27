import React, { useMemo } from 'react';
import CellFormatter from '../cell-formatter';
import DetailEditor from '../detail-editor';
import DetailItem from '../../../components/dirent-detail/detail-item';
import { Utils } from '../../../utils/utils';
import { getCellValueByColumn, getFileNameFromRecord } from '../../utils/cell';
import { gettext } from '../../../utils/constants';
import { PRIVATE_COLUMN_KEY } from '../../constants';
import Location from './location';
import { useMetadataDetails } from '../../hooks';
import { checkIsDir } from '../../utils/row';
import AI from './ai';
import Settings from './settings';

import './index.css';

const MetadataDetails = () => {
  const { isLoading, canModifyRecord, record, columns, onChange, modifyColumnData, updateFileTags } = useMetadataDetails();

  const displayColumns = useMemo(() => columns.filter(c => c.shown), [columns]);

  if (isLoading) return null;
  if (!record) return null;
  if (!record._id) return null;

  const fileName = getFileNameFromRecord(record);
  const isImage = record && (Utils.imageCheck(fileName) || Utils.videoCheck(fileName));
  const isDir = record && checkIsDir(record);

  return (
    <>
      {displayColumns.map(field => {
        if (field.key === PRIVATE_COLUMN_KEY.LOCATION && isImage) {
          return (<Location key={field.key} position={getCellValueByColumn(record, field)} />);
        }

        let canEdit = canModifyRecord && field.editable;
        if (!isImage && canEdit && field.key === PRIVATE_COLUMN_KEY.CAPTURE_TIME) {
          canEdit = false;
        } else if (field.key === PRIVATE_COLUMN_KEY.LOCATION && !isImage) {
          canEdit = false;
        } else if (field.key === PRIVATE_COLUMN_KEY.TAGS && isDir) {
          canEdit = false;
        }

        const value = getCellValueByColumn(record, field);
        return (
          <DetailItem key={field.key} field={field} readonly={!canEdit}>
            {canEdit ? (
              <DetailEditor
                field={field}
                value={value}
                fields={columns}
                record={record}
                modifyColumnData={modifyColumnData}
                onChange={onChange}
                updateFileTags={updateFileTags}
              />
            ) : (
              <CellFormatter readonly={true} field={field} value={value} emptyTip={gettext('Empty')} className="sf-metadata-property-detail-formatter" />
            )}
          </DetailItem>
        );
      })}
    </>
  );
};

export default MetadataDetails;
export {
  AI,
  Settings,
};
