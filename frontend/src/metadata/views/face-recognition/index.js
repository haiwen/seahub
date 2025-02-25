import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMetadataView } from '../../hooks/metadata-view';
import Peoples from './peoples';
import PeoplePhotos from './person-photos';
import { gettext } from '../../../utils/constants';
import { PRIVATE_FILE_TYPE } from '../../../constants';
import { FACE_RECOGNITION_VIEW_ID } from '../../constants';

import './index.css';

const FaceRecognition = () => {
  const [showPeopleFaces, setShowPeopleFaces] = useState(false);
  const peopleRef = useRef(null);

  const { metadata, store, updateCurrentDirent, updateCurrentPath } = useMetadataView();

  const peoples = useMemo(() => {
    if (!Array.isArray(metadata.rows) || metadata.rows.length === 0) return [];
    return metadata.rows;
  }, [metadata]);

  const onDeletePeoplePhotos = useCallback((peopleId, peoplePhotos) => {
    store.deletePeoplePhotos(peopleId, peoplePhotos);
  }, [store]);

  const onAddPeoplePhotos = useCallback((peopleId, oldPeopleId, peoplePhotos, { success_callback, fail_callback }) => {
    store.addPeoplePhotos(peopleId, oldPeopleId, peoplePhotos, { success_callback, fail_callback });
  }, [store]);

  const onRemovePeoplePhotos = useCallback((peopleId, peoplePhotos, { success_callback }) => {
    store.removePeoplePhotos(peopleId, peoplePhotos, { success_callback });
  }, [store]);

  const onSetPeoplePhoto = useCallback((peopleId, peoplePhoto, { success_callback }) => {
    store.setPeoplePhoto(peopleId, peoplePhoto, { success_callback });
  }, [store]);

  const openPeople = useCallback((people) => {
    peopleRef.current = people;
    const name = people._is_someone ? (people._name || gettext('Person image')) : gettext('Unknown people');
    updateCurrentPath(`/${PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES}/${FACE_RECOGNITION_VIEW_ID}/${name}`);
    setShowPeopleFaces(true);
  }, [updateCurrentPath]);

  const closePeople = useCallback(() => {
    peopleRef.current = null;
    setShowPeopleFaces(false);
    updateCurrentDirent();
    updateCurrentPath(`/${PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES}/${FACE_RECOGNITION_VIEW_ID}`);
  }, [updateCurrentDirent, updateCurrentPath]);

  const onRename = useCallback((id, newName, oldName) => {
    store.renamePeopleName(id, newName, oldName);
  }, [store]);

  useEffect(() => {
    updateCurrentPath(`/${PRIVATE_FILE_TYPE.FILE_EXTENDED_PROPERTIES}/${FACE_RECOGNITION_VIEW_ID}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="sf-metadata-container">
      {showPeopleFaces ? (
        <PeoplePhotos
          people={peopleRef.current}
          view={metadata.view}
          onClose={closePeople}
          onAddPeoplePhotos={onAddPeoplePhotos}
          onRemovePeoplePhotos={onRemovePeoplePhotos}
          onDeletePeoplePhotos={onDeletePeoplePhotos}
          onSetPeoplePhoto={onSetPeoplePhoto}
        />
      ) : (
        <Peoples peoples={peoples} onRename={onRename} onOpenPeople={openPeople} />
      )}
    </div>
  );
};

export default FaceRecognition;
