import React from 'react';
import PropTypes from 'prop-types';
import { TagViewProvider, useTags } from '../../../hooks';
import View from '../../view';
import { getRowById } from '../../../../metadata/utils/table';
import { getTagName } from '../../../utils';

import './index.css';

const TagFiles = ({ onChangeDisplayTag, ...params }) => {
  const { tagID } = params;
  const { tagsData } = useTags();
  const tag = getRowById(tagsData, tagID);
  const tagName = getTagName(tag);

  return (
    <div className="sf-metadata-all-tags-tag-files">
      <div className="sf-metadata-all-tags-tag-files-header">
        <div className="sf-metadata-all-tags-tag-files-header-back" onClick={() => onChangeDisplayTag()}>
          <i className="sf3-font sf3-font-arrow rotate-180"></i>
        </div>
        <div className="sf-metadata-all-tags-tag-files-header-name">
          {tagName}
        </div>
      </div>
      <TagViewProvider { ...params }>
        <View />
      </TagViewProvider>
    </div>
  );
};

TagFiles.propTypes = {
  onChangeDisplayTag: PropTypes.func.isRequired,
};

export default TagFiles;
