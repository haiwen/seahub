import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Formatter } from '@seafile/sf-metadata-ui-component';
import { useCollaborators } from '../../../hooks';
import { Utils } from '../../../../utils/utils';

const CellFormatter = ({ readonly, value, field, ...params }) => {
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
      getFileIconUrl: Utils.getFileIconUrl,
      getFolderIconUrl: Utils.getFolderIconUrl,
      isBaiduMap: true,
    };
  }, [readonly, value, field, collaborators, collaboratorsCache, updateCollaboratorsCache, queryUser]);

  return (
    <Formatter { ...props } { ...params } />
  );
};

CellFormatter.propTypes = {
  readonly: PropTypes.bool,
  value: PropTypes.any,
  field: PropTypes.object.isRequired,
};

export default CellFormatter;
