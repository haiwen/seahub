import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { getCellValueByColumn } from '../../../utils/cell';
import Collaborator from '../../cell-formatter/collaborator';
import { useCollaborators } from '../../../hooks';
import { mediaUrl } from '../../../../utils/constants';
import { isValidEmail } from '../../../utils/validate';

const Creator = ({ record, column }) => {
  const [collaborator, setCollaborator] = useState(null);

  const { collaborators, collaboratorsCache, queryUser } = useCollaborators();

  useEffect(() => {
    const value = getCellValueByColumn(record, column);
    let collaborator = collaborators && collaborators.find(c => c.email === value);
    if (collaborator) {
      setCollaborator(collaborator);
      return;
    }

    const defaultAvatarUrl = `${mediaUrl}/avatars/default.png`;
    if (value === 'anonymous') {
      setCollaborator({
        name: 'anonymous',
        avatar_url: defaultAvatarUrl,
      });
      return;
    }

    collaborator = collaboratorsCache[value];
    if (collaborator) {
      setCollaborator(collaborator);
      return;
    }

    if (!isValidEmail(value)) {
      setCollaborator({
        email: value,
        name: value,
        avatar_url: defaultAvatarUrl,
      });
      return;
    }

    queryUser && queryUser(value, (userMap) => {
      collaborator = userMap[value];
      setCollaborator(collaborator);
    });
  }, [record, column, collaborators, collaboratorsCache, queryUser]);

  return (
    <div className="form-control disabled creator-container" style={{ width: 320 }}>
      {collaborator && <Collaborator collaborator={collaborator} />}
    </div>
  );
};

Creator.propTypes = {
  record: PropTypes.object.isRequired,
  column: PropTypes.object.isRequired,
};

export default Creator;
