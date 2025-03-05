import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { v4 as uuidV4 } from 'uuid';
import classnames from 'classnames';
import { getDirentPath } from '../utils';
import { gettext } from '../../../../utils/constants';
import EditFileTagPopover from '../../../popover/edit-filetag-popover';
import FileTagList from '../../../file-tag-list';

const FileTag = ({ repoID, dirent, path, repoTags, fileTagList, onFileTagChanged }) => {
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

FileTag.propTypes = {
  repoID: PropTypes.string,
  dirent: PropTypes.object,
  path: PropTypes.string,
  direntDetail: PropTypes.object,
  repoTags: PropTypes.array,
  fileTagList: PropTypes.array,
  onFileTagChanged: PropTypes.func,
};

export default FileTag;
