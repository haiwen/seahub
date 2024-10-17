import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Formatter } from '@seafile/sf-metadata-ui-component';
import { useCollaborators } from '../../hooks';
import { Utils } from '../../../utils/utils';
import { siteRoot, thumbnailDefaultSize } from '../../../utils/constants';

const CellFormatter = ({ readonly, value, field, record, ...params }) => {
  const { collaborators, collaboratorsCache, updateCollaboratorsCache, queryUser } = useCollaborators();

  const getFileIconUrl = useMemo((filename) => {
    if (Utils.imageCheck(filename)) {
      const path = Utils.encodePath(Utils.joinPath(record._parent_dir, filename));
      const repoID = window.sfMetadataStore.repoId;
      const thumbnail = `${siteRoot}thumbnail/${repoID}/${thumbnailDefaultSize}${path}`;
      return thumbnail;
    } else {
      return Utils.getFileIconUrl(filename);
    }
  }, [record]);

  const props = useMemo(() => {
    return {
      collaborators,
      collaboratorsCache,
      updateCollaboratorsCache,
      readonly,
      value,
      field,
      queryUserAPI: queryUser,
      getFileIconUrl,
      getFolderIconUrl: Utils.getFolderIconUrl,
    };
  }, [readonly, value, field, collaborators, collaboratorsCache, updateCollaboratorsCache, queryUser, getFileIconUrl]);

  return (
    <Formatter { ...props } { ...params } />
  );
};

CellFormatter.propTypes = {
  readonly: PropTypes.bool,
  value: PropTypes.any,
  field: PropTypes.object.isRequired,
  record: PropTypes.object.isRequired,
};

export default CellFormatter;
