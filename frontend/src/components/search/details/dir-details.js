import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import DetailItem from '../../dirent-detail/detail-item';
import Formatter from '../../../metadata/components/formatter';
import { CellType, IMAGE_PRIVATE_COLUMN_KEYS, PRIVATE_COLUMN_KEY } from '../../../metadata/constants';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import { SYSTEM_FOLDERS } from '../../../constants';
import { getCellValueByColumn, getFileNameFromRecord } from '../../../metadata/utils/cell';
import { checkIsDir } from '../../../metadata/utils/row';
import { FOLDER_NOT_DISPLAY_COLUMN_KEYS } from '../../../metadata/components/metadata-details/constants';
import Location from '../../../metadata/components/metadata-details/location';
import CellFormatter from '../../../metadata/components/cell-formatter';
import DetailEditor from '../../../metadata/components/detail-editor';

const DirDetails = ({ repoInfo, direntDetail, enableMetadata, record, columns, displayColumns, tagsData, modifyColumnData, onChange, updateFileTags }) => {
  const lastModifiedTimeField = useMemo(() => {
    return { type: CellType.MTIME, name: gettext('Last modified time') };
  }, []);

  const sizeField = useMemo(() => ({ type: 'size', name: gettext('Size') }), []);
  const filesField = useMemo(() => ({ type: CellType.NUMBER, name: gettext('Files') }), []);

  if (!direntDetail) return null;

  const file_count = direntDetail.file_count || 0;
  const size = Utils.bytesToSize(direntDetail.size);
  let special_folder = false;
  if (direntDetail.path !== undefined) {
    const path = direntDetail.path;
    special_folder = SYSTEM_FOLDERS.some(prefix => path === prefix || path.startsWith(prefix + '/'));
  }
  const fileName = getFileNameFromRecord(record);
  const isDir = checkIsDir(record);

  return (
    <>
      {enableMetadata && record && (
        <>
          <DetailItem field={filesField} value={file_count} className="sf-metadata-property-detail-formatter">
            {special_folder ?
              <Formatter field={CellType.TEXT} value={'--'} /> :
              <Formatter field={filesField} value={file_count} />}
          </DetailItem>
          <DetailItem field={sizeField} value={size} className="sf-metadata-property-detail-formatter">
            {special_folder ?
              <Formatter field={CellType.TEXT} value={'--'} /> :
              <Formatter field={sizeField} value={size} />}
          </DetailItem>
          {displayColumns.map(field => {
            if (isDir && FOLDER_NOT_DISPLAY_COLUMN_KEYS.includes(field.key)) return null;
            const value = getCellValueByColumn(record, field);

            if (field.key === PRIVATE_COLUMN_KEY.LOCATION && Utils.imageCheck(fileName) && value) {
              return <Location key={field.key} position={value} record={record} />;
            }

            const isImageOrVideo = Utils.imageCheck(fileName) || Utils.videoCheck(fileName);
            const canModifyRecord = repoInfo.permission !== 'admin' && repoInfo.permission !== 'rw' ? false : true;
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
                    tagsData={tagsData}
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
                    tagsData={tagsData}
                  />
                }
              </DetailItem>
            );
          })}
        </>
      )}
      <DetailItem field={lastModifiedTimeField} className="sf-metadata-property-detail-formatter">
        <Formatter field={lastModifiedTimeField} value={direntDetail.mtime} />
      </DetailItem>
    </>
  );
};

DirDetails.propTypes = {
  direntDetail: PropTypes.object,
  enableMetadata: PropTypes.bool,
  record: PropTypes.object,
  displayColumns: PropTypes.array,
};

export default DirDetails;
