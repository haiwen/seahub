import React from 'react';
import PropTypes from 'prop-types';

const TagsFormatter = ({ value, record, userPerm }) => {
  if (!record) return null;

  const tags = value || record.tags || [];

  const cellClassName = userPerm === 'rw'
    ? 'history-cell-tags cursor-pointer'
    : 'history-cell-tags';

  if (tags.length === 0) {
    return <div className={cellClassName}></div>;
  }

  return (
    <div className={cellClassName}>
      {tags.map((tag, index) => (
        <span key={index} className="commit-tag">{tag}</span>
      ))}
    </div>
  );
};

TagsFormatter.propTypes = {
  value: PropTypes.array,
  record: PropTypes.object,
  userPerm: PropTypes.string,
};

export default TagsFormatter;
