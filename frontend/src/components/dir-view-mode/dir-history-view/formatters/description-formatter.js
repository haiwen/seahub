import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { siteRoot } from '../../../../utils/constants';

const DescriptionFormatter = ({ value, record, repoID }) => {

  const handleViewSnapshot = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(`${siteRoot}repo/${repoID}/snapshot/?commit_id=${record.commit_id}`, '_blank');
  }, [record, repoID]);

  const handleDescriptionClick = useCallback((e) => {
    if (e.button === 0) {
      handleViewSnapshot(e);
    }
  }, [handleViewSnapshot]);

  if (!record) return null;

  const description = value || record.description;

  return (
    <div className="history-description-cell">
      <span
        className="description-text"
        title={description}
        onClick={handleDescriptionClick}
        role="button"
      >
        {description}
      </span>
    </div>
  );
};

DescriptionFormatter.propTypes = {
  value: PropTypes.string,
  record: PropTypes.object,
  repoID: PropTypes.string,
};

export default DescriptionFormatter;

