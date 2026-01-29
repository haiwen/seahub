import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import Formatter from '../formatter';
import FileName from './file-name';
import { useCollaborators } from '../../hooks';
import { CellType } from '../../constants';

const CellFormatter = React.memo(({ readonly, value, field, record, tagsData, ...params }) => {
  const { collaborators, collaboratorsCache, updateCollaboratorsCache, queryUser } = useCollaborators();
  const props = useMemo(() => {
    return {
      collaborators,
      collaboratorsCache,
      updateCollaboratorsCache,
      readonly,
      value,
      field,
      queryUserAPI: queryUser,
      record,
    };
  }, [readonly, value, field, collaborators, collaboratorsCache, updateCollaboratorsCache, queryUser, record]);

  if (field.type === CellType.FILE_NAME) {
    return (<FileName { ...props } { ...params } record={record} />);
  }

  return (
    <Formatter { ...props } { ...params } tagsData={tagsData} />
  );
});

CellFormatter.propTypes = {
  readonly: PropTypes.bool,
  value: PropTypes.any,
  field: PropTypes.object.isRequired,
  record: PropTypes.object,
  tagsData: PropTypes.object,
};

export default CellFormatter;
