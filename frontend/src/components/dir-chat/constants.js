import { gettext } from '@/utils/constants';

export const STORAGE_CHAT_HISTORY_RECORDS_COUNT = 20;

export const CHAT_MESSAGE_TYPE = {
  GROUP: 'group',
  AI_REPLY: 'ai_reply',
  TIP: 'tip',
  ERROR: 'error',
  TEXT: 'text',
  SOURCES: 'sources',
  THOUGHT_PROCESS: 'thought_process',
  ATTACHMENTS: 'attachments',
};

export const ASK_PAGE_SLUG_ID = {
  NEW: 'new',
};

export const SESSION_TAB_TYPE = {
  MINE: 'mine',
  TEAM: 'team',
};

export const SINGLE_LLM_MODEL = {
  label: gettext('AI'),
  model: 'default',
};
