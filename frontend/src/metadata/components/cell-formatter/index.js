import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import Formatter from '../formatter';
import FileName from './file-name';
import { useCollaborators } from '../../hooks';
import { CellType } from '../../constants';

const CellFormatter = React.memo(({ readonly, value, column, record, onItemClick, ...params }) => {
  const { collaborators, collaboratorsCache, updateCollaboratorsCache, queryUser } = useCollaborators();
  const props = useMemo(() => {
    return {
      collaborators,
      collaboratorsCache,
      updateCollaboratorsCache,
      readonly,
      value,
      column,
      queryUserAPI: queryUser,
      record,
    };
  }, [readonly, value, column, collaborators, collaboratorsCache, updateCollaboratorsCache, queryUser, record]);

  if (column.type === CellType.FILE_NAME) {
    return (<FileName { ...props } { ...params } record={record} onItemClick={onItemClick} />);
  }

  return (
    <Formatter { ...props } { ...params } />
  );
});

CellFormatter.displayName = 'CellFormatter';

CellFormatter.propTypes = {
  readonly: PropTypes.bool,
  value: PropTypes.any,
  column: PropTypes.object,
  record: PropTypes.object,
  tagsData: PropTypes.object,
};

export default CellFormatter;
