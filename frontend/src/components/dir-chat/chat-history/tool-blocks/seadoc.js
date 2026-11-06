import React from 'react';
import PropTypes from 'prop-types';
import { gettext, siteRoot } from '@/utils/constants';
import { Utils } from '@/utils/utils';

import './seadoc.css';

const ERROR_MESSAGES = {
  sdoc_not_enabled: gettext('The document was generated, but no file was created because SDoc is not enabled.'),
  unsupported_schema_version: gettext('The document could not be created because the generated format version is not supported.'),
  unsupported_element_type: gettext('The document could not be created because it contains an unsupported element type.'),
  content_too_large: gettext('The document was generated, but it is too large to create as an SDoc.'),
  invalid_artifact: gettext('The document could not be created because the generated content is invalid.'),
  invalid_hierarchy: gettext('The document could not be created because its content structure is invalid.'),
  generated_sdoc_invalid: gettext('The document could not be created because the generated SDoc structure is invalid.'),
  invalid_file_name: gettext('The document could not be created because its file name is invalid.'),
  invalid_directory: gettext('The document could not be created because the specified folder is invalid.'),
  directory_not_found: gettext('The document could not be created because the specified folder does not exist.'),
  permission_denied: gettext('The document could not be created because you do not have permission to create files in the specified folder.'),
  default_directory_unavailable: gettext('The document could not be created because the AI Generated folder is unavailable.'),
  create_failed: gettext('The document could not be created. No document link is available.'),
  write_failed: gettext('The document could not be saved. No document link is available.'),
  creation_unconfirmed: gettext('Document creation could not be confirmed. Please check the AI Generated folder before trying again.'),
};

export const getSeadocError = (data) => {
  if (data.status === 'unknown') {
    return ERROR_MESSAGES.creation_unconfirmed;
  }
  return ERROR_MESSAGES[data.error_code] || ERROR_MESSAGES.create_failed;
};

export const getSeadocUrl = (data, repoID) => `${siteRoot}lib/${repoID}/file${Utils.encodePath(data.path)}`;

const Seadoc = ({ data, repoID }) => {
  if (data.status !== 'created') {
    return <div className="sea-ai-seadoc failure">{getSeadocError(data)}</div>;
  }
  return (
    <div className="sea-ai-seadoc">
      <div className="sea-ai-seadoc-name">{gettext('Created')} {data.name}</div>
      <div className="sea-ai-seadoc-path">{gettext('Location')}: {data.path}</div>
      {data.description && <div className="sea-ai-seadoc-description">{data.description}</div>}
      {repoID && <a href={getSeadocUrl(data, repoID)} target="_blank" rel="noopener noreferrer" className="sea-ai-seadoc-link">{gettext('Open document')}</a>}
    </div>
  );
};

Seadoc.propTypes = {
  data: PropTypes.object.isRequired,
  repoID: PropTypes.string,
};

export default Seadoc;
