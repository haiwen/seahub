import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '@/utils/constants';

import './index.css';

const FALLBACK_MESSAGES = {
  not_specified: gettext('No folder was specified, so the document was saved to the library root.'),
  not_found: gettext('The specified folder does not exist, so the document was saved to the library root.'),
  invalid: gettext('The specified folder is invalid, so the document was saved to the library root.'),
  permission_denied: gettext('You do not have permission to create files in the specified folder, so the document was saved to the library root.'),
};

const ERROR_MESSAGES = {
  root_not_writable: gettext('The document was generated, but no file was created because you cannot create files in the library root.'),
  sdoc_not_enabled: gettext('The document was generated, but no file was created because SDoc is not enabled.'),
  content_too_large: gettext('The document was generated, but it is too large to create as an SDoc.'),
  invalid_artifact: gettext('The document could not be created because the generated content is invalid.'),
  cleanup_required: gettext('The document could not be created completely. Please check the library for an empty file.'),
  create_failed: gettext('The document could not be created. No document link is available.'),
  write_failed: gettext('The document could not be saved. No document link is available.'),
};

const SdocArtifacts = ({ artifacts = [] }) => {
  const sdocArtifacts = artifacts.filter((artifact) => artifact?.type === 'sdoc');
  if (sdocArtifacts.length === 0) {
    return null;
  }

  return (
    <div className="sea-ai-sdoc-artifacts">
      {sdocArtifacts.map((artifact, index) => {
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
            <div className="sea-ai-sdoc-artifact-path">{gettext('Location')}: {artifact.path}</div>
            {artifact.summary && <div className="sea-ai-sdoc-artifact-summary">{artifact.summary}</div>}
            {artifact.directory_fallback_reason && <div className="sea-ai-sdoc-artifact-tip">{FALLBACK_MESSAGES[artifact.directory_fallback_reason]}</div>}
            <a href={artifact.url} target="_blank" rel="noopener noreferrer" className="sea-ai-sdoc-artifact-link">{gettext('Open document')}</a>
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
