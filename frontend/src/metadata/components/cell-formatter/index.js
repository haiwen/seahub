import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Formatter } from '@seafile/sf-metadata-ui-component';
import { useCollaborators } from '../../hooks';
import { Utils } from '../../../utils/utils';
import { siteRoot, thumbnailDefaultSize } from '../../../utils/constants';
import { getParentDirFromRecord } from '../../utils/cell';
import { CellType } from '../../constants';
import classNames from 'classnames';

const CellFormatter = ({ readonly, value, field, className: propsClassName, record, ...params }) => {
  const { collaborators, collaboratorsCache, updateCollaboratorsCache, queryUser } = useCollaborators();
  const parentDir = useMemo(() => getParentDirFromRecord(record), [record]);
  const className = useMemo(() => {
    if (field.type !== CellType.FILE_NAME) return propsClassName;
    if (!Utils.imageCheck(value)) return propsClassName;
    return classNames(propsClassName, 'sf-metadata-image-file-formatter');
  }, [propsClassName, field, value]);

  const getFileIconUrl = useCallback((filename) => {
    if (Utils.imageCheck(filename)) {
      const path = Utils.encodePath(Utils.joinPath(parentDir, filename));
      const repoID = window.sfMetadataStore.repoId;
      const thumbnail = `${siteRoot}thumbnail/${repoID}/${thumbnailDefaultSize}${path}`;
      return thumbnail;
    }
    return Utils.getFileIconUrl(filename);
  }, [parentDir]);

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
      getFileIconUrl,
      getFolderIconUrl: Utils.getFolderIconUrl,
    };
  }, [readonly, value, field, collaborators, collaboratorsCache, updateCollaboratorsCache, className, queryUser, getFileIconUrl]);

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
