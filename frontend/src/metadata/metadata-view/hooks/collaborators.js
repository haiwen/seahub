/* eslint-disable react/prop-types */
import React, { useContext, useState, useRef, useCallback } from 'react';

const CollaboratorsContext = React.createContext(null);

export const CollaboratorsProvider = ({
  collaborators,
  collaboratorsCache: propsCollaboratorsCache,
  updateCollaboratorsCache: propsUpdateCollaboratorsCache,
  children,
}) => {
  const collaboratorsCacheRef = useRef(propsCollaboratorsCache || {});
  const [collaboratorsCache, setCollaboratorsCache] = useState(propsCollaboratorsCache || {});

  const updateCollaboratorsCache = useCallback((user) => {
    const newCollaboratorsCache = { ...collaboratorsCacheRef.current, [user.email]: user };
    collaboratorsCacheRef.current = newCollaboratorsCache;
    setCollaboratorsCache(newCollaboratorsCache);
    propsUpdateCollaboratorsCache && propsUpdateCollaboratorsCache(user);
  }, [propsUpdateCollaboratorsCache]);

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
