import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { v4 as uuidV4 } from 'uuid';
import { getDirentPath } from './utils';
import DetailItem from '../detail-item';
import { CellType } from '../../../metadata/metadata-view/_basic';
import { gettext } from '../../../utils/constants';
import EditFileTagPopover from '../../popover/edit-filetag-popover';
import FileTagList from '../../file-tag-list';
import { Utils } from '../../../utils/utils';
import { MetadataDetails } from '../../../metadata';
import ObjectUtils from '../../../metadata/metadata-view/utils/object-utils';

const FileDetails = React.memo(({ repoID, repoInfo, dirent, path, direntDetail, onFileTagChanged, repoTags, fileTagList, ...params }) => {
  const [isEditFileTagShow, setEditFileTagShow] = useState(false);

  const direntPath = useMemo(() => getDirentPath(dirent, path), [dirent, path]);
  const tagListTitleID = useMemo(() => `detail-list-view-tags-${uuidV4()}`, []);

  const onEditFileTagToggle = useCallback(() => {
    setEditFileTagShow(!isEditFileTagShow);
  }, [isEditFileTagShow]);

  const fileTagChanged = useCallback(() => {
    onFileTagChanged(dirent, direntPath);
  }, [dirent, direntPath, onFileTagChanged]);

  return (
    <>
      <DetailItem field={{ type: 'size', name: gettext('Size') }} value={Utils.bytesToSize(direntDetail.size)} />
      <DetailItem field={{ type: CellType.LAST_MODIFIER, name: gettext('Last modifier') }} value={direntDetail.last_modifier_email} collaborators={[{
        name: direntDetail.last_modifier_name,
        contact_email: direntDetail.last_modifier_contact_email,
        email: direntDetail.last_modifier_email,
        avatar_url: direntDetail.last_modifier_avatar,
      }]} />
      <DetailItem field={{ type: CellType.MTIME, name: gettext('Last modified time') }} value={direntDetail.last_modified} />
      {!window.app.pageOptions.enableMetadataManagement && (
        <DetailItem field={{ type: CellType.SINGLE_SELECT, name: gettext('Tags') }} valueId={tagListTitleID} valueClick={onEditFileTagToggle} >
          {Array.isArray(fileTagList) && fileTagList.length > 0 ? (
            <FileTagList fileTagList={fileTagList} />
          ) : (
            <span className="empty-tip-text">{gettext('Empty')}</span>
          )}
        </DetailItem>
      )}
      {window.app.pageOptions.enableMetadataManagement && (
        <MetadataDetails repoID={repoID} filePath={direntPath} direntType="file" { ...params } />
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
  const { repoID, repoInfo, dirent, path, direntDetail } = props;
  const isChanged = (
    repoID !== nextProps.repoID ||
    path !== nextProps.path ||
    !ObjectUtils.isSameObject(repoInfo, nextProps.repoInfo) ||
    !ObjectUtils.isSameObject(dirent, nextProps.dirent) ||
    !ObjectUtils.isSameObject(direntDetail, nextProps.direntDetail)
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
