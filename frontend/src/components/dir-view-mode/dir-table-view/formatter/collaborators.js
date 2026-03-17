import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { useCollaborators } from '@/metadata';
import CreatorFormatter from '@/metadata/components/cell-formatter/creator';

const CollaboratorsFormatter = ({ value, className, children: emptyFormatter, ...params }) => {
  const { queryUser, collaborators, collaboratorsCache, updateCollaboratorsCache } = useCollaborators();

  if (!Array.isArray(value) || value.length === 0) return emptyFormatter || null;

  return (
    <div className={classnames('sf-metadata-ui cell-formatter-container collaborators-formatter', className)}>
      {value.map(email => (
        <CreatorFormatter
          key={email}
          className="dir-table-collaborators-formatter"
          value={email}
          api={queryUser}
          collaborators={collaborators}
          collaboratorsCache={collaboratorsCache}
          updateCollaboratorsCache={updateCollaboratorsCache}
        />
      ))}
    </div>
  );
};

CollaboratorsFormatter.propTypes = {
  value: PropTypes.array,
  className: PropTypes.string,
  children: PropTypes.any,
};

export default CollaboratorsFormatter;
