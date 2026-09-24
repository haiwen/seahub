import React from 'react';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import { gettext } from '@/utils/constants';
import URLDecorator from '@/utils/url-decorator';
import CenteredLoading from '../../../centered-loading';
import Icon from '../../../icon';
import Tooltip from '../../../tooltip';
import { CHAT_ATTACHMENT_TYPE } from '../../constants';
import AttachmentObject from '../../models/attachment_object';

import './index.css';

const getImageSrc = (attachment) => {
  if (attachment.preview_path) {
    return attachment.preview_path;
  }
  if (attachment.path.startsWith('blob:') || attachment.path.startsWith('data:')) {
    return attachment.path;
  }
  return URLDecorator.getUrl({
    type: 'raw_file',
    repoID: attachment.repo_id,
    filePath: attachment.path,
  });
};

const ImageAttachment = ({ attachment, itemClassName, onRemove, onReupload, canOpen, index }) => {
  const { status } = attachment;
  const removeButtonID = `sea-ai-chat-attachment-remove-${index}`;

  const content = (
    <>
      <img
        className="sea-ai-chat-message-attachments-item-img"
        src={getImageSrc(attachment)}
        alt={attachment.name || gettext('Image')}
      />
      {onRemove && status !== 'uploading' && (
        <>
          <button
            type="button"
            id={removeButtonID}
            className="sea-ai-chat-message-attachments-item-remove"
            onClick={() => onRemove(attachment, index)}
            aria-label={gettext('Delete')}
          >
            <Icon symbol="close" />
          </button>
          <Tooltip target={removeButtonID} placement="top">
            {gettext('Delete')}
          </Tooltip>
        </>
      )}
      {status === 'uploading' && (
        <div className="sea-ai-chat-message-attachments-item-mask">
          <CenteredLoading />
        </div>
      )}
      {status === 'failed' && (
        <div className="sea-ai-chat-message-attachments-item-mask sea-ai-chat-message-attachments-item-failed">
          {onReupload && attachment.image && (
            <button
              type="button"
              className="sea-ai-chat-message-attachments-item-retry"
              onClick={() => onReupload(attachment)}
              aria-label={gettext('Retry')}
            >
              <Icon symbol="refresh" />
            </button>
          )}
          <span className="sea-ai-chat-message-attachments-item-failed-tip">{gettext('Failed')}</span>
        </div>
      )}
    </>
  );

  if (!canOpen) {
    return <div className={itemClassName}>{content}</div>;
  }

  const fileUrl = URLDecorator.getUrl({
    type: 'open_with_default',
    repoID: attachment.repo_id,
    filePath: attachment.path,
  });
  return (
    <a className={itemClassName} href={fileUrl} target="_blank" rel="noopener noreferrer">
      {content}
    </a>
  );
};

const Attachments = ({ attachments = [], className = '', isOpenable = false, onRemove, onReupload }) => {
  const validAttachments = Array.isArray(attachments) ? attachments.filter(Boolean) : [];

  if (validAttachments.length === 0) {
    return null;
  }

  return (
    <div className={classNames('sea-ai-chat-message-attachments', className)}>
      {validAttachments.map((rawAttachment, index) => {
        const attachment = rawAttachment instanceof AttachmentObject
          ? rawAttachment
          : new AttachmentObject(rawAttachment);
        const key = attachment.key || `${attachment.repo_id}-${attachment.path}-${index}`;
        const canOpen = Boolean(
          isOpenable && !onRemove && attachment.repo_id && attachment.path &&
          (attachment.type !== CHAT_ATTACHMENT_TYPE.IMAGE || attachment.status === 'done')
        );
        const itemClassName = classNames('sea-ai-chat-message-attachments-item', {
          'sea-ai-chat-message-attachments-item-can-remove': onRemove,
          'sea-ai-chat-message-attachments-item-openable': canOpen,
          'sea-ai-chat-message-attachments-item-image': attachment.type === CHAT_ATTACHMENT_TYPE.IMAGE,
        });

        if (attachment.type === CHAT_ATTACHMENT_TYPE.IMAGE) {
          return (
            <ImageAttachment
              key={key}
              index={index}
              attachment={attachment}
              itemClassName={itemClassName}
              onRemove={onRemove}
              onReupload={onReupload}
              canOpen={canOpen}
            />
          );
        }

        const removeButtonID = `sea-ai-chat-attachment-remove-${index}`;
        const content = (
          <>
            {onRemove && (
              <button
                type="button"
                id={removeButtonID}
                className="sea-ai-chat-message-attachments-item-remove"
                onClick={() => onRemove(attachment, index)}
                aria-label={gettext('Delete')}
              >
                <Icon symbol="close" />
              </button>
            )}
            {onRemove && (
              <Tooltip target={removeButtonID} placement="top">
                {gettext('Delete')}
              </Tooltip>
            )}
            <span className="sea-ai-chat-message-attachments-item-name text-truncate" title={attachment.name}>{attachment.name}</span>
            <span className="sea-ai-chat-message-attachments-item-source d-inline-flex justify-content-center align-items-center">
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
  onReupload: PropTypes.func,
};

export default Attachments;
