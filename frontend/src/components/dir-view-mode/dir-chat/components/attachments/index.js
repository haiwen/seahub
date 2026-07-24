import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import Icon from '../../../../icon';
import { gettext } from '../../../../../utils/constants';
import URLDecorator from '../../../../../utils/url-decorator';

import './index.css';

const Attachments = ({ attachments = [], className = '', isOpenable = false, onRemove }) => {
  const validAttachments = Array.isArray(attachments) ? attachments.filter(Boolean) : [];

  if (validAttachments.length === 0) {
    return null;
  }

  return (
    <div className={classNames('sea-ai-chat-message-attachments', className)}>
      {validAttachments.map((attachment, index) => {
        const key = attachment.key || `${attachment.repo_id}-${attachment.path}-${index}`;
        const canOpen = Boolean(isOpenable && !onRemove && attachment.repo_id && attachment.path);
        const itemClassName = classNames('sea-ai-chat-message-attachments-item', {
          'sea-ai-chat-message-attachments-item-can-remove': onRemove,
          'sea-ai-chat-message-attachments-item-openable': canOpen,
        });
        const content = (
          <>
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
          </>
        );

        if (!canOpen) {
          return <div className={itemClassName} key={key}>{content}</div>;
        }

        const fileUrl = URLDecorator.getUrl({
          type: 'open_with_default',
          repoID: attachment.repo_id,
          filePath: attachment.path,
        });
        return (
          <a
            className={itemClassName}
            href={fileUrl}
            key={key}
            target="_blank"
            rel="noopener noreferrer"
          >
            {content}
          </a>
        );
      })}
    </div>
  );
};

Attachments.propTypes = {
  attachments: PropTypes.array,
  className: PropTypes.string,
  isOpenable: PropTypes.bool,
  onRemove: PropTypes.func,
};

export default Attachments;
