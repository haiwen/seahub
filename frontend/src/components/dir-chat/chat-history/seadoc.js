import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '@/utils/constants';
import URLDecorator from '@/utils/url-decorator';
import { getBlockAttributes } from './content-blocks';

import './seadoc.css';

export const getSeadocError = (data) => {
  if (data.error_code === 'permission_denied') return gettext('Permission denied.');
  if (data.error_code === 'sdoc_not_enabled') return gettext('SeaDoc is not enabled.');
  return gettext('Failed to create the document.');
};

export const getSeadocUrl = (data, repoID) => URLDecorator.getUrl({
  type: 'open_with_default', repoID, filePath: data.path,
});

export const seadocBlockToPart = (block, isStreaming = false) => {
  if (isStreaming || !block.complete || block.selfClosing) return null;
  const data = getBlockAttributes(block);
  if (!data.status) return null;
  const path = data.path || '';
  const name = data.file_name || '';
  if (data.status === 'created' && (!path.startsWith('/AI Generated/') || path.split('/').includes('..') ||
        path.includes('\\') || Array.from(path).some((char) => char.charCodeAt(0) < 32) ||
        !name || name.includes('/') || name.includes('\\') || !path.endsWith(`/${name}`) || !name.toLowerCase().endsWith('.sdoc'))) {
    data.status = 'failed';
    data.error_code = 'invalid_artifact';
  }
  return { type: 'seadoc', data };
};

export const copySeadocBlock = (data, repoID) => {
  if (data.status !== 'created') return getSeadocError(data);
  const name = data.file_name.replace(/([\\\[\]])/g, '\\$1');
  const url = repoID ? getSeadocUrl(data, repoID).replace(/\(/g, '%28').replace(/\)/g, '%29') : '';
  return `${url ? `[${name}](${url})` : name}${data.description ? `\n\n${data.description}` : ''}`;
};

const Seadoc = ({ data, repoID }) => {
  if (data.status !== 'created') {
    return <div className="sea-ai-seadoc failure">{getSeadocError(data)}</div>;
  }
  return (
    <div className="sea-ai-seadoc">
      <div className="sea-ai-seadoc-name">{gettext('Created')} {data.file_name}</div>
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
