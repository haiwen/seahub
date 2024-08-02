import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { v4 as uuidV4 } from 'uuid';
import { getDirentPath, getDirentPosition } from './utils';
import DetailItem from '../detail-item';
import { CellType } from '../../../metadata/metadata-view/_basic';
import { gettext } from '../../../utils/constants';
import EditMetadata from './edit-metadata';
import EditFileTagPopover from '../../popover/edit-filetag-popover';
import FileTagList from '../../file-tag-list';
import { Utils } from '../../../utils/utils';

const FileDetails = ({ repoID, repoInfo, dirent, direntType, path, direntDetail, onFileTagChanged, repoTags, fileTagList }) => {
  const [isEditFileTagShow, setEditFileTagShow] = useState(false);

  const position = useMemo(() => getDirentPosition(repoInfo, dirent, path), [repoInfo, dirent, path]);
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
      <DetailItem field={{ type: CellType.TEXT, name: gettext('File location') }} value={position} />
      <DetailItem field={{ type: 'size', name: gettext('Size') }} value={Utils.bytesToSize(direntDetail.size)} />
      <DetailItem field={{ type: CellType.CREATOR, name: gettext('Creator') }} value={direntDetail.last_modifier_email} collaborators={[{
        name: direntDetail.last_modifier_name,
        contact_email: direntDetail.last_modifier_contact_email,
        email: direntDetail.last_modifier_email,
        avatar_url: direntDetail.last_modifier_avatar,
      }]} />
      <DetailItem field={{ type: CellType.MTIME, name: gettext('Last modified time') }} value={direntDetail.last_modified} />
      <DetailItem field={{ type: CellType.SINGLE_SELECT, name: gettext('Tags') }} valueId={tagListTitleID} valueClick={onEditFileTagToggle} >
        {Array.isArray(fileTagList) && fileTagList.length > 0 ? (
          <FileTagList fileTagList={fileTagList} />
        ) : (
          <span className="empty-tip-text">{gettext('Empty')}</span>
        )}
      </DetailItem>
      {direntDetail.permission === 'rw' && window.app.pageOptions.enableMetadataManagement && (
        <EditMetadata repoID={repoID} direntPath={direntPath} direntType={direntType} direntDetail={direntDetail} />
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
};

FileDetails.propTypes = {
  repoID: PropTypes.string,
  repoInfo: PropTypes.object,
  dirent: PropTypes.object,
  direntType: PropTypes.string,
  path: PropTypes.string,
  direntDetail: PropTypes.object,
  onFileTagChanged: PropTypes.func,
};

export default FileDetails;
