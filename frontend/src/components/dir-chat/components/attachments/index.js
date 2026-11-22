import React from 'react';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import { gettext } from '@/utils/constants';
import URLDecorator from '@/utils/url-decorator';
import CenteredLoading from '../../../centered-loading';
import Icon from '../../../icon';
import Tooltip from '../../../tooltip';
import { CHAT_ATTACHMENT_TYPE } from '../../constants';
import { AttachmentObject } from '../../models';

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

const ImageContent = ({ attachment, onReupload }) => (
  <>
    <img
      className="sea-ai-chat-message-attachments-item-img"
      src={getImageSrc(attachment)}
      alt={attachment.name || gettext('Image')}
    />
    {attachment.status === 'uploading' && (
      <div className="sea-ai-chat-message-attachments-item-mask">
        <CenteredLoading />
      </div>
    )}
    {attachment.status === 'failed' && (
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

const DocumentContent = ({ attachment }) => (
  <>
    <span className="sea-ai-chat-message-attachments-item-name text-truncate" title={attachment.name}>
      {attachment.name}
    </span>
    <span className="sea-ai-chat-message-attachments-item-source d-inline-flex justify-content-center align-items-center">
      <Icon symbol="ai-file" className="mr-1" />
      {gettext('Seafile library')}
    </span>
  </>
);

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
        const isImage = attachment.type === CHAT_ATTACHMENT_TYPE.IMAGE;
        const key = attachment.key || `${attachment.repo_id}-${attachment.path}-${index}`;
        const canOpen = Boolean(
          isOpenable && !onRemove && attachment.repo_id && attachment.path &&
          (!isImage || attachment.status === 'done')
        );
        // An image that is still uploading has no library path yet, so it cannot
        // be removed; a failed or finished one can.
        const canRemove = Boolean(onRemove) && (!isImage || attachment.status !== 'uploading');
        const itemClassName = classNames('sea-ai-chat-message-attachments-item', {
          'sea-ai-chat-message-attachments-item-can-remove': onRemove,
          'sea-ai-chat-message-attachments-item-openable': canOpen,
          'sea-ai-chat-message-attachments-item-image': isImage,
        });
        const removeButtonID = `sea-ai-chat-attachment-remove-${index}`;

        const content = (
          <>
            {canRemove && (
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
            {isImage
              ? <ImageContent attachment={attachment} onReupload={onReupload} />
              : <DocumentContent attachment={attachment} />}
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
