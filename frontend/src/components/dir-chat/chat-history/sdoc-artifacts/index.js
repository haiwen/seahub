import React from 'react';
import PropTypes from 'prop-types';
import { gettext, siteRoot } from '@/utils/constants';
import { Utils } from '@/utils/utils';

import './index.css';

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

const SdocArtifacts = ({ artifacts = [] }) => {
  const sdocArtifacts = artifacts.filter((artifact) => artifact?.type === 'sdoc');
  if (sdocArtifacts.length === 0) {
    return null;
  }

  return (
    <div className="sea-ai-sdoc-artifacts">
      {sdocArtifacts.map((artifact, index) => {
        const relativePath = artifact.relative_path;
        const path = relativePath ? `/AI Generated/${relativePath}` : artifact.path;
        const url = relativePath && artifact.repo_id ? `${siteRoot}lib/${artifact.repo_id}/file${Utils.encodePath(path)}` : artifact.url;
        const artifactKey = `${artifact.path || artifact.error_code || 'sdoc'}-${index}`;
        if (artifact.status !== 'created') {
          return (
            <div className="sea-ai-sdoc-artifact failure" key={artifactKey}>
              <div>{ERROR_MESSAGES[artifact.error_code] || ERROR_MESSAGES.create_failed}</div>
            </div>
          );
        }
        return (
          <div className="sea-ai-sdoc-artifact" key={artifactKey}>
            <div className="sea-ai-sdoc-artifact-name">{gettext('Created')} {artifact.name}</div>
            <div className="sea-ai-sdoc-artifact-path">{gettext('Location')}: {path}</div>
            {artifact.summary && <div className="sea-ai-sdoc-artifact-summary">{artifact.summary}</div>}
            <a href={url} target="_blank" rel="noopener noreferrer" className="sea-ai-sdoc-artifact-link">{gettext('Open document')}</a>
          </div>
        );
      })}
    </div>
  );
};

SdocArtifacts.propTypes = {
  artifacts: PropTypes.array,
};

export default SdocArtifacts;
