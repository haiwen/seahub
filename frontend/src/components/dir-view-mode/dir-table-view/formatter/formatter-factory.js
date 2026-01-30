import React from 'react';
import NameFormatter from './name';
import SizeFormatter from './size';
import LastModifiedFormatter from './modified';
import Creator from './creator';
import StatusFormatter from './status';

export const createColumnFormatter = ({ column, otherProps }) => {
  const { key } = column;
  const {
    repoID,
    path,
    onItemClick,
    queryUser,
    collaborators,
    collaboratorsCache,
    updateCollaboratorsCache,
  } = otherProps;

  switch (key) {
    case '_name':
      return <NameFormatter repoID={repoID} path={path} onClick={onItemClick} />;
    case '_size_original':
      return <SizeFormatter formats={{ format: 'byte' }} />;
    case '_mtime':
      return <LastModifiedFormatter />;
    case '_creator':
    case '_last_modifier':
      return (
        <Creator
          key={key}
          api={queryUser}
          collaborators={collaborators}
          collaboratorsCache={collaboratorsCache}
          updateCollaboratorsCache={updateCollaboratorsCache}
        />
      );
    case '_status':
      return <StatusFormatter />;
    default:
      return null;
  }
};
