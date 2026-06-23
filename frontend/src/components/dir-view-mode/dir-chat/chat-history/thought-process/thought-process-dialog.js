import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody } from 'reactstrap';
import { gettext } from '../../../../../utils/constants';
import SeahubModalHeader from '@/components/common/seahub-modal-header';
import ProcessDetails from './process-details';

import './thought-process-dialog.css';

const tryParseJSON = (value) => {
  if (typeof value !== 'string') return value;

  const trimmedValue = value.trim();
  if (!trimmedValue || !['{', '['].includes(trimmedValue[0])) return value;

  try {
    return JSON.parse(trimmedValue);
  } catch (error) {
    return value;
  }
};

const hasValue = (value) => value !== undefined && value !== null && value !== '';

const toTitleCaseLabel = (value) => value
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (character) => character.toUpperCase());

const buildLeafNode = (name, value) => ({
  name,
  value: hasValue(value) ? value : '',
});

const formatTimeUsage = (value) => `${Number(value || 0).toFixed(2)} s`;

const buildGenericNode = (name, value, options = {}) => {
  if (Array.isArray(value)) {
    return {
      name,
      ...options,
      children: value.map((item, index) => buildGenericNode(String(index + 1), item)),
    };
  }

  if (value && typeof value === 'object') {
    return {
      name,
      ...options,
      children: Object.entries(value).map(([key, item]) => buildGenericNode(toTitleCaseLabel(key), item)),
    };
  }

  return buildLeafNode(name, value);
};

const buildStatisticsNode = (data = {}) => {
  const children = [];
  const actionTimeUsage = (Array.isArray(data.actions) ? data.actions : []).reduce((sum, action) => sum + Number(action?.time_usage || 0), 0);
  const answerTimeUsage = Number(data.final_answer?.time_usage || 0);
  const totalTimeUsage = hasValue(data.time_usage) ? Number(data.time_usage || 0) : actionTimeUsage + answerTimeUsage;

  if (totalTimeUsage > 0) {
    children.push(buildLeafNode(gettext('Time usage'), formatTimeUsage(totalTimeUsage)));
  }

  if (actionTimeUsage > 0) {
    children.push(buildLeafNode(gettext('Action steps'), formatTimeUsage(actionTimeUsage)));
  }

  if (answerTimeUsage > 0) {
    children.push(buildLeafNode(gettext('Answer generation'), formatTimeUsage(answerTimeUsage)));
  }

  if (hasValue(data.final_answer?.token_usage?.total_tokens) || hasValue(data.actions?.some((action) => action?.token_usage))) {
    const actionTokenUsage = (Array.isArray(data.actions) ? data.actions : []).reduce((sum, action) => sum + Number(action?.token_usage?.total_tokens || 0), 0);
    const answerTokenUsage = Number(data.final_answer?.token_usage?.total_tokens || 0);
    const actionInputTokens = (Array.isArray(data.actions) ? data.actions : []).reduce((sum, action) => sum + Number(action?.token_usage?.input_tokens || 0), 0);
    const actionOutputTokens = (Array.isArray(data.actions) ? data.actions : []).reduce((sum, action) => sum + Number(action?.token_usage?.output_tokens || 0), 0);
    const answerInputTokens = Number(data.final_answer?.token_usage?.input_tokens || 0);
    const answerOutputTokens = Number(data.final_answer?.token_usage?.output_tokens || 0);

    children.push(buildLeafNode(gettext('Token usages'), `${actionTokenUsage + answerTokenUsage} (↑${actionInputTokens + answerInputTokens}, ↓${actionOutputTokens + answerOutputTokens})`));
    if (actionTokenUsage > 0) {
      children.push(buildLeafNode(gettext('Action steps'), `${actionTokenUsage} (↑${actionInputTokens}, ↓${actionOutputTokens})`));
    }
    if (answerTokenUsage > 0) {
      children.push(buildLeafNode(gettext('Answer generation'), `${answerTokenUsage} (↑${answerInputTokens}, ↓${answerOutputTokens})`));
    }
  }

  return children.length > 0 ? {
    id: 'statistics',
    name: gettext('Statistics'),
    key: 'statistics',
    icon: 'statistics',
    isPrimaryContainer: true,
    children,
  } : null;
};

// eslint-disable-next-line
const buildToolCallNode = (toolCall, index) => {
  const children = [];

  if (hasValue(toolCall?.arguments)) {
    children.push(buildGenericNode(gettext('Arguments'), toolCall.arguments));
  }

  if (hasValue(toolCall?.execution_detail)) {
    children.push(buildGenericNode(gettext('Execution detail'), toolCall.execution_detail));
  }

  return {
    name: `${gettext('Tool call')} ${index + 1}: ${toolCall?.name || '-'}`,
    key: `tool_call_${index + 1}`,
    children,
  };
};

