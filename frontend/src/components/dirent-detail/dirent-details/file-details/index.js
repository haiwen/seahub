import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import DetailItem from '../../detail-item';
import Collapse from './collapse';
import Formatter from '../../../../metadata/components/formatter';
import { CellType, PRIVATE_COLUMN_KEY } from '../../../../metadata/constants';
import { gettext } from '../../../../utils/constants';
import { Utils } from '../../../../utils/utils';
import { MetadataDetails, useMetadataDetails } from '../../../../metadata';
import ObjectUtils from '../../../../utils/object';
import { getCellValueByColumn, getDateDisplayString, decimalToExposureTime } from '../../../../metadata/utils/cell';
import { useMetadataStatus } from '../../../../hooks';
import { CAPTURE_INFO_SHOW_KEY } from '../../../../constants';
import People from '../../people';
import FileTag from './file-tag';
import Description from './description';

import './index.css';

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

const FileDetails = React.memo(({ repoID, dirent, path, direntDetail, isShowRepoTags = true, repoTags, fileTagList, readOnly = false, tagsData, onFileTagChanged }) => {
  const [isCaptureInfoShow, setCaptureInfoShow] = useState(false);
  const { enableFaceRecognition, enableMetadata } = useMetadataStatus();
  const { record } = useMetadataDetails();

  const sizeField = useMemo(() => ({ type: 'size', name: gettext('Size') }), []);
  const lastModifierField = useMemo(() => ({ type: CellType.LAST_MODIFIER, name: gettext('Last modifier') }), []);
  const lastModifiedTimeField = useMemo(() => ({ type: CellType.MTIME, name: gettext('Last modified time') }), []);
  const tagsField = useMemo(() => ({ type: CellType.SINGLE_SELECT, name: gettext('Tags') }), []);

  useEffect(() => {
    const savedValue = window.localStorage.getItem(CAPTURE_INFO_SHOW_KEY) === 'true';
    setCaptureInfoShow(savedValue);
  }, []);

  const basicInfo = (
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
      {isShowRepoTags && window.app.pageOptions.enableFileTags && !enableMetadata && (
        <DetailItem field={tagsField} className="sf-metadata-property-detail-formatter">
          <FileTag
            repoID={repoID}
            dirent={dirent}
            path={path}
            repoTags={repoTags}
            fileTagList={fileTagList}
            onFileTagChanged={onFileTagChanged}
          />
        </DetailItem>
      )}
      {enableMetadata && <MetadataDetails readOnly={readOnly} tagsData={tagsData} />}
    </>
  );

  const renderGeneral = () => {
    return (
      <>
        {enableMetadata && <Description />}
        {basicInfo}
      </>
    );
  };

  const renderExtended = () => {
    const fileDetails = getCellValueByColumn(record, { key: PRIVATE_COLUMN_KEY.FILE_DETAILS });
    const fileDetailsJson = JSON.parse(fileDetails?.slice(9, -7) || '{}');
    return (
      <>
        {enableMetadata && enableFaceRecognition && <People repoID={repoID} record={record} />}
        {enableMetadata && <Description />}
        <Collapse title={gettext('General information')}>
          {basicInfo}
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
  };
  const isMedia = Utils.imageCheck(dirent.name) || Utils.videoCheck(dirent.name);
  return (
    <>
      {isMedia ? renderExtended() : renderGeneral()}
    </>
  );
}, (props, nextProps) => {
  const { repoID, repoInfo, dirent, path, direntDetail, isShowRepoTags, repoTags, fileTagList } = props;
  const isChanged = (
    isShowRepoTags !== nextProps.isShowRepoTags ||
    repoID !== nextProps.repoID ||
    path !== nextProps.path ||
    !ObjectUtils.isSameObject(repoInfo, nextProps.repoInfo) ||
    !ObjectUtils.isSameObject(dirent, nextProps.dirent) ||
    !ObjectUtils.isSameObject(direntDetail, nextProps.direntDetail) ||
    repoTags !== nextProps.repoTags ||
    fileTagList !== nextProps.fileTagList
  );
  return !isChanged;
});

FileDetails.propTypes = {
  isShowRepoTags: PropTypes.bool,
  repoID: PropTypes.string,
  repoInfo: PropTypes.object,
  dirent: PropTypes.object,
  path: PropTypes.string,
  direntDetail: PropTypes.object,
  repoTags: PropTypes.array,
  fileTagList: PropTypes.array,
  readOnly: PropTypes.bool,
  tagsData: PropTypes.object,
  onFileTagChanged: PropTypes.func,
};

export default FileDetails;
