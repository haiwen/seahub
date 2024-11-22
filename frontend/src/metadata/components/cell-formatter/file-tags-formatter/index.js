import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useTags } from '../../../../tag/hooks';
import { getRowById } from '../../../utils/table';
import { getTagColor, getTagName } from '../../../../tag/utils/cell/core';

import './index.css';

const FileTagsFormatter = ({ value: oldValue }) => {
  const { tagsData } = useTags();
  const value = useMemo(() => {
    if (!Array.isArray(oldValue)) return [];
    return oldValue.filter(item => getRowById(tagsData, item.row_id)).map(item => item.row_id);
  }, [oldValue, tagsData]);

  return (
    <div className="sf-metadata-ui cell-formatter-container link-formatter sf-metadata-link-formatter sf-metadata-tags-formatter">
      {value.length > 0 && (
        <div className="sf-metadata-tags-formatter-container">
          {value.map((item) => {
            const tag = getRowById(tagsData, item);
            const tagColor = getTagColor(tag);
            const tagName = getTagName(tag);

            return (
              <span className="sf-metadata-tag-formatter" key={item} style={{ backgroundColor: tagColor }} title={tagName}></span>
            );
          })}
        </div>
      )}
    </div>
  );
};

FileTagsFormatter.propTypes = {
  value: PropTypes.array,
};

export default FileTagsFormatter;
