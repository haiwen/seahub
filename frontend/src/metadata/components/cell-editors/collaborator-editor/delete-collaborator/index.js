import React from 'react';
import PropTypes from 'prop-types';
import IconBtn from '../../../../../components/icon-btn';
import { useCollaborators } from '../../../../hooks';

import './index.css';

const DeleteCollaborator = ({ value, onDelete }) => {
  const { getCollaborator } = useCollaborators();

  return (
    <div className="sf-metadata-delete-collaborator">
      {Array.isArray(value) && value.map(email => {
        const collaborator = getCollaborator(email);
        if (!collaborator) return null;
        const { name, avatar_url } = collaborator;
        return (
          <div key={email} className="collaborator">
            <span className="collaborator-avatar-container">
              <img className="collaborator-avatar m-0" alt={name} src={avatar_url} />
            </span>
            <span className="collaborator-name text-truncate" title={name} aria-label={name}>{name}</span>
            <IconBtn className="collaborator-remove" onClick={(event) => onDelete(email, event)} symbol="close" />
          </div>
        );
      })}
    </div>
  );
};

DeleteCollaborator.propTypes = {
  value: PropTypes.array.isRequired,
  onDelete: PropTypes.func.isRequired
};

export default DeleteCollaborator;
