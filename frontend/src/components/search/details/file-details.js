import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import DetailItem from '../../dirent-detail/detail-item';
import Collapse from '../../dirent-detail/dirent-details/file-details/collapse';
import Formatter from '../../../metadata/components/formatter';
import { CellType, IMAGE_PRIVATE_COLUMN_KEYS, PRIVATE_COLUMN_KEY } from '../../../metadata/constants';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import { getCellValueByColumn, getDateDisplayString, decimalToExposureTime, getFileNameFromRecord } from '../../../metadata/utils/cell';
import { CAPTURE_INFO_SHOW_KEY } from '../../../constants';
import People from '../../dirent-detail/people';
import { checkIsDir } from '../../../metadata/utils/row';
import { FOLDER_NOT_DISPLAY_COLUMN_KEYS } from '../../../metadata/components/metadata-details/constants';
import Location from '../../../metadata/components/metadata-details/location';
import CellFormatter from '../../../metadata/components/cell-formatter';
import DetailEditor from '../../../metadata/components/detail-editor';

const getImageInfoName = (key) => {
  switch (key) {
    case 'Dimensions':
      return gettext('Dimensions');
    case 'Device make':
      return gettext('Device make');
    case 'Device model':
      return gettext('Device model');
    case 'Color space':
      return gettext('Color space');
    case 'Capture time':
      return gettext('Capture time');
    case 'Focal length':
      return gettext('Focal length');
    case 'F number':
      return gettext('F number');
    case 'Exposure time':
      return gettext('Exposure time');
    default:
      return key;
  }
};

const getImageInfoValue = (key, value) => {
  if (!value) return value;
  switch (key) {
    case 'Dimensions':
      return value.replace('x', ' x ');
    case 'Capture time':
      return getDateDisplayString(value, 'YYYY-MM-DD HH:mm:ss');
    case 'Focal length':
      return value.replace('mm', ' ' + gettext('mm'));
    case 'Exposure time':
      return decimalToExposureTime(value) + ' ' + gettext('s');
    default:
      return value;
  }
};

const FileDetails = ({ repoID, repoInfo, dirent, direntDetail, enableMetadata, enableFaceRecognition, record, columns, displayColumns, tagsData, modifyColumnData, onChange, updateFileTags }) => {
  const [isCaptureInfoShow, setCaptureInfoShow] = useState(false);

  const sizeField = useMemo(() => ({ type: 'size', name: gettext('Size') }), []);
  const lastModifierField = useMemo(() => ({ type: CellType.LAST_MODIFIER, name: gettext('Last modifier') }), []);
  const lastModifiedTimeField = useMemo(() => ({ type: CellType.MTIME, name: gettext('Last modified time') }), []);

  useEffect(() => {
    const savedValue = window.localStorage.getItem(CAPTURE_INFO_SHOW_KEY) === 'true';
    setCaptureInfoShow(savedValue);
  }, []);

  if (!dirent || !direntDetail) return null;

  const fileName = getFileNameFromRecord(record);
  const isDir = checkIsDir(record);
  const dom = (
    <>
      <DetailItem field={sizeField} className="sf-metadata-property-detail-formatter">
        <Formatter field={sizeField} value={Utils.bytesToSize(direntDetail.size)} />
      </DetailItem>
      <DetailItem field={lastModifierField} className="sf-metadata-property-detail-formatter">
        <Formatter
          field={lastModifierField}
          value={direntDetail.last_modifier_email}
          collaborators={[{
            name: direntDetail.last_modifier_name,
            contact_email: direntDetail.last_modifier_contact_email,
            email: direntDetail.last_modifier_email,
            avatar_url: direntDetail.last_modifier_avatar,
          }]}
        />
      </DetailItem >
      <DetailItem field={lastModifiedTimeField} className="sf-metadata-property-detail-formatter">
        <Formatter field={lastModifiedTimeField} value={direntDetail.last_modified}/>
      </DetailItem>
      {enableMetadata && displayColumns.map(field => {
        if (isDir && FOLDER_NOT_DISPLAY_COLUMN_KEYS.includes(field.key)) return null;
        const value = getCellValueByColumn(record, field);

        if (field.key === PRIVATE_COLUMN_KEY.LOCATION && Utils.imageCheck(fileName) && value) {
          return <Location key={field.key} position={value} record={record} />;
        }

        const isImageOrVideo = Utils.imageCheck(fileName) || Utils.videoCheck(fileName);
        const canModifyRecord = repoInfo.permission !== 'admin' && repoInfo.permission !== 'rw' ? false : true;
        let canEdit = canModifyRecord && field.key !== PRIVATE_COLUMN_KEY.TAGS && field.editable;
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
                tagsData={tagsData}
              />
            }
          </DetailItem>
        );
      })}
    </>
  );

  if (Utils.imageCheck(dirent.name) || Utils.videoCheck(dirent.name)) {
    const fileDetails = getCellValueByColumn(record, { key: PRIVATE_COLUMN_KEY.FILE_DETAILS });
    const fileDetailsJson = JSON.parse(fileDetails?.slice(9, -7) || '{}');

    return (
      <>
        {enableMetadata && enableFaceRecognition && <People repoID={repoID} record={record} />}
        <Collapse title={gettext('General information')}>
          {dom}
        </Collapse>
        {Object.keys(fileDetailsJson).length > 0 && (
          <Collapse title={gettext('Capture information')} isShow={isCaptureInfoShow}>
            {Object.entries(fileDetailsJson).map(item => {
              return (
                <div className="dirent-detail-item sf-metadata-property-detail-capture-information-item" key={item[0]}>
                  <div className="dirent-detail-item-name">{getImageInfoName(item[0])}</div>
                  <div className="dirent-detail-item-value" placeholder={gettext('Empty')}>{getImageInfoValue(item[0], item[1])}</div>
                </div>
              );
            })}
          </Collapse>
        )}
      </>
    );
  }

  return (
    <>
      {dom}
    </>
  );
};

FileDetails.propTypes = {
  repoID: PropTypes.string,
  repoInfo: PropTypes.object,
  dirent: PropTypes.object,
  direntDetail: PropTypes.object,
  enableMetadata: PropTypes.bool,
  enableFaceRecognition: PropTypes.bool,
  record: PropTypes.object,
  columns: PropTypes.array,
  displayColumns: PropTypes.array,
  tagsData: PropTypes.array,
  modifyColumnData: PropTypes.func,
  onChange: PropTypes.func,
  updateFileTags: PropTypes.func,
};

export default FileDetails;
