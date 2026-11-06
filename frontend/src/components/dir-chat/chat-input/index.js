import React, { useCallback, useEffect, useMemo, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import { chatAPI } from '@/api/chat-api';
import { gettext } from '@/utils/constants';
import ClickOutside from '../../click-outside';
import Icon from '../../icon';
import Tooltip from '../../tooltip';
import { useAIChatTools } from '../hooks';
import AIModelSelector from './ai-model-selector';
import AttachmentsFormatter from './attachments';
import LibraryFilesSelector from './library-files-selector';
import { getSkillOptions, hasTaskInput } from './skill-commands';

import './index.css';

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
  const [skills, setSkills] = useState([]);
  const [skillSelectorClosed, setSkillSelectorClosed] = useState(false);
  const [activeSkillIndex, setActiveSkillIndex] = useState(0);
  const skillOptions = useMemo(() => skillSelectorClosed ? [] : getSkillOptions(value, skills), [value, skills, skillSelectorClosed]);

  useEffect(() => {
    let mounted = true;
    chatAPI.getBuiltinSkills().then(({ data }) => {
      if (mounted) setSkills((data.skills || []).filter((skill) => typeof skill.name === 'string' && typeof skill.description === 'string'));
    }).catch(() => {}); // Skill discovery must not block ordinary chat.
    return () => { mounted = false; };
  }, []);

  const selectSkill = useCallback((name) => {
    setValue(`/${name} `);
    setSkillSelectorClosed(true);
    inputRef.current?.focus();
  }, []);

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
    if (disabled || !hasTaskInput(value, skills)) return;
    sendMessage({
      message: value,
      attachments,
      model: selectedModel,
    });
    setValue('');
    clearAttachments();
  }, [attachments, clearAttachments, selectedModel, sendMessage, value, disabled, skills]);

  const handleKeyDown = useCallback((event) => {
    if (event.nativeEvent.isComposing) return;
    if (skillOptions.length > 0) {
      if (event.key === 'Escape') {
        setSkillSelectorClosed(true);
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveSkillIndex((index) => (index + (event.key === 'ArrowDown' ? 1 : -1) + skillOptions.length) % skillOptions.length);
        return;
      }
      if (event.key === 'Tab' || (event.key === 'Enter' && !event.shiftKey)) {
        event.preventDefault();
        selectSkill(skillOptions[activeSkillIndex % skillOptions.length].name);
        return;
      }
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend(event);
    }
  }, [handleSend, skillOptions, activeSkillIndex, selectSkill]);

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
    return disabled || !hasTaskInput(value, skills);
  }, [disabled, value, skills]);

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
              onChange={(event) => {
                setValue(event.target.value);
                setSkillSelectorClosed(false);
                setActiveSkillIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder={isEmpty ? gettext('Ask anything about your files') : ''}
              rows={1}
              disabled={disabled}
            />
            <div ref={previewContentRef} className="message-input message-input-preview" />
            {skillOptions.length > 0 && !disabled && (
              <div className="sea-ai-skill-options" role="listbox" aria-label={gettext('Skills')}>
                {skillOptions.map((skill, index) => (
                  <button type="button" role="option" aria-selected={index === activeSkillIndex} key={skill.name}
                    className={classNames('sea-ai-skill-option', { active: index === activeSkillIndex })}
                    onMouseDown={(event) => event.preventDefault()} onClick={() => selectSkill(skill.name)}>
                    <strong>/{skill.name}</strong>
                    <span>{skill.description}</span>
                  </button>
                ))}
              </div>
            )}
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
                {gettext('Send')}
              </Tooltip>
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
  isEmpty: PropTypes.bool,
};

export default ChatInput;
