import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { v4 as uuidV4 } from 'uuid';
import { Formatter } from '@seafile/sf-metadata-ui-component';
import classnames from 'classnames';
import { getDirentPath } from './utils';
import DetailItem from '../detail-item';
import { CellType } from '../../../metadata/metadata-view/_basic';
import { gettext } from '../../../utils/constants';
import EditFileTagPopover from '../../popover/edit-filetag-popover';
import FileTagList from '../../file-tag-list';
import { Utils } from '../../../utils/utils';
import { MetadataDetails, useMetadata } from '../../../metadata';
import ObjectUtils from '../../../metadata/metadata-view/utils/object-utils';

const FileDetails = React.memo(({ repoID, repoInfo, dirent, path, direntDetail, onFileTagChanged, repoTags, fileTagList }) => {
  const [isEditFileTagShow, setEditFileTagShow] = useState(false);
  const { enableMetadata } = useMetadata();

  const direntPath = useMemo(() => getDirentPath(dirent, path), [dirent, path]);
  const tagListTitleID = useMemo(() => `detail-list-view-tags-${uuidV4()}`, []);
  const sizeField = useMemo(() => ({ type: 'size', name: gettext('Size') }), []);
  const lastModifierField = useMemo(() => ({ type: CellType.LAST_MODIFIER, name: gettext('Last modifier') }), []);
  const lastModifiedTimeField = useMemo(() => ({ type: CellType.MTIME, name: gettext('Last modified time') }), []);
  const tagsField = useMemo(() => ({ type: CellType.SINGLE_SELECT, name: gettext('Tags') }), []);

  const onEditFileTagToggle = useCallback(() => {
    setEditFileTagShow(!isEditFileTagShow);
  }, [isEditFileTagShow]);

  const fileTagChanged = useCallback(() => {
    onFileTagChanged(dirent, direntPath);
  }, [dirent, direntPath, onFileTagChanged]);

  return (
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
      {window.app.pageOptions.enableMetadataManagement && enableMetadata && (
        <MetadataDetails repoID={repoID} filePath={direntPath} repoInfo={repoInfo} direntType="file" />
      )}
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
