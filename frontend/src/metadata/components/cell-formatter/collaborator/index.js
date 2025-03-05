import React from 'react';
import PropTypes from 'prop-types';
import Icon from '../../../../components/icon';

import './index.css';

const Collaborator = ({ enableDelete = false, collaborator, onDelete }) => {
  if (!collaborator) return null;

  return (
    <div className="sf-metadata-ui collaborator-item" title={collaborator.name}>
      <span className="collaborator-avatar">
        <img className="collaborator-avatar-icon" alt={collaborator.name} src={collaborator.avatar_url} />
      </span>
      <span className="collaborator-name">{collaborator.name}</span>
      {enableDelete && (
        <span className="collaborator-remove" onClick={onDelete}>
          <Icon symbol="delete" />
        </span>
      )}
    </div>
  );
};

Collaborator.propTypes = {
  collaborator: PropTypes.shape({
    name: PropTypes.string.isRequired,
    avatar_url: PropTypes.string.isRequired,
    email: PropTypes.string,
  }),
  enableDelete: PropTypes.bool,
  onDeleteCollaborator: PropTypes.func,
};

export default Collaborator;
