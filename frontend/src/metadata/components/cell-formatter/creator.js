import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import Collaborator from './collaborator';
import { isValidEmail } from '../../utils/validate/email';
import { mediaUrl } from '../../../utils/constants';

const CreatorFormatter = React.memo(({ value, className, api, collaborators = [], collaboratorsCache = {}, updateCollaboratorsCache, children: emptyFormatter }) => {
  const [collaborator, setCollaborator] = useState(null);
  const processedValuesRef = useRef(new Set());

  useEffect(() => {
    let isMounted = true;
    if (!value) {
      isMounted && setCollaborator(null);
      return () => isMounted = false;
    }

    if (processedValuesRef.current.has(value)) {
      return;
    }

    let collaborator = collaborators && collaborators.find(c => c.email === value);
    if (collaborator) {
      isMounted && setCollaborator(prev => prev === collaborator ? prev : collaborator);
      processedValuesRef.current.add(value);
      return () => isMounted = false;
    }

    const defaultAvatarUrl = `${mediaUrl}/avatars/default.png`;
    if (value === 'anonymous') {
      collaborator = {
        name: 'anonymous',
        avatar_url: defaultAvatarUrl,
      };
      isMounted && setCollaborator(prev => prev === collaborator ? prev : collaborator);
      processedValuesRef.current.add(value);
      return () => isMounted = false;
    }

    collaborator = collaboratorsCache[value];
    if (collaborator) {
      isMounted && setCollaborator(prev => prev === collaborator ? prev : collaborator);
      processedValuesRef.current.add(value);
      return () => isMounted = false;
    }

    if (!isValidEmail(value)) {
      collaborator = {
        email: value,
        name: value,
        avatar_url: defaultAvatarUrl,
      };
      isMounted && setCollaborator(prev => prev === collaborator ? prev : collaborator);
      processedValuesRef.current.add(value);
      return () => isMounted = false;
    }

    api && api(value, (userMap) => {
      collaborator = userMap[value];
      isMounted && setCollaborator(prev => prev === collaborator ? prev : collaborator);
      processedValuesRef.current.add(value);
    });
    return () => isMounted = false;
  }, [value, collaborators, collaboratorsCache, api]);

  if (!collaborator) return emptyFormatter || null;
  return (
    <div className={classnames('sf-metadata-ui cell-formatter-container creator-formatter', className)}>
      <Collaborator collaborator={collaborator} />
    </div>
  );
});

CreatorFormatter.propTypes = {
  value: PropTypes.string,
  className: PropTypes.string,
  children: PropTypes.any,
};

export default CreatorFormatter;
