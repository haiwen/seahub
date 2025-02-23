import React, { useMemo, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { gettext, mediaUrl, siteRoot, thumbnailDefaultSize, } from '../../../../utils/constants';

const People = ({ people }) => {
  const name = useMemo(() => people._name || gettext('Person image'), [people]);
  const [defaultURL, setDefaultURL] = useState('');

  const similarPhotoURL = useMemo(() => {
    const repoID = window.sfMetadataContext.getSetting('repoID');
    return `${siteRoot}thumbnail/${repoID}/${thumbnailDefaultSize}/_Internal/Faces/${people._id}.jpg`;
  }, [people]);

  const onImgLoadError = useCallback(() => {
    setDefaultURL(`${mediaUrl}avatars/default.png`);
  }, []);

  return (
    <div className="sf-metadata-ui collaborator-item">
      <span className="collaborator-avatar">
        <img className="collaborator-avatar-icon" src={defaultURL || similarPhotoURL} alt={name} onError={onImgLoadError} />
      </span>
      <span className="collaborator-name">{name}</span>
    </div>
  );
};

People.propTypes = {
  people: PropTypes.object.isRequired,
};

export default People;
