import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../utils/constants';

import '../css/file-tag-list.css';

function FileTagList({ fileTagList }) {
  if (Array.isArray(fileTagList) && fileTagList.length > 0) {
    return (
      <ul className="file-tag-list">
        {fileTagList.map((fileTag) => {
          const color = fileTag.tag_color || fileTag.color;
          const name = fileTag.tag_name || fileTag.name || '';
          return (
            <li key={fileTag.id} style={{ backgroundColor: color }} className="file-tag-item">
              <span className="tag-name" title={name}>{name}</span>
            </li>
          );
        })}
      </ul>
    );
  } else {
    return <span className="empty-tip-text">{gettext('Empty')}</span>;
  }
}

FileTagList.propTypes = {
  fileTagList: PropTypes.array.isRequired,
};

export default FileTagList;
