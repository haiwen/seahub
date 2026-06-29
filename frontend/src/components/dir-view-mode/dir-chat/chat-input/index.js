import React, { useCallback, useEffect, useMemo, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { gettext } from '../../../../utils/constants';
import ClickOutside from '../../../click-outside';
import Icon from '../../../icon';
import { useAIChatTools } from '../hooks';
import AIModelSelector from './ai-model-selector';
import AttachmentsFormatter from './attachments';
import LibraryFilesSelector from './library-files-selector';

import './index.css';

const ChatInput = forwardRef(({
  isReply,
  readOnly,
  repoID,
  sendMessage,
}, ref) => {
  const [containerFocus, setContainerFocus] = useState(true);
  const [selectedModel, setSelectedModel] = useState(null);
  const [value, setValue] = useState('');

  const inputRef = useRef(null);
  const previewContentRef = useRef(null);

  const {
    attachments,
    updateAttachments,
    removeAttachment,
    clearAttachments,
  } = useAIChatTools();

  const disabled = isReply || readOnly;

  const handleSend = useCallback((event) => {
    event && event.preventDefault();
    sendMessage({
      message: value,
      attachments,
      model: selectedModel,
    });
    setValue('');
    clearAttachments();
  }, [attachments, clearAttachments, selectedModel, sendMessage, value]);

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
    return disabled || !value.trim();
  }, [disabled, value]);

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

  return (
    <div className={classNames('sea-ai-ask-chat-input-wrapper', { disabled })}>
      <ClickOutside onClickOutside={onContainerBlur}>
        <div className={classNames('sea-ai-ask-chat-input-container', { 'focus': containerFocus })} onClick={disabled ? () => {} : handleFocus}>
          {attachments && attachments.length > 0 && <AttachmentsFormatter value={attachments} onRemove={removeAttachment} />}
          <div className="sea-ai-ask-chat-input-content">
            <textarea
              autoFocus
              className="message-input message-input-value"
              ref={inputRef}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={gettext('Ask anything about your files')}
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
              />
            </div>
            <div className="sea-ai-ask-chat-operations-container-right">
              <div className="sea-ai-model-selector d-none">
                <AIModelSelector selectedModel={selectedModel} updateModel={setSelectedModel} />
              </div>
              <button
                type="button"
                className={classNames('btn p-0 border-0 d-flex align-items-center justify-content-center sea-ai-ask-icon-btn icon-send-wrapper no-hover-bg', { 'disabled': isSendDisabled })}
                onClick={handleSend}
                disabled={isSendDisabled}
                title={gettext('Send')}
              >
                <Icon symbol="btn-send" className="sea-ai-icon-svg" />
              </button>
            </div>
          </div>
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
};

export default ChatInput;
