import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { gettext } from '../../../../utils/constants';
import { Utils } from '../../../../utils/utils';
import CenteredLoading from '../../../centered-loading';
import Icon from '../../../icon';
import toaster from '../../../toast';
import { eventBus } from '../../../common/event-bus';
import { EVENT_BUS_TYPE } from '../../../common/event-bus-type';
import { chatAPI } from '../../../../utils/chat-api';
import { ChatMessage } from '../models';
import { ASK_PAGE_SLUG_ID, CHAT_MESSAGE_TYPE } from '../constants';
import ChatInput from '../chat-input';
import ChatHistory from '../chat-history';
import { Thinking } from '../components';
import { useAskPage, useDocuments, useSessions } from '../hooks';
import ChatHeader from '../chat-header';

import './index.css';

const Chat = ({ repoID, settings }) => {
  const [isReply, setReply] = useState(false);
  const [loading, setLoading] = useState(true);
  const [chatHistories, setChatHistories] = useState([]);

  const timer = useRef(null);
  const chatHistoryContentRef = useRef(null);
  const messageInputRef = useRef(null);
  const currentSessionId = useRef('');
  const newSessionProblem = useRef('');

  const {
    isShowSessions,
    createSession,
    modifyLocalSession,
    getSession,
    getChatMessage,
  } = useSessions();
  const { isShowDocuments, documents } = useDocuments();
  const { pageSlugId, togglePageSlugId } = useAskPage();

  const session = useMemo(() => getSession(pageSlugId), [getSession, pageSlugId]);

  const isSmall = useMemo(() => {
    if (isShowDocuments && Array.isArray(documents) && documents.length > 0) {
      return true;
    }
    return isShowSessions;
  }, [documents, isShowDocuments, isShowSessions]);

  const jumpToBottom = useCallback((delay = 1) => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (!chatHistoryContentRef.current) {
      return;
    }
    timer.current = setTimeout(() => {
      chatHistoryContentRef.current.scrollTop = chatHistoryContentRef.current.scrollHeight;
    }, delay);
  }, []);

  const updateChatHistories = useCallback((newChatHistories, reply = false, callback) => {
    setChatHistories(newChatHistories);
    callback && callback();
    jumpToBottom(reply ? 10 : 50);
  }, [jumpToBottom]);

  const sendMessage = useCallback(({ message, attachments, model }) => {
    const validMessage = message.trim();
    if (!validMessage) {
      messageInputRef.current?.focusInput();
      return;
    }

    const newChatHistories = chatHistories.slice(0);
    newChatHistories.push(new ChatMessage({
      message: {
        [CHAT_MESSAGE_TYPE.TEXT]: validMessage,
        [CHAT_MESSAGE_TYPE.ATTACHMENTS]: attachments,
      },
      isUserSpeak: true,
    }));
    updateChatHistories(newChatHistories, false, () => {
      messageInputRef.current?.clearInput();
    });

    if (pageSlugId !== ASK_PAGE_SLUG_ID.NEW) {
      eventBus.dispatch(EVENT_BUS_TYPE.ASK_QUESTION, {
        sessionId: pageSlugId,
        message: validMessage,
        attachments,
        model,
      });
      return;
    }

    createSession(validMessage.slice(0, 100)).then((newSession) => {
      const newSessionId = newSession._id;
      currentSessionId.current = newSessionId;
      newSessionProblem.current = '';
      togglePageSlugId(newSessionId);
      setTimeout(() => {
        eventBus.dispatch(EVENT_BUS_TYPE.ASK_QUESTION, {
          sessionId: newSessionId,
          message: validMessage,
          attachments,
          model,
        });
      }, 3);
    });
  }, [chatHistories, createSession, pageSlugId, togglePageSlugId, updateChatHistories]);

  useEffect(() => {
    if (currentSessionId.current === pageSlugId) {
      return;
    }

    const problem = messageInputRef.current?.getProblem() || '';
    if (currentSessionId.current && currentSessionId.current !== ASK_PAGE_SLUG_ID.NEW) {
      modifyLocalSession(currentSessionId.current, { problem });
    } else {
      newSessionProblem.current = problem;
    }

    currentSessionId.current = pageSlugId;
    updateChatHistories([]);
    setLoading(true);

    if (pageSlugId === ASK_PAGE_SLUG_ID.NEW) {
      setLoading(false);
      return;
    }

    chatAPI.getChatMessages(pageSlugId).then((res) => {
      const {
        messages: historyMessages,
        running_task,
        user_input,
      } = res.data;

      const messages = Array.isArray(historyMessages) ? historyMessages.map((item) => {
        if (item.role === 'user') {
          return new ChatMessage({
            id: item.id,
            message: {
              [CHAT_MESSAGE_TYPE.TEXT]: item.content,
              [CHAT_MESSAGE_TYPE.ATTACHMENTS]: item.attachments || [],
            },
            isUserSpeak: true,
          });
        }

        const newChatData = {
          [CHAT_MESSAGE_TYPE.AI_REPLY]: item.content || '',
          [CHAT_MESSAGE_TYPE.SOURCES]: Array.isArray(item.sources) ? item.sources : [],
          [CHAT_MESSAGE_TYPE.THOUGHT_PROCESS]: item.thought_process,
        };
        return new ChatMessage({
          id: item.id,
          message: newChatData,
          type: CHAT_MESSAGE_TYPE.GROUP,
        });
      }) : [];

      if (running_task) {
        setReply(true);
        const { message = '', attachments = [] } = user_input || {};
        messages.push(new ChatMessage({
          message: {
            [CHAT_MESSAGE_TYPE.TEXT]: message,
            [CHAT_MESSAGE_TYPE.ATTACHMENTS]: attachments,
          },
          isUserSpeak: true,
        }));
      }

      updateChatHistories(messages);
      setLoading(false);

      if (running_task) {
        getChatMessage(pageSlugId);
      }
    }).catch((error) => {
      toaster.danger(Utils.getErrorMsg(error));
      setLoading(false);
    });
  }, [getChatMessage, modifyLocalSession, pageSlugId, repoID, updateChatHistories]);

  useEffect(() => {
    setReply(Boolean(session?.is_replying));
  }, [session?.is_replying]);

  useEffect(() => {
    if (pageSlugId !== ASK_PAGE_SLUG_ID.NEW) {
      messageInputRef.current?.setAsk([session?.problem || '']);
      return;
    }
    messageInputRef.current?.setAsk([newSessionProblem.current || '']);
  }, [pageSlugId, session?.problem]);

  useEffect(() => {
    const unsubscribeAIReply = eventBus.subscribe(EVENT_BUS_TYPE.AI_REPLY, (replySessionId, { data, error }, callback) => {
      modifyLocalSession(replySessionId, { is_replying: false, running_task: false });
      if (replySessionId !== pageSlugId) {
        callback && callback(replySessionId, true);
        return;
      }

      setReply(false);
      const newChatHistories = chatHistories.slice(0);
      if (error) {
        newChatHistories.push(new ChatMessage({
          message: { [CHAT_MESSAGE_TYPE.TEXT]: gettext(Utils.getErrorMsg(error)) },
          type: CHAT_MESSAGE_TYPE.ERROR,
        }));
        updateChatHistories(newChatHistories, false);
        callback && callback(replySessionId, false);
        return;
      }

      const {
        ai_reply = '',
        sources = [],
        user_message_id: userMessageId,
        ai_reply_message_id: aiReplyMessageId,
      } = data;
      const messageIndex = newChatHistories.findIndex((chat) => chat._id === aiReplyMessageId);
      if (messageIndex > -1) {
        return;
      }

      const newChatData = {
        [CHAT_MESSAGE_TYPE.AI_REPLY]: ai_reply,
        [CHAT_MESSAGE_TYPE.SOURCES]: sources,
        [CHAT_MESSAGE_TYPE.THOUGHT_PROCESS]: data.thought_process,
      };
      if (newChatHistories[newChatHistories.length - 1]) {
        newChatHistories[newChatHistories.length - 1]._id = userMessageId;
      }
      newChatHistories.push(new ChatMessage({
        id: aiReplyMessageId,
        message: newChatData,
        type: CHAT_MESSAGE_TYPE.GROUP,
      }));
      updateChatHistories(newChatHistories, false);
      callback && callback(replySessionId, false);
    });

    const unsubscribeAIStreamReply = eventBus.subscribe(EVENT_BUS_TYPE.AI_STREAM_REPLY, (replySessionId, { res, error }, callback) => {
      modifyLocalSession(replySessionId, { is_replying: false });
      if (replySessionId !== pageSlugId) {
        callback && callback(replySessionId, true);
        return;
      }

      setReply(false);
      const newChatHistories = chatHistories.slice(0);

      const onError = (currentChatHistories, streamError) => {
        const errorMessage = streamError ? Utils.getErrorMsg(streamError) : gettext('Error');
        const nextChatHistories = currentChatHistories.slice(0);
        nextChatHistories.push(new ChatMessage({
          message: { [CHAT_MESSAGE_TYPE.TEXT]: errorMessage },
          type: CHAT_MESSAGE_TYPE.ERROR,
        }));
        updateChatHistories(nextChatHistories, false);
        modifyLocalSession(replySessionId, { running_task: false });
        callback && callback(replySessionId);
      };

      if (error) {
        onError(newChatHistories, error);
        return;
      }

      if (!res.ok) {
        onError(newChatHistories);
        return;
      }

      const updateStreamReply = (currentChatHistories, replyData, messageIdPrefix = '') => {
        const nextChatHistories = currentChatHistories.slice(0);
        const {
          ai_reply = '',
          sources = [],
          user_message_id: userMessageId,
          ai_reply_message_id: aiReplyMessageId,
        } = replyData;
        const messageIndex = nextChatHistories.findIndex((chat) => chat._id === aiReplyMessageId);
        if (messageIndex > -1) {
          return;
        }
        const newChatData = {
          [CHAT_MESSAGE_TYPE.AI_REPLY]: ai_reply,
          [CHAT_MESSAGE_TYPE.SOURCES]: sources,
          [CHAT_MESSAGE_TYPE.THOUGHT_PROCESS]: replyData.thought_process,
        };
        if (nextChatHistories[nextChatHistories.length - 1]) {
          nextChatHistories[nextChatHistories.length - 1]._id = userMessageId;
        }
        nextChatHistories.push(new ChatMessage({
          id: messageIdPrefix + aiReplyMessageId,
          message: newChatData,
          type: CHAT_MESSAGE_TYPE.GROUP,
        }));
        updateChatHistories(nextChatHistories, false);
      };

      let fullText = '';
      let nextChatHistories = newChatHistories.slice(0);

      let chatMessage = new ChatMessage({
        id: 'typing',
        message: {
          [CHAT_MESSAGE_TYPE.AI_REPLY]: '',
          [CHAT_MESSAGE_TYPE.SOURCES]: [],
          [CHAT_MESSAGE_TYPE.THOUGHT_PROCESS]: 'disabled',
        },
        type: CHAT_MESSAGE_TYPE.GROUP,
      });
      const lastMessage = nextChatHistories[nextChatHistories.length - 1];
      if (lastMessage && lastMessage._id === 'typing') {
        chatMessage = lastMessage;
        fullText = lastMessage.message[CHAT_MESSAGE_TYPE.AI_REPLY] || '';
      } else {
        nextChatHistories.push(chatMessage);
      }

      const onMessage = ({ status, answer, results }, { done = false } = {}) => {
        if (answer) {
          fullText += answer || '';
          nextChatHistories = nextChatHistories.slice(0);
          const lastChatMessage = {
            ...nextChatHistories[nextChatHistories.length - 1],
            message: {
              [CHAT_MESSAGE_TYPE.TEXT]: '',
              [CHAT_MESSAGE_TYPE.AI_REPLY]: fullText,
              [CHAT_MESSAGE_TYPE.SOURCES]: [],
              [CHAT_MESSAGE_TYPE.THOUGHT_PROCESS]: 'disabled',
            },
          };
          nextChatHistories[nextChatHistories.length - 1] = lastChatMessage;
          updateChatHistories(nextChatHistories, false);
        }

        if (status && status.type) {
          nextChatHistories = nextChatHistories.slice(0);
          const lastChatMessage = {
            ...nextChatHistories[nextChatHistories.length - 1],
            message: {
              [CHAT_MESSAGE_TYPE.TEXT]: status.type + (status.detail ? ` (${status.detail})` : ''),
              [CHAT_MESSAGE_TYPE.SOURCES]: [],
              [CHAT_MESSAGE_TYPE.THOUGHT_PROCESS]: 'disabled',
            },
          };
          nextChatHistories[nextChatHistories.length - 1] = lastChatMessage;
          updateChatHistories(nextChatHistories, false);
        }

        if (results) {
          nextChatHistories = nextChatHistories.slice(0, -1);
          updateStreamReply(nextChatHistories, results);
        }

        if (done) {
          modifyLocalSession(replySessionId, { running_task: false });
          callback && callback(replySessionId);
        }
      };

      const processLines = (lines, done = false) => {
        const messages = [];

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataString = line.substring(6).trim();

            if (dataString === '[DONE]') {
              onMessage({}, { done: true });
              return messages;
            }
            if (dataString) {
              try {
                const data = JSON.parse(dataString);
                messages.push(data);
                onMessage(data, { done });
              } catch (streamError) {
                const data = { raw: dataString };
                messages.push(data);
                onMessage(data, { done });
              }
            }
          } else if (line.startsWith('event: ')) {
            const eventName = line.substring(7).trim();
            onMessage({ event: eventName }, { done });
          }
        }

        return messages;
      };

      const processBuffer = (buffer) => {
        if (buffer.trim()) {
          return processLines(buffer.split('\n'), true);
        }
        return [];
      };

      const createEventStreamReader = (readableStream) => {
        if (!readableStream || !readableStream.getReader) {
          return null;
        }

        const reader = readableStream.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        return {
          readNext: async () => {
            try {
              const { done, value } = await reader.read();
              if (done) {
                processBuffer(buffer);
                return { done: true };
              }

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';
              const messages = processLines(lines);
              return { done: false, messages };
            } catch (streamError) {
              onError(nextChatHistories.slice(0, -1), streamError);
              throw streamError;
            }
          },

          cancel: () => {
            reader.cancel();
          },

          [Symbol.asyncIterator]: function () {
            const self = this;
            return {
              next: async () => {
                const result = await self.readNext();
                if (result.done) {
                  return { done: true };
                }
                return { done: false, value: result.messages };
              },
            };
          },
        };
      };

      const reader = createEventStreamReader(res.body);
      if (!reader) {
        onError(newChatHistories);
        return;
      }

      const readNext = async () => {
        const result = await reader.readNext();
        if (!result.done) {
          readNext();
        }
      };
      readNext();
    });

    return () => {
      unsubscribeAIReply();
      unsubscribeAIStreamReply();
    };
  }, [chatHistories, modifyLocalSession, pageSlugId, updateChatHistories]);

  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, []);

  const isEmpty = chatHistories.length === 0 && !loading;
  const isNewChat = pageSlugId === ASK_PAGE_SLUG_ID.NEW;
  const effectiveIsReply = loading || isReply;

  return (
    <div className={classNames('sea-ai-ask-wrapper', { empty: isEmpty && isNewChat, 'small-page': isSmall, 'has-header': !isNewChat })}>
      {!isNewChat && (
        <div className="sea-ai-ask-chats-header">
          <ChatHeader session={session} isEmpty={isEmpty} customHeaderTitle={session?.problem || session?.name} />
        </div>
      )}
      <div className="sea-ai-ask-chats-body" ref={chatHistoryContentRef}>
        <div className={classNames('sea-ai-ask-chats', { 'pb-0': isEmpty, 'justify-content-center': isEmpty && !isNewChat })}>
          {isEmpty && (
            <div className="sea-ai-ask-chats-tip">
              <Icon symbol="chat-decoration" className="sea-ai-ask-chats-tip-icon" />
              <div className="sea-ai-ask-chats-tip-title">{gettext('How can I help you?')}</div>
              <div className="sea-ai-ask-chats-tip-description">
              </div>
            </div>
          )}
          {!loading && chatHistories.map((chat, index) => (
            <ChatHistory
              key={`chat-${index}-${chat._id || ''}`}
              chat={chat}
              settings={settings}
              repoID={repoID}
            />
          ))}
          {!loading && isReply && <Thinking />}
          {loading && <CenteredLoading className="flex-1" />}
        </div>
      </div>
      <div className="sea-ai-ask-chats-footer">
        <ChatInput
          ref={messageInputRef}
          isReply={effectiveIsReply}
          readOnly={Boolean(session?.running_task)}
          repoID={repoID}
          sendMessage={sendMessage}
        />
      </div>
    </div>
  );
};

Chat.propTypes = {
  repoID: PropTypes.string.isRequired,
  settings: PropTypes.object,
};

export default Chat;
