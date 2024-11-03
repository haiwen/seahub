import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Input } from 'reactstrap';
import classNames from 'classnames';
import isHotkey from 'is-hotkey';
import { gettext, siteRoot, thumbnailDefaultSize } from '../../../../../utils/constants';
import OpMenu from './op-menu';
import { isEnter } from '../../../../utils/hotkey';
import { Utils } from '../../../../../utils/utils';
import { getFileNameFromRecord, getParentDirFromRecord } from '../../../../utils/cell';

import './index.css';

const People = ({ haveFreezed, people, onOpenPeople, onRename, onFreezed, onUnFreezed }) => {

  const similarPhotoURL = useMemo(() => {
    const similarPhoto = people._similar_photo;
    if (!similarPhoto) return '';
    const repoID = window.sfMetadataContext.getSetting('repoID');
    const fileName = getFileNameFromRecord(similarPhoto);
    const parentDir = getParentDirFromRecord(similarPhoto);
    const path = Utils.encodePath(Utils.joinPath(parentDir, fileName));
    return `${siteRoot}thumbnail/${repoID}/${thumbnailDefaultSize}${path}`;
  }, [people._similar_photo]);

  const photosCount = useMemo(() => {
    return Array.isArray(people._photo_links) ? people._photo_links.length : 0;
  }, [people._photo_links]);

  const [name, setName] = useState(people._name || gettext('Person image'));
  const [renaming, setRenaming] = useState(false);
  const [active, setActive] = useState(false);
  const readonly = !window.sfMetadataContext.canModify();

  const onMouseEnter = useCallback(() => {
    if (haveFreezed) return;
    setActive(true);
  }, [haveFreezed]);

  const onMouseLeave = useCallback(() => {
    if (haveFreezed) return;
    setActive(false);
  }, [haveFreezed]);

  const setRenamingState = useCallback(() => {
    onFreezed();
    setRenaming(true);
  }, [onFreezed]);

  const onBlur = useCallback(() => {
    if (!name) return;
    setRenaming(false);
    if (name !== (people._name || gettext('Person image'))) {
      onUnFreezed();
      onRename(people._id, name, people._name);
    }
  }, [people, name, onRename, onUnFreezed]);

  const onChange = useCallback((event) => {
    const value = event.target.value;
    if (value === name) return;
    setName(value);
  }, [name]);

  const onKeyDown = useCallback((event) => {
    if (isEnter(event)) {
      onBlur();
      return;
    } else if (isHotkey('esc', event)) {
      setName(people.name);
      setRenaming(false);
      return;
    }
  }, [people, onBlur]);

  const _onUnFreezed = useCallback(() => {
    onUnFreezed();
    setActive(false);
  }, [onUnFreezed]);

  return (
    <div
      className={classNames('sf-metadata-people-info px-3 d-flex justify-content-between align-items-center', {
        'readonly': readonly,
      })}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onDoubleClick={haveFreezed ? () => {} : () => onOpenPeople(people)}
    >
      <div className="sf-metadata-people-info-img mr-2">
        <img src={similarPhotoURL} alt={name} height={36} width={36} />
      </div>
      <div className="sf-metadata-people-info-name-count">
        <div className="sf-metadata-people-info-name">
          {renaming ? (
            <Input className="sf-metadata-people-info-renaming" autoFocus value={name} onChange={onChange} onBlur={onBlur} onKeyDown={onKeyDown} />
          ) : (
            <div className="sf-metadata-people-info-name-display">{name}</div>
          )}
        </div>
        <div className="sf-metadata-people-info-count">
          {photosCount + ' ' + gettext('items')}
        </div>
      </div>
      {!readonly && people._is_someone && (
        <div className="sf-metadata-people-info-op">
          {active && (
            <OpMenu onRename={setRenamingState} onFreezed={onFreezed} onUnFreezed={_onUnFreezed} />
          )}
        </div>
      )}
    </div>
  );
};

People.propTypes = {
  haveFreezed: PropTypes.bool,
  people: PropTypes.object.isRequired,
  onOpenPeople: PropTypes.func,
  onFreezed: PropTypes.func,
  onUnFreezed: PropTypes.func,
};

export default People;
