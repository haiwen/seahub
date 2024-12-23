import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useMetadataView } from '../../hooks/metadata-view';
import Peoples from './peoples';
import PeoplePhotos from './person-photos';

import './index.css';

const FaceRecognition = () => {
  const [showPeopleFaces, setShowPeopleFaces] = useState(false);
  const peopleRef = useRef(null);

  const { metadata, store, updateCurrentDirent } = useMetadataView();

  const peoples = useMemo(() => {
    if (!Array.isArray(metadata.rows) || metadata.rows.length === 0) return [];
    return metadata.rows;
  }, [metadata]);

  const onDeletePeoplePhotos = useCallback((peopleId, peoplePhotos) => {
    store.deletePeoplePhotos(peopleId, peoplePhotos);
  }, [store]);

  const onRemovePeoplePhotos = useCallback((peopleId, peoplePhotos, { success_callback }) => {
    //
    store.removePeoplePhotos(peopleId, peoplePhotos, { success_callback });
  }, [store]);

  const openPeople = useCallback((people) => {
    peopleRef.current = people;
    setShowPeopleFaces(true);
  }, []);

  const closePeople = useCallback(() => {
    peopleRef.current = null;
    setShowPeopleFaces(false);
    updateCurrentDirent();
  }, [updateCurrentDirent]);

  const onRename = useCallback((id, newName, oldName) => {
    store.renamePeopleName(id, newName, oldName);
  }, [store]);

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
