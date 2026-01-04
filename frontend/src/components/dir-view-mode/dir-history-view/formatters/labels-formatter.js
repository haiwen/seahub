import React from 'react';
import PropTypes from 'prop-types';
import Icon from '../../../icon';
import { gettext } from '../../../../utils/constants';

const LabelsFormatter = ({ value, record, userPerm, onEditLabels, isCellSelected }) => {
  if (!record) return null;

  const tags = value || record.tags || [];
  const canEdit = userPerm === 'rw';

  const handleEdit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onEditLabels) {
      onEditLabels(record);
    }
  };

  return (
    <div className="history-cell-labels">
      {tags.map((tag, index) => (
        <span key={index} className="commit-label">{tag}</span>
      ))}
      {canEdit && (
        <span
          role="button"
          className={`op-icon op-icon-bg-light ml-2 ${isCellSelected ? '' : 'invisible'}`}
          title={gettext('Edit')}
          aria-label={gettext('Edit')}
          onClick={handleEdit}
        >
          <Icon symbol="rename" />
        </span>
      )}
    </div>
  );
};

LabelsFormatter.propTypes = {
  value: PropTypes.array,
  record: PropTypes.object,
  userPerm: PropTypes.string,
  onEditLabels: PropTypes.func,
  isCellSelected: PropTypes.bool,
};

export default LabelsFormatter;

