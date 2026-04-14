import React from 'react';
import PropTypes from 'prop-types';
import Icon from '../../../../components/icon';

import './index.css';

const Collaborator = ({ enableDelete = false, collaborator, onDelete }) => {
  if (!collaborator) return null;
  // Defensive check: ensure collaborator has required string fields
  const name = typeof collaborator.name === 'string' ? collaborator.name : '';
  const avatar_url = typeof collaborator.avatar_url === 'string' ? collaborator.avatar_url : '';
  const emailValue = typeof collaborator.email === 'string' ? collaborator.email : '';
  if (emailValue.includes('@seafile_group')) {
    return (
      <div className="sf-metadata-ui collaborator-item" title={name}>
        <span className="department-icon-container">
          <Icon symbol="department" />
        </span>
        <span className="collaborator-name">{name}</span>
        {enableDelete && (
          <span className="collaborator-remove" onClick={onDelete}>
            <Icon symbol="delete" />
          </span>
        )}
      </div>
    );
  } else {
    return (
      <div className="sf-metadata-ui collaborator-item" title={name}>
        <span className="collaborator-avatar">
          <img className="collaborator-avatar-icon" alt={name} src={avatar_url} />
        </span>
        <span className="collaborator-name">{name}</span>
        {enableDelete && (
          <span className="collaborator-remove" onClick={onDelete}>
            <Icon symbol="delete" />
          </span>
        )}
      </div>
    );
  }
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
