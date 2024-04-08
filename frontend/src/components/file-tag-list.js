import React from 'react';
import PropTypes from 'prop-types';
import '../css/file-tag-list.css';

function FileTagList(props) {
  return (
    <ul className="file-tag-list">
      {Array.isArray(props.fileTagList) && props.fileTagList.map((fileTag) => {
        const color = fileTag.tag_color || fileTag.color;
        const name = fileTag.tag_name || fileTag.name || '';
        return (
          <li key={fileTag.id} style={{backgroundColor: color}} className="file-tag-item">
            <span className="tag-name" title={name}>{name}</span>
          </li>
        );
      })}
    </ul>
  );
}

FileTagList.propTypes = {
  fileTagList: PropTypes.array.isRequired,
};

export default FileTagList;
