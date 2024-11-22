import React, { useCallback, useMemo, useState } from 'react';

import classnames from 'classnames';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { gettext, siteRoot, thumbnailDefaultSize } from '../../../../utils/constants';
import { getParentDirFromRecord, getRecordIdFromRecord, getFileNameFromRecord, getFileSizedFromRecord,
  getFileMTimeFromRecord, getTagsFromRecord,
} from '../../../../metadata/utils/cell';
import { Utils } from '../../../../utils/utils';
import FileTagsFormatter from '../../../../metadata/components/cell-formatter/file-tags-formatter';

import './index.css';

dayjs.extend(relativeTime);

const TagFile = ({ isSelected, repoID, file, onSelectFile }) => {
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

  return (
    <tr
      className={classnames({
        'tr-highlight': highlight,
        'tr-active': isSelected
      })}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <td className="pl10">
        <input
          type="checkbox"
          className="vam"
          onClick={handleSelected}
          onChange={() => {}}
          checked={isSelected}
          aria-label={isSelected ? gettext('Unselect this item') : gettext('Select this item')}
        />
      </td>
      <td className="pl10">
        <div className="dir-icon">
          <img src={displayIcon} onError={onIconLoadError} className="thumbnail cursor-pointer" alt="" />
        </div>
      </td>
      <td className="name">
        {name}
      </td>
      <td className="operation"></td>
      <td className="tag-list-title">
        <FileTagsFormatter value={tags} />
      </td>
      <td className="file-size">{size || ''}</td>
      <td className="last-update" title={mtimeTip}>{mtimeRelative}</td>
    </tr>
  );

};

export default TagFile;
