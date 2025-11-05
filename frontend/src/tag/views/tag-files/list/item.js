import { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import Rename from '../../../../components/rename';
import FileTagsFormatter from '../../../../metadata/components/cell-formatter/file-tags';
import { gettext, siteRoot, thumbnailDefaultSize } from '../../../../utils/constants';
import {
  getParentDirFromRecord, getRecordIdFromRecord, getFileNameFromRecord, getFileSizedFromRecord,
  getFileMTimeFromRecord, getTagsFromRecord, getFilePathByRecord,
} from '../../../../metadata/utils/cell';
import { Utils } from '../../../../utils/utils';
import { openFile } from '../../../../metadata/utils/file';
import { TAG_FILE_KEY } from '../../../constants/file';
import { formatWithTimezone } from '../../../../utils/time';

import './index.css';

dayjs.extend(relativeTime);

const TagFile = ({ repoID, file, tagsData, isRenaming, onRenameCancel, onRenameConfirm, selectedFileIds, onSelectFile, openImagePreview, onContextMenu }) => {
  const [highlight, setHighlight] = useState(false);
  const [isIconLoadError, setIconLoadError] = useState(false);

  const fileId = useMemo(() => getRecordIdFromRecord(file), [file]);
  const parentDir = useMemo(() => getParentDirFromRecord(file), [file]);
  const name = useMemo(() => getFileNameFromRecord(file), [file]);
  const size = useMemo(() => {
    const sizeBytes = getFileSizedFromRecord(file);
    return Utils.bytesToSize(sizeBytes);
  }, [file]);
  const mtime = useMemo(() => {
    const time = getFileMTimeFromRecord(file);
    if (time) return time;
    return '';
  }, [file]);
  const tags = useMemo(() => getTagsFromRecord(file), [file]);

  const mtimeTip = useMemo(() => mtime ? formatWithTimezone(mtime) : '', [mtime]);
  const mtimeRelative = useMemo(() => mtime ? dayjs(mtime).fromNow() : '', [mtime]);
  const path = useMemo(() => getFilePathByRecord(repoID, file), [repoID, file]);

  const displayIcons = useMemo(() => {
    const defaultIconUrl = Utils.getFileIconUrl(name);
    if (Utils.imageCheck(name)) {
      const path = Utils.encodePath(Utils.joinPath(parentDir, name));
      const thumbnail = `${siteRoot}thumbnail/${repoID}/${thumbnailDefaultSize}${path}?mtime=${getFileMTimeFromRecord(file)}`;
      return { iconUrl: thumbnail, defaultIconUrl };
    }
    return { iconUrl: defaultIconUrl, defaultIconUrl };
  }, [repoID, file, name, parentDir]);

  const displayIcon = useMemo(() => {
    if (!isIconLoadError) return displayIcons.iconUrl;
    return displayIcons.defaultIconUrl;
  }, [isIconLoadError, displayIcons]);

  const isSelected = useMemo(() => selectedFileIds ? selectedFileIds.includes(fileId) : false, [fileId, selectedFileIds]);

  const onMouseEnter = useCallback(() => {
    setHighlight(true);
  }, []);

  const onMouseLeave = useCallback(() => {
    setHighlight(false);
  }, []);

  const handleSelected = useCallback((event) => {
    event.stopPropagation();
    const newSelectedFileIds = selectedFileIds.includes(fileId)
      ? selectedFileIds.filter(id => id !== fileId)
      : [...selectedFileIds, fileId];
    onSelectFile(newSelectedFileIds);
  }, [fileId, selectedFileIds, onSelectFile]);

  const onIconLoadError = useCallback(() => {
    setIconLoadError(true);
  }, []);

  const handleClickFileName = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    const canPreview = window.sfTagsDataContext.canPreview();
    if (isRenaming || !canPreview) return;
    openFile(repoID, file, () => {
      openImagePreview(file);
    });
  }, [repoID, file, openImagePreview, isRenaming]);

  const handleClick = useCallback((event) => {
    event.stopPropagation();
    if (isRenaming) return;
    if (event.target.tagName === 'TD' && event.target.closest('td').querySelector('input[type="checkbox"]') === null) {
      onSelectFile([fileId]);
      return;
    }
    const newSelectedFileIds = selectedFileIds.includes(fileId)
      ? selectedFileIds.filter(id => id !== fileId)
      : [...selectedFileIds, fileId];
    onSelectFile(newSelectedFileIds);
  }, [fileId, selectedFileIds, isRenaming, onSelectFile]);

  const handleContextMenu = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    onContextMenu(event, file);
  }, [file, onContextMenu]);

  return (
    <tr
      tabIndex="0"
      className={classnames({
        'tr-highlight': highlight,
        'tr-active': isSelected
      })}
      onClick={handleClick}
      onKeyDown={Utils.onKeyDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onContextMenu={handleContextMenu}
    >
      <td className="pl10 pr-2" role="button" onClick={handleSelected} aria-label={isSelected ? gettext('Unselect this item') : gettext('Select this item')}>
        <input
          type="checkbox"
          className="vam cursor-pointer"
          style={{ position: 'relative', top: -1 }}
          checked={isSelected}
          aria-label={isSelected ? gettext('Unselect this item') : gettext('Select this item')}
          onChange={handleSelected}
          onKeyDown={Utils.onKeyDown}
        />
      </td>
      <td className="pl-2 pr-2">
        <div className="dir-icon" onDragStart={(e) => e.preventDefault()}>
          <img
            src={displayIcon}
            onError={onIconLoadError}
            className="thumbnail cursor-pointer"
            alt=""
            onClick={handleClickFileName}
            tabIndex="0"
            row="button"
            onKeyDown={Utils.onKeyDown}
          />
        </div>
      </td>
      <td className="name">
        {isRenaming ? (
          <Rename
            hasSuffix={true}
            name={file[TAG_FILE_KEY.NAME]}
            onRenameConfirm={onRenameConfirm}
            onRenameCancel={onRenameCancel}
          />
        ) : (
          <a href={path} onClick={handleClickFileName}>{name}</a>
        )}
      </td>
      <td className="tag-list-title">
        <FileTagsFormatter value={tags} tagsData={tagsData} className="sf-metadata-tags-formatter" />
      </td>
      <td className="operation"></td>
      <td className="file-size">{size || ''}</td>
      <td className="last-update" title={mtimeTip}>{mtimeRelative}</td>
    </tr>
  );

};

TagFile.propTypes = {
  repoID: PropTypes.string,
  tagsData: PropTypes.object,
  file: PropTypes.object,
  isRenaming: PropTypes.bool,
  onRenameCancel: PropTypes.func,
  onRenameConfirm: PropTypes.func,
  selectedFileIds: PropTypes.array,
  onSelectFile: PropTypes.func,
  openImagePreview: PropTypes.func,
  reSelectFiles: PropTypes.func,
};

export default TagFile;
