import React, { useCallback } from 'react';
import PropTypes from 'prop-types';

const DescriptionFormatter = ({ value, record, isCellSelected, onOpenCommitDetails }) => {

  const handleDescriptionClick = useCallback((e) => {
    e.preventDefault();
    e.nativeEvent.stopImmediatePropagation();

    if (!isCellSelected || e.button !== 0 || !record) return;

    onOpenCommitDetails?.(record);
  }, [isCellSelected, onOpenCommitDetails, record]);

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
  isCellSelected: PropTypes.bool,
  onOpenCommitDetails: PropTypes.func,
};

export default DescriptionFormatter;
