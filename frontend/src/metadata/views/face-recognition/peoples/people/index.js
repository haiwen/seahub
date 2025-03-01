import React, { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { gettext, mediaUrl, siteRoot, thumbnailDefaultSize } from '../../../../../utils/constants';
import OpMenu from './op-menu';
import Rename from '../../../../../components/rename';

import './index.css';

const People = ({ haveFreezed, people, onOpenPeople, onRename, onFreezed, onUnFreezed }) => {
  const [defaultURL, setDefaultURL] = useState('');

  const similarPhotoURL = useMemo(() => {
    const repoID = window.sfMetadataContext.getSetting('repoID');
    let photoURL = `${siteRoot}thumbnail/${repoID}/${thumbnailDefaultSize}/_Internal/Faces/${people._id}.jpg`;
    if (people._name === '_Unknown_people') {
      return photoURL;
    }
    return `${photoURL}?t=${people.file_mtime}`;
  }, [people]);

  const onImgLoadError = useCallback(() => {
    setDefaultURL(`${mediaUrl}avatars/default.png`);
  }, []);

  const photosCount = useMemo(() => {
    return Array.isArray(people._photo_links) ? people._photo_links.length : 0;
  }, [people._photo_links]);

  const name = useMemo(() => people._is_someone ? (people._name || gettext('Person image')) : gettext('Unknown people'), [people]);

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

  const onRenameConfirm = useCallback((newName) => {
    if (newName !== name) {
      onUnFreezed();
      onRename(people._id, newName, name);
    }
    setRenaming(false);
  }, [people, name, onRename, onUnFreezed]);

  const onRenameCancel = useCallback(() => {
    onUnFreezed();
    setRenaming(false);
  }, [onUnFreezed]);

  const handelUnFreezed = useCallback((keepActive) => {
    onUnFreezed();
    !keepActive && setActive(false);
  }, [onUnFreezed]);

  const handelClick = useCallback(() => {
    if (renaming) return;
    setTimeout(() => onOpenPeople(people), 1);
  }, [renaming, people, onOpenPeople]);

  return (
    <div
      className={classNames('sf-metadata-people-info px-3 d-flex justify-content-between align-items-center', {
        'readonly': readonly,
      })}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={handelClick}
    >
      <div className="sf-metadata-people-info-img">
        <img src={defaultURL || similarPhotoURL} alt={name} onError={onImgLoadError} height={60} width={60} />
      </div>
      <div className={classNames('sf-metadata-people-info-name-count', { 'o-hidden': !renaming })}>
        <div className="sf-metadata-people-info-name">
          {renaming ? (
            <Rename name={name} onRenameConfirm={onRenameConfirm} onRenameCancel={onRenameCancel} />
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
          {active && !renaming && (
            <OpMenu onRename={setRenamingState} onFreezed={onFreezed} onUnFreezed={handelUnFreezed} />
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
