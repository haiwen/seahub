import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import Collaborator from './collaborator';
import { isValidEmail } from '../../utils/validate/email';

const CreatorFormatter = ({ value, mediaUrl, className, api, collaborators = [], collaboratorsCache = {}, updateCollaboratorsCache, children: emptyFormatter }) => {
  const [collaborator, setCollaborator] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (!value) {
      isMounted && setCollaborator(null);
      return () => isMounted = false;
    }

    let collaborator = collaborators && collaborators.find(c => c.email === value);
    if (collaborator) {
      isMounted && setCollaborator(collaborator);
      return () => isMounted = false;
    }

    const defaultAvatarUrl = `${mediaUrl}/avatars/default.png`;
    if (value === 'anonymous') {
      collaborator = {
        name: 'anonymous',
        avatar_url: defaultAvatarUrl,
      };
      isMounted && setCollaborator(collaborator);
      return () => isMounted = false;
    }

    collaborator = collaboratorsCache[value];
    if (collaborator) {
      isMounted && setCollaborator(collaborator);
      return () => isMounted = false;
    }

    if (!isValidEmail(value)) {
      collaborator = {
        email: value,
        name: value,
        avatar_url: defaultAvatarUrl,
      };
      // Only update cache if not already present to avoid infinite loops
      if (!collaboratorsCache[value]) {
        updateCollaboratorsCache && updateCollaboratorsCache(collaborator);
      }
      isMounted && setCollaborator(collaborator);
      return () => isMounted = false;
    }

    api && api(value, (userMap) => {
      collaborator = userMap[value];
      Object.values(userMap).forEach(user => {
        // Only update cache if not already present to avoid infinite loops
        if (!collaboratorsCache[user.email]) {
          updateCollaboratorsCache && updateCollaboratorsCache(user);
        }
      });
      isMounted && setCollaborator(collaborator);
    });
    return () => isMounted = false;
  }, [value, mediaUrl, collaborators, collaboratorsCache, updateCollaboratorsCache, api]);

  if (!collaborator) return emptyFormatter || null;
  return (
    <div className={classnames('sf-metadata-ui cell-formatter-container creator-formatter', className)}>
      <Collaborator collaborator={collaborator} />
    </div>
  );
};

CreatorFormatter.propTypes = {
  value: PropTypes.string,
  className: PropTypes.string,
  children: PropTypes.any,
};

export default CreatorFormatter;
