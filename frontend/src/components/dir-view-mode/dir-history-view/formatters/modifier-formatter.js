import React from 'react';
import PropTypes from 'prop-types';
import { mediaUrl } from '../../../../utils/constants';
import { useCollaborators } from '../../../../metadata/hooks';
import AsyncCollaborator from '../../../../metadata/components/cell-formatter/async-collaborator';

const ModifierFormatter = ({ record }) => {
  const { collaborators, collaboratorsCache, updateCollaboratorsCache, queryUser } = useCollaborators();

  if (!record) return null;
  const { email, second_parent_id } = record;

  if (second_parent_id) {
    return (
      <div className="sf-metadata-ui collaborator-item" title="None">
        <span className="collaborator-avatar">
          <img className="collaborator-avatar-icon" alt="None" src={`${mediaUrl}/avatars/default.png`} />
        </span>
        <span className="collaborator-name">None</span>
      </div>
    );
  }

  return (
    <AsyncCollaborator
      value={email}
      mediaUrl={mediaUrl}
      api={queryUser}
      collaborators={collaborators}
      collaboratorsCache={collaboratorsCache}
      updateCollaboratorsCache={updateCollaboratorsCache}
    />
  );
};

ModifierFormatter.propTypes = {
  record: PropTypes.object,
};

export default ModifierFormatter;

