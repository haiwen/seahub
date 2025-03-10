import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import Formatter from '../formatter';
import FileName from './file-name';
import { useCollaborators } from '../../hooks';
import { CellType } from '../../constants';
import { useTags } from '../../../tag/hooks';

const CellFormatter = ({ readonly, value, field, record, ...params }) => {
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
    };
  }, [readonly, value, field, collaborators, collaboratorsCache, updateCollaboratorsCache, queryUser]);
  const { tagsData } = useTags();

  if (field.type === CellType.FILE_NAME) {
    return (<FileName { ...props } { ...params } record={record} />);
  }

  return (
    <Formatter { ...props } { ...params } tagsData={tagsData} record={record} />
  );
};

CellFormatter.propTypes = {
  readonly: PropTypes.bool,
  value: PropTypes.any,
  field: PropTypes.object.isRequired,
  record: PropTypes.object,
};

export default CellFormatter;