const buildActionNode = (action, index) => {
  const toolCall = Array.isArray(action?.tool_calls) ? action.tool_calls[0] : null;
  const children = [];

  if (toolCall) {
    if (hasValue(toolCall.arguments)) {
      children.push(buildGenericNode(gettext('Arguments'), toolCall.arguments));
    }

    if (hasValue(toolCall.execution_detail)) {
      children.push(buildGenericNode(gettext('Execution detail'), toolCall.execution_detail));
    }
  }

  return {
    name: `${gettext('Step')} ${index + 1}: ${toolCall?.name || action?.tool_name || action?.type || '-'}`,
    key: `step_${index + 1}`,
    children: children.filter(Boolean),
  };
};

const buildTaskStepNode = (task = {}) => {
  const children = [];

  if (hasValue(task.system_prompts)) {
    children.push({
      name: gettext('System prompts'),
      key: 'system_prompts',
      children: task.system_prompts.map((prompt, index) => buildLeafNode(`${gettext('Prompt')} ${index + 1}`, prompt)),
    });
  }

  if (hasValue(task.user_input)) {
    const userInput = task.user_input;
    const userInputChildren = [];

    if (hasValue(userInput.raw)) userInputChildren.push(buildLeafNode(gettext('Raw'), userInput.raw));
    if (hasValue(userInput.message)) userInputChildren.push(buildLeafNode(gettext('Message'), userInput.message));
    if (Array.isArray(userInput.attachments) && userInput.attachments.length > 0) {
      userInputChildren.push({
        name: gettext('Attachments'),
        key: 'attachments',
        children: userInput.attachments.map((attachment, index) => buildGenericNode(String(index + 1), attachment)),
      });
    }

    children.push({
      name: gettext('User input'),
      key: 'user_input',
      children: userInputChildren,
    });
  }

  return {
    id: 'task_step',
    name: gettext('Task step'),
    icon: 'task-step',
    isPrimaryContainer: true,
    children,
  };
};

const buildActionStepsNode = (actions = []) => ({
  id: 'action_steps',
  name: gettext('Action steps'),
  icon: 'action-steps',
  isPrimaryContainer: true,
  children: actions.map((action, index) => buildActionNode(action, index)),
});

const buildAnswerGenerationNode = (finalAnswer = {}) => ({
  id: 'answer_generation',
  name: gettext('Answer generation'),
  icon: 'answer-generation',
  isPrimaryContainer: true,
  children: [
    ...(hasValue(finalAnswer.result) ? [buildLeafNode(gettext('Result'), finalAnswer.result)] : []),
  ],
});

const buildThoughtProcessTree = (value) => {
  if (!value || typeof value !== 'object') {
    return [];
  }

  const nodes = [];
  const task = value.task || {};

  nodes.push(buildTaskStepNode(task));

  if (Array.isArray(value.actions) && value.actions.length > 0) {
    nodes.push(buildActionStepsNode(value.actions));
  }

  if (hasValue(value.final_answer)) {
    nodes.push(buildAnswerGenerationNode(value.final_answer));
  }

  const statisticsNode = buildStatisticsNode(value);
  if (statisticsNode) {
    nodes.push({
      id: 'statistics',
      ...statisticsNode,
    });
  }

  return nodes;
};

const ThoughtProcessDialog = ({ isOpen, toggle, value }) => {
  if (!isOpen) {
    return null;
  }

  const parsedValue = tryParseJSON(value);
  const thoughtProcessTree = buildThoughtProcessTree(parsedValue);

  return (
    <Modal isOpen={true} toggle={toggle} autoFocus={false} size="lg" className="sea-ai-thought-process-dialog">
      <SeahubModalHeader toggle={toggle}>
        {gettext('Thought process')}
      </SeahubModalHeader>
      <ModalBody className="sea-ai-thought-process sea-ai-thought-process-body">
        <div className="sea-ai-thought-process-content sea-ai-thought-process-content">
          {thoughtProcessTree.map((node) => (
            <ProcessDetails value={node} key={node.id} />
          ))}
        </div>
      </ModalBody>
    </Modal>
  );
};

ThoughtProcessDialog.propTypes = {
  isOpen: PropTypes.bool,
  toggle: PropTypes.func.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
};

export default ThoughtProcessDialog;
