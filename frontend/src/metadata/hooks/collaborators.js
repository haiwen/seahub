/* eslint-disable react/prop-types */
import React, { useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { UserService } from '../services';
import { mediaUrl } from '../../utils/constants';
import { isValidEmail } from '../utils/validate';
import User from '../model/user';
import metadataAPI from '../api';

const CollaboratorsContext = React.createContext(null);

export const CollaboratorsProvider = ({ repoID, children }) => {
  const [collaboratorsCache, setCollaboratorsCache] = useState({});
  const [collaborators, setCollaborators] = useState([]);
  const queryUser = useMemo(() => {
    const userService = new UserService({ mediaUrl, api: metadataAPI.listUserInfo });
    const queryUserAPI = userService.queryUser;
    window.queryUser = queryUserAPI;
    return queryUserAPI;
  }, []);

  useEffect(() => {
    metadataAPI.getCollaborators(repoID).then(res => {
      const collaborators = Array.isArray(res?.data?.user_list) ? res.data.user_list.map(user => new User(user)) : [];
      setCollaborators(collaborators);
    });
  }, [repoID]);

  useEffect(() => {
    if (!window.sfMetadata) {
      window.sfMetadata = {};
      window.sfMetadata.getCollaboratorsFromCache = () => {
        return Object.values(window.sfMetadata.collaboratorsCache || {}) || [];
      };
      window.sfMetadata.getCollaborators = () => {
        return [...window.sfMetadata.collaborators, ...(Object.values(window.sfMetadata.collaboratorsCache || {}) || [])];
      };
    }
    window.sfMetadata.collaborators = collaborators;
    window.sfMetadata.collaboratorsCache = collaboratorsCache;
  }, [collaborators, collaboratorsCache]);

  const updateCollaboratorsCache = useCallback((user) => {
    setCollaboratorsCache(prevCache => ({ ...prevCache, [user.email]: user }));
  }, []);

  const getCollaborator = useCallback((email) => {
    let collaborator = collaborators && collaborators.find(c => c.email === email);
    if (collaborator) return collaborator;
    const defaultAvatarUrl = `${mediaUrl}/avatars/default.png`;
    if (email === 'anonymous' || email === 'seafevents') {
      collaborator = {
        email,
        name: email,
        avatar_url: defaultAvatarUrl,
      };
      return collaborator;
    }
    collaborator = collaboratorsCache[email];
    if (collaborator) return collaborator;
    if (!isValidEmail(email)) {
      return {
        email: email,
        name: email,
        avatar_url: defaultAvatarUrl,
      };
    }
    return null;
  }, [collaborators, collaboratorsCache]);

  return (
    <CollaboratorsContext.Provider value={{ collaborators, collaboratorsCache, updateCollaboratorsCache, getCollaborator, queryUser }}>
      {children}
    </CollaboratorsContext.Provider>
  );
};

export const useCollaborators = () => {
  const context = useContext(CollaboratorsContext);
  if (!context) {
    throw new Error('\'CollaboratorsContext\' is null');
  }
  const { collaborators, collaboratorsCache, updateCollaboratorsCache, getCollaborator, queryUser } = context;
  return { collaborators, collaboratorsCache, updateCollaboratorsCache, getCollaborator, queryUser };
};
