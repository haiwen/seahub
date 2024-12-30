import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMetadataView } from '../../hooks/metadata-view';
import Peoples from './peoples';
import PeoplePhotos from './person-photos';
import { gettext } from '../../../utils/constants';
import { PRIVATE_FILE_TYPE } from '../../../constants';

import './index.css';

const FaceRecognition = () => {
  const [showPeopleFaces, setShowPeopleFaces] = useState(false);
  const peopleRef = useRef(null);

  const { metadata, store, updateCurrentDirent, path, onUpdatePath } = useMetadataView();

  const peoples = useMemo(() => {
    if (!Array.isArray(metadata.rows) || metadata.rows.length === 0) return [];
    return metadata.rows;
  }, [metadata]);

  const onDeletePeoplePhotos = useCallback((peopleId, peoplePhotos) => {
    store.deletePeoplePhotos(peopleId, peoplePhotos);
  }, [store]);

  const onRemovePeoplePhotos = useCallback((peopleId, peoplePhotos, { success_callback }) => {
    store.removePeoplePhotos(peopleId, peoplePhotos, { success_callback });
  }, [store]);

  const updatePathWithPeopleName = (path, name) => {
    let pathParts = path.split('/');
    const index = pathParts.indexOf(PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES);
    if (index !== -1) {
      pathParts = name ? pathParts.slice(0, index + 2).concat(name) : pathParts.slice(0, index + 2);
    }
    return pathParts.join('/');
  };

  const openPeople = useCallback((people) => {
    peopleRef.current = people;
    setShowPeopleFaces(true);

    const name = people._is_someone ? (people._name || gettext('Person image')) : gettext('Unknown people');
    const newPath = updatePathWithPeopleName(path, name);
    onUpdatePath(newPath);
  }, [path, onUpdatePath]);

  const closePeople = useCallback(() => {
    peopleRef.current = null;
    setShowPeopleFaces(false);
    updateCurrentDirent();

    const newPath = updatePathWithPeopleName(path, '');
    onUpdatePath(newPath);
  }, [path, updateCurrentDirent, onUpdatePath]);

  const onRename = useCallback((id, newName, oldName) => {
    store.renamePeopleName(id, newName, oldName);
  }, [store]);

  useEffect(() => {
    const newPath = updatePathWithPeopleName(path, '');
    onUpdatePath(newPath);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="sf-metadata-container">
      {showPeopleFaces ? (
        <PeoplePhotos
          people={peopleRef.current}
          view={metadata.view}
          onClose={closePeople}
          onDeletePeoplePhotos={onDeletePeoplePhotos}
          onRemovePeoplePhotos={onRemovePeoplePhotos}
        />
      ) : (
        <Peoples peoples={peoples} onRename={onRename} onOpenPeople={openPeople} />
      )}
    </div>
  );
};

export default FaceRecognition;
