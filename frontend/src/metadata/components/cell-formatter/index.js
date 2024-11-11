import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Formatter } from '@seafile/sf-metadata-ui-component';
import { useCollaborators } from '../../hooks';
import { CellType } from '../../constants';
import FileName from './file-name';

const CellFormatter = ({ readonly, value, field, className, record, ...params }) => {
  const { collaborators, collaboratorsCache, updateCollaboratorsCache, queryUser } = useCollaborators();

  const props = useMemo(() => {
    return {
      collaborators,
      collaboratorsCache,
      updateCollaboratorsCache,
      readonly,
      value,
      field,
      className,
      queryUserAPI: queryUser,
    };
  }, [readonly, value, field, collaborators, collaboratorsCache, updateCollaboratorsCache, className, queryUser]);

  if (field.type === CellType.FILE_NAME) {
    return (<FileName { ...props } { ...params } record={record} />);
  }

  return (
    <Formatter { ...props } { ...params } />
  );
};

CellFormatter.propTypes = {
  readonly: PropTypes.bool,
  value: PropTypes.any,
  field: PropTypes.object.isRequired,
  className: PropTypes.string,
  record: PropTypes.object,
};

export default CellFormatter;
