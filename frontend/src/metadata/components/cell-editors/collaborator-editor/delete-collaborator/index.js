import React from 'react';
import PropTypes from 'prop-types';
import { useCollaborators } from '../../../../hooks';
import OpIcon from '@/components/op-icon';
import { gettext } from '@/utils/constants';

import './index.css';

const DeleteCollaborator = ({ value, onDelete, collaborators = [], removable = true, showRemoveTooltip = true }) => {
  const { getCollaborator: getCollaboratorFromContext } = useCollaborators();

  const getCollaborator = (email) => {
    return collaborators.find(collaborator => collaborator.email === email) || getCollaboratorFromContext(email);
  };

  return (
    <div className="sf-metadata-delete-collaborator">
      {Array.isArray(value) && value.map((email, idx) => {
        const collaborator = getCollaborator(email);
        if (!collaborator) return null;
        const { name, avatar_url } = collaborator;
        return (
          <div key={email} className="collaborator">
            <span className="collaborator-avatar-container">
              <img className="collaborator-avatar m-0" alt={name} src={avatar_url} />
            </span>
            <span className="collaborator-name text-truncate" title={name} aria-label={name}>{name}</span>
            {removable && (
              <OpIcon
                id={showRemoveTooltip ? `delete-collaborator-icon-${idx}` : undefined}
                className="collaborator-remove"
                symbol="md-close"
                tooltip={showRemoveTooltip ? gettext('Remove') : undefined}
                op={(e) => onDelete && onDelete(email, e)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

DeleteCollaborator.propTypes = {
  value: PropTypes.array.isRequired,
  onDelete: PropTypes.func,
  collaborators: PropTypes.array,
  removable: PropTypes.bool,
  showRemoveTooltip: PropTypes.bool,
};

export default DeleteCollaborator;
