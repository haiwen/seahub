import React, { useCallback, useEffect, useMemo, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import { gettext } from '@/utils/constants';
import { Utils } from '@/utils/utils';
import ClickOutside from '../../click-outside';
import Icon from '../../icon';
import toaster from '../../toast';
import Tooltip from '../../tooltip';
import { CHAT_ATTACHMENT_TYPE, CHAT_IMAGE_ATTACHMENT_MAX_COUNT } from '../constants';
import { useAIChatTools } from '../hooks';
import AttachmentObject from '../models/attachment_object';
import AIModelSelector from './ai-model-selector';
import AttachmentsFormatter from './attachments';
import LibraryFilesSelector from './library-files-selector';
import {
  AI_CHAT_IMAGE_ACCEPT,
  AI_CHAT_IMAGE_EXTENSIONS,
  AI_CHAT_IMAGE_MAX_SIZE,
  genImageAttachmentId,
  isSupportedImage,
  isWithinSizeLimit,
  uploadImageToAiChatDir,
} from './upload-image';

import './index.css';

const isImageFile = (file) => Boolean(file) && typeof file.type === 'string' && file.type.startsWith('image/');

const ChatInput = forwardRef(({
  isReply,
  readOnly,
  repoID,
  sendMessage,
  isEmpty,
}, ref) => {
  const [containerFocus, setContainerFocus] = useState(true);
  const [selectedModel, setSelectedModel] = useState(null);
  const [value, setValue] = useState('');
  const [isDragging, setDragging] = useState(false);

  const inputRef = useRef(null);
  const previewContentRef = useRef(null);
  const uploadInputRef = useRef(null);

  const {
    attachments,
    updateAttachments,
    removeAttachment,
    clearAttachments,
  } = useAIChatTools();

  const disabled = isReply || readOnly;

  const imageAttachments = useMemo(() => {
    return attachments.filter((attachment) => attachment.type === CHAT_ATTACHMENT_TYPE.IMAGE);
  }, [attachments]);
  const isUploadingAttachment = imageAttachments.some((attachment) => attachment.status === 'uploading');

  const startImageUpload = useCallback(({ attachmentId, file, previewUrl }) => {
    uploadImageToAiChatDir({ repoID, file }).then(({ name, path }) => {
      updateAttachments((current) => current.map((att) => (att._id === attachmentId
        ? new AttachmentObject({
          type: CHAT_ATTACHMENT_TYPE.IMAGE,
          _id: attachmentId,
          repo_id: repoID,
          path,
          name,
          preview_path: previewUrl,
          status: 'done',
        })
        : att)));
    }).catch((error) => {
      toaster.danger(Utils.getErrorMsg(error));
      updateAttachments((current) => current.map((att) => (att._id === attachmentId
        ? new AttachmentObject({
          type: CHAT_ATTACHMENT_TYPE.IMAGE,
          _id: attachmentId,
          path: previewUrl,
          status: 'failed',
          image: file,
        })
        : att)));
    });
  }, [repoID, updateAttachments]);

  const onImageUpload = useCallback((file) => {
    const attachmentId = genImageAttachmentId();
    const previewUrl = URL.createObjectURL(file);
    updateAttachments((current) => [...current, new AttachmentObject({
      type: CHAT_ATTACHMENT_TYPE.IMAGE,
      _id: attachmentId,
      path: previewUrl,
      status: 'uploading',
      image: file,
    })]);
    startImageUpload({ attachmentId, file, previewUrl });
  }, [startImageUpload, updateAttachments]);

  const onImagesUpload = useCallback((files) => {
    const supportedFiles = files.filter(isSupportedImage);
    if (supportedFiles.length < files.length) {
      toaster.danger(gettext('Only images in %1$s format are supported').replace('%1$s', AI_CHAT_IMAGE_EXTENSIONS.join(', ')));
    }

    const validFiles = supportedFiles.filter(isWithinSizeLimit);
    if (validFiles.length < supportedFiles.length) {
      toaster.danger(gettext('Image size must not exceed %1$s MB').replace('%1$s', AI_CHAT_IMAGE_MAX_SIZE / 1024 / 1024));
    }

    if (validFiles.length === 0) {
      return;
    }

    if (imageAttachments.length >= CHAT_IMAGE_ATTACHMENT_MAX_COUNT) {
      toaster.danger(gettext('Each message can contain at most %1$s image').replace('%1$s', CHAT_IMAGE_ATTACHMENT_MAX_COUNT));
      return;
    }

    const remainCount = CHAT_IMAGE_ATTACHMENT_MAX_COUNT - imageAttachments.length;
    if (validFiles.length > remainCount) {
      toaster.danger(gettext('Only the first %1$s image will be added').replace('%1$s', remainCount));
    }

    validFiles.slice(0, remainCount).forEach(onImageUpload);
  }, [imageAttachments, onImageUpload]);

  const onAttachmentReupload = useCallback((attachment) => {
    const { image, _id: attachmentId } = attachment;
    if (!image) {
      return;
    }
    const previewUrl = attachment.path.startsWith('blob:') ? attachment.path : attachment.preview_path;
    updateAttachments((current) => current.map((att) => (att._id === attachmentId
      ? new AttachmentObject({
        type: CHAT_ATTACHMENT_TYPE.IMAGE,
        _id: attachmentId,
        path: previewUrl,
        status: 'uploading',
        image,
      })
      : att)));
    startImageUpload({ attachmentId, file: image, previewUrl });
  }, [startImageUpload, updateAttachments]);

  const onFileInputClick = useCallback(() => {
    uploadInputRef.current && uploadInputRef.current.click();
  }, []);

  const onFileInputChange = useCallback((event) => {
    const files = Array.from(event.target.files || []);
    // Reset so that picking the same file again still fires a change event.
    event.target.value = '';
    if (files.length > 0) {
      onImagesUpload(files);
    }
  }, [onImagesUpload]);

  const onPaste = useCallback((event) => {
    const files = Array.from(event.clipboardData?.files || []).filter(isImageFile);
    if (files.length > 0) {
      onImagesUpload(files);
    }
  }, [onImagesUpload]);

  const onDragOver = useCallback((event) => {
    // Only react to file drags, otherwise dragging text inside the textarea
    // would pop the drop hint.
    const types = Array.from(event.dataTransfer?.types || []);
    if (!types.includes('Files')) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setDragging(true);
  }, []);

  const onDragLeave = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
  }, []);

  const onDrop = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
    const files = Array.from(event.dataTransfer?.files || []).filter(isImageFile);
    if (files.length > 0) {
      onImagesUpload(files);
    }
  }, [onImagesUpload]);

  const handleSend = useCallback((event) => {
    event && event.preventDefault();
    if (isUploadingAttachment) {
      return;
    }
    sendMessage({
      message: value,
      attachments,
      model: selectedModel,
    });
    setValue('');
    clearAttachments();
  }, [attachments, clearAttachments, isUploadingAttachment, selectedModel, sendMessage, value]);

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend(event);
    }
  }, [handleSend]);

  const onContainerBlur = useCallback(() => {
    setContainerFocus(false);
  }, []);

  const handleFocus = useCallback((event) => {
    setContainerFocus(true);
    if (event && inputRef.current && event.target === inputRef.current) return;
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (previewContentRef.current) {
      previewContentRef.current.innerText = value;
    }
  }, [value]);

  const isSendDisabled = useMemo(() => {
    return disabled || !value.trim() || isUploadingAttachment;
  }, [disabled, isUploadingAttachment, value]);

  useImperativeHandle(ref, () => ({
    clearInput: () => setValue(''),
    setAsk: (messages = []) => {
      setValue(Array.isArray(messages) ? messages.join('') : '');
      setContainerFocus(true);
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    focusInput: () => {
      setContainerFocus(true);
      inputRef.current?.focus();
    },
    getProblem: () => value || '',
  }), [value]);

  const domProps = disabled ? {} : { onDragOver, onDragLeave, onDrop };

  return (
    <div className={classNames('sea-ai-ask-chat-input-wrapper', { disabled })} {...domProps}>
      <ClickOutside onClickOutside={onContainerBlur}>
        <div className={classNames('sea-ai-ask-chat-input-container', { 'focus': containerFocus, 'dragging': isDragging })} onClick={disabled ? () => {} : handleFocus}>
          {attachments && attachments.length > 0 && (
            <AttachmentsFormatter
              value={attachments}
              onRemove={removeAttachment}
              onReupload={onAttachmentReupload}
            />
          )}
          <div className="sea-ai-ask-chat-input-content">
            <textarea
              autoFocus
              className="message-input message-input-value"
              ref={inputRef}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={onPaste}
              placeholder={isEmpty ? gettext('Ask anything about your files') : ''}
              rows={1}
              disabled={disabled}
            />
            <div ref={previewContentRef} className="message-input message-input-preview" />
          </div>
          <div className="sea-ai-ask-chat-operations-container">
            <div className="sea-ai-ask-chat-operations-container-left">
              <LibraryFilesSelector
                repoID={repoID}
                value={attachments}
                onChange={updateAttachments}
                disabled={disabled}
                imageCount={imageAttachments.length}
                onFileInputClick={onFileInputClick}
              />
            </div>
            <div className="sea-ai-ask-chat-operations-container-right">
              <div className="sea-ai-model-selector">
                <AIModelSelector selectedModel={selectedModel} updateModel={setSelectedModel} />
              </div>
              <span id="sea-ai-chat-send-tooltip" className="d-inline-flex">
                <button
                  type="button"
                  className={classNames('btn p-0 border-0 d-flex align-items-center justify-content-center sea-ai-ask-icon-btn icon-send-wrapper no-hover-bg', { 'disabled': isSendDisabled })}
                  onClick={handleSend}
                  disabled={isSendDisabled}
                  aria-label={gettext('Send')}
                >
                  <Icon symbol="btn-send" className="sea-ai-icon-svg" />
                </button>
              </span>
              <Tooltip target="sea-ai-chat-send-tooltip" placement="top">
                {isUploadingAttachment ? gettext('Uploading...') : gettext('Send')}
              </Tooltip>
            </div>
          </div>
          <input
            ref={uploadInputRef}
            className="d-none"
            type="file"
            accept={AI_CHAT_IMAGE_ACCEPT}
            onChange={onFileInputChange}
          />
          {isDragging && (
            <div className="sea-ai-ask-chat-input-dragging-tip">
              <Icon symbol="upload-files" className="sea-ai-ask-chat-input-dragging-tip-icon" />
              <div className="sea-ai-ask-chat-input-dragging-tip-text">{gettext('Drop here')}</div>
            </div>
          )}
        </div>
      </ClickOutside>
    </div>
  );
});

ChatInput.propTypes = {
  isReply: PropTypes.bool,
  readOnly: PropTypes.bool,
  repoID: PropTypes.string,
  sendMessage: PropTypes.func.isRequired,
  isEmpty: PropTypes.bool,
};

export default ChatInput;
