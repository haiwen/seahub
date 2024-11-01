import React, { useCallback, useMemo, useRef, useState } from 'react';
import { siteRoot, gettext, thumbnailSizeForOriginal, thumbnailDefaultSize } from '../../../utils/constants';
import { useMetadataView } from '../../hooks/metadata-view';
import Peoples from './peoples';
import Faces from './faces';

import './index.css';


// name: photo.file_name,
// url: `${siteRoot}lib/${repoID}/file${path}`,
// default_url: `${siteRoot}thumbnail/${repoID}/${thumbnailDefaultSize}${path}`,
// src: `${siteRoot}thumbnail/${repoID}/${thumbnailDefaultSize}${path}`,
// thumbnail: `${siteRoot}thumbnail/${repoID}/${thumbnailSizeForOriginal}${path}`,

const FaceRecognition = () => {
  const [showPeopleFaces, setShowPeopleFaces] = useState(false);
  const peopleRef = useRef(null);

  const { metadata, store } = useMetadataView();

  const peoples = useMemo(() => {
    if (!Array.isArray(metadata.rows) || metadata.rows.length === 0) return [];
    return metadata.rows;
  }, [metadata]);

  const openPeople = useCallback((people) => {
    peopleRef.current = people;
    setShowPeopleFaces(true);
  }, []);

  const closePeople = useCallback(() => {
    peopleRef.current = null;
    setShowPeopleFaces(false);
  }, []);

  const onRename = useCallback((id, newName, oldName) => {
    store.renamePeopleName(id, newName, oldName);
  }, [store]);

  return (
    <div className="sf-metadata-container">
      {showPeopleFaces ? (
        <Faces people={peopleRef.current} onClose={closePeople} />
      ) : (
        <Peoples peoples={peoples} onRename={onRename} onOpenPeople={openPeople} />
      )}
    </div>
  );
};

export default FaceRecognition;
