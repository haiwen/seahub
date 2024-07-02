import React from 'react';
import PropTypes from 'prop-types';
import { Formatter } from '@seafile/sf-metadata-ui-component';
import { useCollaborators } from '../../hooks';

const CellFormatter = ({ readonly, value, field, ...params }) => {
  const { collaborators, collaboratorsCache, updateCollaboratorsCache } = useCollaborators();
  return (
    <Formatter
      readonly={readonly}
      value={value}
      field={field}
      collaborators={collaborators}
      collaboratorsCache={collaboratorsCache}
      updateCollaboratorsCache={updateCollaboratorsCache}
      queryUserAPI={window.sfMetadataContext.userService.queryUser}
      { ...params }
    />
  );
};

CellFormatter.propTypes = {
  readonly: PropTypes.bool,
  value: PropTypes.any,
  field: PropTypes.object.isRequired,
};

export default CellFormatter;
