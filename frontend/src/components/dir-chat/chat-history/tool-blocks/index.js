import React from 'react';
import PropTypes from 'prop-types';
import Seadoc, { getSeadocError, getSeadocUrl } from './seadoc';

const RENDERERS = { seadoc: Seadoc };

const ToolBlock = ({ block, repoID }) => {
  const Component = RENDERERS[block.type];
  return Component ? <Component data={block.data} repoID={repoID} /> : null;
};

ToolBlock.propTypes = {
  block: PropTypes.object.isRequired,
  repoID: PropTypes.string,
};

export const transformToolBlocksForCopy = (value, blocks, repoID) => {
  return blocks.reduce((text, block) => {
    const { data, url } = block;
    const label = (data.name || '').replace(/([\\\[\]])/g, '\\$1');
    const replacement = data.status === 'created' ?
      (repoID ? `[${label}](${getSeadocUrl(data, repoID)})` : label) : getSeadocError(data);
    return text.replace(`[tool result](${url})`, replacement);
  }, value);
};

export default ToolBlock;
