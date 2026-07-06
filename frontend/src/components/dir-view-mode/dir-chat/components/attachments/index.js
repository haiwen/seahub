import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import Icon from '../../../../icon';
import { gettext } from '../../../../../utils/constants';

import './index.css';

const Attachments = ({ attachments = [], className = '', onRemove }) => {
  const validAttachments = Array.isArray(attachments) ? attachments.filter(Boolean) : [];

  if (validAttachments.length === 0) {
    return null;
  }

  return (
    <div className={classNames('sea-ai-chat-message-attachments', className)}>
      {validAttachments.map((attachment, index) => (
        <div
          className={classNames('sea-ai-chat-message-attachments-item', { 'sea-ai-chat-message-attachments-item-can-remove': onRemove })}
          key={attachment.key || `${attachment.repo_id}-${attachment.path}-${index}`}
        >
          {onRemove && (
            <button
              type="button"
              className="sea-ai-chat-message-attachments-item-remove"
              onClick={() => onRemove(attachment, index)}
            >
              <Icon symbol="close" />
            </button>
          )}
          <span className="sea-ai-chat-message-attachments-item-name text-truncate" title={attachment.name}>{attachment.name}</span>
          <span className="d-inline-flex justify-content-center align-items-center">
            <Icon symbol="ai-file" className="mr-1" />
            {gettext('Seafile library')}
          </span>
        </div>
      ))}
    </div>
  );
};

Attachments.propTypes = {
  attachments: PropTypes.array,
  className: PropTypes.string,
  onRemove: PropTypes.func,
};

export default Attachments;
