import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../../../utils/constants';

/**
 * Formatter for description column
 * Displays commit description with optional "Details" link
 */
const DescriptionFormatter = ({ value, record, onShowDetails }) => {
  if (!record) return null;

  const handleShowDetails = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onShowDetails) {
      onShowDetails(record);
    }
  };

  const description = value || record.description;

  return (
    <div className="history-description-cell">
      <span className="description-text text-truncate" title={description}>{description}</span>
      {record.showDetails && (
        <a
          href="#"
          className="details-link"
          onClick={handleShowDetails}
          role="button"
        >
          {gettext('Details')}
        </a>
      )}
    </div>
  );
};

DescriptionFormatter.propTypes = {
  value: PropTypes.string,
  record: PropTypes.object,
  onShowDetails: PropTypes.func,
};

export default DescriptionFormatter;

