import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { gettext, siteRoot, thumbnailDefaultSize } from '../../../../utils/constants';
import { getParentDirFromRecord, getRecordIdFromRecord, getFileNameFromRecord, getFileSizedFromRecord,
  getFileMTimeFromRecord, getTagsFromRecord, getFilePathByRecord,
} from '../../../../metadata/utils/cell';
import { Utils } from '../../../../utils/utils';
import FileTagsFormatter from '../../../../metadata/components/cell-formatter/file-tags-formatter';
import { openFile } from '../../../../metadata/utils/open-file';

import './index.css';

dayjs.extend(relativeTime);

const TagFile = ({ isSelected, repoID, file, onSelectFile, reSelectFiles, openImagePreview }) => {
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

  const mtimeTip = useMemo(() => mtime ? dayjs(mtime).format('dddd, MMMM D, YYYY h:mm:ss A') : '', [mtime]);
  const mtimeRelative = useMemo(() => mtime ? dayjs(mtime).fromNow() : '', [mtime]);
  const path = useMemo(() => getFilePathByRecord(repoID, file), [repoID, file]);

  const displayIcons = useMemo(() => {
    const defaultIconUrl = Utils.getFileIconUrl(name);
    if (Utils.imageCheck(name)) {
      const path = Utils.encodePath(Utils.joinPath(parentDir, name));
      const thumbnail = `${siteRoot}thumbnail/${repoID}/${thumbnailDefaultSize}${path}`;
      return { iconUrl: thumbnail, defaultIconUrl };
    }
    return { iconUrl: defaultIconUrl, defaultIconUrl };
  }, [repoID, name, parentDir]);

  const displayIcon = useMemo(() => {
    if (!isIconLoadError) return displayIcons.iconUrl;
    return displayIcons.defaultIconUrl;
  }, [isIconLoadError, displayIcons]);

  const onMouseEnter = useCallback(() => {
    setHighlight(true);
  }, []);

  const onMouseLeave = useCallback(() => {
    setHighlight(false);
  }, []);

  const handleSelected = useCallback((event) => {
    event.stopPropagation();
    onSelectFile(fileId);
  }, [fileId, onSelectFile]);

  const onIconLoadError = useCallback(() => {
    setIconLoadError(true);
  }, []);

  const handelClickFileName = useCallback((event) => {
    event.preventDefault();
    openFile(repoID, file, () => {
      openImagePreview(file);
    });
  }, [repoID, file, openImagePreview]);

  const handelClick = useCallback((event) => {
    if (event.target.tagName == 'TD') {
      reSelectFiles(fileId);
    }
  }, [fileId, reSelectFiles]);

  return (
    <tr
      className={classnames({
        'tr-highlight': highlight,
        'tr-active': isSelected
      })}
      onClick={handelClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <td className="pl10 pr-2">
        <input
          type="checkbox"
          className="vam"
          style={{ position: 'relative', top: -1 }}
          onClick={handleSelected}
          onChange={() => {}}
          checked={isSelected}
          aria-label={isSelected ? gettext('Unselect this item') : gettext('Select this item')}
        />
      </td>
      <td className="pl-2 pr-2">
        <div className="dir-icon">
          <img src={displayIcon} onError={onIconLoadError} className="thumbnail cursor-pointer" alt="" />
        </div>
      </td>
      <td className="name">
        <a href={path} onClick={handelClickFileName}>{name}</a>
      </td>
      <td className="tag-list-title">
        <FileTagsFormatter value={tags} />
      </td>
      <td className="operation"></td>
      <td className="file-size">{size || ''}</td>
      <td className="last-update" title={mtimeTip}>{mtimeRelative}</td>
    </tr>
  );

};

TagFile.propTypes = {
  isSelected: PropTypes.bool,
  repoID: PropTypes.string,
  file: PropTypes.object,
  onSelectFile: PropTypes.func,
  openImagePreview: PropTypes.func,
  reSelectFiles: PropTypes.func,
};

export default TagFile;
