import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { v4 as uuidV4 } from 'uuid';
import { Formatter } from '@seafile/sf-metadata-ui-component';
import classnames from 'classnames';
import { getDirentPath } from '../utils';
import DetailItem from '../../detail-item';
import { CellType, PRIVATE_COLUMN_KEY } from '../../../../metadata/constants';
import { gettext } from '../../../../utils/constants';
import EditFileTagPopover from '../../../popover/edit-filetag-popover';
import FileTagList from '../../../file-tag-list';
import { Utils } from '../../../../utils/utils';
import { MetadataDetails, useMetadataDetails } from '../../../../metadata';
import ObjectUtils from '../../../../metadata/utils/object-utils';
import { getCellValueByColumn, getDateDisplayString, decimalToExposureTime } from '../../../../metadata/utils/cell';
import Collapse from './collapse';
import { useMetadataStatus } from '../../../../hooks';
import { CAPTURE_INFO_SHOW_KEY } from '../../../../constants';

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

const FileDetails = React.memo(({ repoID, dirent, path, direntDetail, onFileTagChanged, repoTags, fileTagList }) => {
  const [isEditFileTagShow, setEditFileTagShow] = useState(false);
  const [isCaptureInfoShow, setCaptureInfoShow] = useState(false);
  const { enableMetadataManagement, enableMetadata } = useMetadataStatus();
  const { record } = useMetadataDetails();

  const direntPath = useMemo(() => getDirentPath(dirent, path), [dirent, path]);
  const tagListTitleID = useMemo(() => `detail-list-view-tags-${uuidV4()}`, []);
  const sizeField = useMemo(() => ({ type: 'size', name: gettext('Size') }), []);
  const lastModifierField = useMemo(() => ({ type: CellType.LAST_MODIFIER, name: gettext('Last modifier') }), []);
  const lastModifiedTimeField = useMemo(() => ({ type: CellType.MTIME, name: gettext('Last modified time') }), []);
  const tagsField = useMemo(() => ({ type: CellType.SINGLE_SELECT, name: gettext('Tags') }), []);

  useEffect(() => {
    const savedValue = window.sfMetadataContext.localStorage.getItem(CAPTURE_INFO_SHOW_KEY) || false;
    setCaptureInfoShow(savedValue);
  }, []);

  const onEditFileTagToggle = useCallback(() => {
    setEditFileTagShow(!isEditFileTagShow);
  }, [isEditFileTagShow]);

  const fileTagChanged = useCallback(() => {
    onFileTagChanged(dirent, direntPath);
  }, [dirent, direntPath, onFileTagChanged]);

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
      {window.app.pageOptions.enableFileTags && !enableMetadata && (
        <DetailItem field={tagsField} className="sf-metadata-property-detail-formatter">
          <div
            className={classnames('sf-metadata-property-detail-tags', { 'tags-empty': !Array.isArray(fileTagList) || fileTagList.length === 0 })}
            id={tagListTitleID}
            onClick={onEditFileTagToggle}
          >
            {Array.isArray(fileTagList) && fileTagList.length > 0 ? (
              <FileTagList fileTagList={fileTagList} />
            ) : (
              <span className="empty-tip-text">{gettext('Empty')}</span>
            )}
          </div>
        </DetailItem>
      )}
      {enableMetadataManagement && enableMetadata && (
        <MetadataDetails
          repoID={repoID}
        />
      )}
    </>
  );

  let component = dom;
  if (Utils.imageCheck(dirent.name) || Utils.videoCheck(dirent.name)) {
    const fileDetails = getCellValueByColumn(record, { key: PRIVATE_COLUMN_KEY.FILE_DETAILS });
    const fileDetailsJson = JSON.parse(fileDetails?.slice(9, -7) || '{}');

    component = (
      <>
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
      {component}
      {isEditFileTagShow &&
        <EditFileTagPopover
          repoID={repoID}
          repoTags={repoTags}
          filePath={direntPath}
          fileTagList={fileTagList}
          toggleCancel={onEditFileTagToggle}
          onFileTagChanged={fileTagChanged}
          target={tagListTitleID}
        />
      }
    </>
  );
}, (props, nextProps) => {
  const { repoID, repoInfo, dirent, path, direntDetail, repoTags, fileTagList } = props;
  const isChanged = (
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
  repoID: PropTypes.string,
  repoInfo: PropTypes.object,
  dirent: PropTypes.object,
  path: PropTypes.string,
  direntDetail: PropTypes.object,
  onFileTagChanged: PropTypes.func,
};

export default FileDetails;
