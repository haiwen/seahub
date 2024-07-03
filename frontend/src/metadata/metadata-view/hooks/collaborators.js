/* eslint-disable react/prop-types */
import React, { useContext, useState, useRef, useCallback, useEffect } from 'react';
import { useMetadata } from './metadata';

const CollaboratorsContext = React.createContext(null);

export const CollaboratorsProvider = ({
  children,
}) => {
  const collaboratorsCacheRef = useRef({});
  const [collaboratorsCache, setCollaboratorsCache] = useState({});
  const [collaborators, setCollaborators ] = useState([]);

  const { store } = useMetadata();

  useEffect(() => {
    setCollaborators(store?.collaborators || []);
  }, [store?.collaborators]);

  const updateCollaboratorsCache = useCallback((user) => {
    const newCollaboratorsCache = { ...collaboratorsCacheRef.current, [user.email]: user };
    collaboratorsCacheRef.current = newCollaboratorsCache;
    setCollaboratorsCache(newCollaboratorsCache);
  }, []);

  return (
    <CollaboratorsContext.Provider value={{ collaborators, collaboratorsCache, updateCollaboratorsCache }}>
      {children}
    </CollaboratorsContext.Provider>
  );
};

export const useCollaborators = () => {
  const context = useContext(CollaboratorsContext);
  if (!context) {
    throw new Error('\'CollaboratorsContext\' is null');
  }
  const { collaborators, collaboratorsCache, updateCollaboratorsCache } = context;
  return { collaborators, collaboratorsCache, updateCollaboratorsCache };
};
