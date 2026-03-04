import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { getRowById } from '../../../../components/sf-table/utils/table';
import { getTagColor, getTagName } from '../../../../tag/utils/cell';
import { useTags } from '../../../../tag/hooks';

import './index.css';

const FileTagsFormatter = ({ tagsData: propsTagsData, value: oldValue, className, children: emptyFormatter, showName = false }) => {
  // Get tagsData directly from context (same pattern as Detail component)
  const { tagsData: contextTagsData } = useTags();
  // Use context tagsData if available, fallback to props for backward compatibility
  const tagsData = useMemo(() => contextTagsData || propsTagsData || {}, [contextTagsData, propsTagsData]);

  const value = useMemo(() => {
    if (!Array.isArray(oldValue) || oldValue.length === 0) return [];
    return oldValue.filter(item => getRowById(tagsData, item.row_id)).map(item => item.row_id);
  }, [oldValue, tagsData]);

  if (value.length === 0) return emptyFormatter || null;
  return (
    <div className={classnames('sf-metadata-ui cell-formatter-container tags-formatter', className)}>
      <div className="sf-metadata-ui-tags-container">
        {value.map((item) => {
          const tag = getRowById(tagsData, item);
          const tagColor = getTagColor(tag);
          const tagName = getTagName(tag);
          if (!showName) return (
            <span key={item} className="sf-metadata-ui-tag-color" style={{ backgroundColor: tagColor }}></span>
          );
          return (
            <div key={item} className="sf-metadata-ui-tag" title={tagName}>
              <span className="sf-metadata-ui-tag-color mr-1" style={{ backgroundColor: tagColor }}></span>
              <span className="sf-metadata-ui-tag-text">{tagName}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

FileTagsFormatter.propTypes = {
  value: PropTypes.array,
  tagsData: PropTypes.object,
  className: PropTypes.string,
  showName: PropTypes.bool,
};

export default FileTagsFormatter;
