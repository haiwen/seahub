import React, { useMemo, useEffect } from 'react';
import { mediaUrl, username } from '../../../../utils/constants';
import { Selector } from '../components';

const LLM_MODELS = window.app?.pageOptions?.llmModels || [];
const AI_MODEL_STORAGE_KEY = username ? `sf_ai_chat_selected_model:${username}` : 'sf_ai_chat_selected_model';
const LLM_MODEL_ICON = {
  'openai': `${mediaUrl}img/llm-providers/openai.png`,
  'dashscope': `${mediaUrl}img/llm-providers/dashscope.png`,
  'anthropic': `${mediaUrl}img/llm-providers/anthropic.png`,
  'deepseek': `${mediaUrl}img/llm-providers/deepseek.png`,
  'gemini': `${mediaUrl}img/llm-providers/gemini.png`,
  'unknown': `${mediaUrl}img/llm-providers/unknown.png`,
};

const getModelType = (model) => {
  let type = model?.type || '';
  type = type.toLowerCase();
  if (!type || type === 'openai' || type === 'azure') return 'openai';
  if (type === 'dashscope' || type === 'qwen') return 'dashscope';
  if (type === 'anthropic') return type;
  if (type === 'deepseek') return type;
  if (type === 'gemini') return type;
  if (type === 'other' || type === 'hosted_vllm') {
    let _model = model?.model || '';
    _model = _model.toLowerCase();
    if (_model.startsWith('google') || _model.startsWith('gemini')) return 'gemini';
    if (_model.startsWith('qwen') || _model.startsWith('dashscope')) return 'dashscope';
    if (_model.startsWith('claude')) return 'anthropic';
    if (_model.startsWith('deepseek')) return 'deepseek';
    if (_model.startsWith('openai') || _model.startsWith('gpt') || /^o\d/.test(_model)) return 'openai';
  }
  return 'unknown';
};

const AIModelSelector = ({ isSimple, selectedModel, updateModel }) => {
  const options = useMemo(() => {
    return LLM_MODELS.map((model) => {
      const type = getModelType(model);
      return {
        value: model.model,
        default: model.default,
        label: model.label,
        simple_label: model.label,
        img: LLM_MODEL_ICON[type],
        type,
      };
    });
  }, []);

  useEffect(() => {
    if (!selectedModel && LLM_MODELS.length > 0) {
      const storedModel = window.localStorage.getItem(AI_MODEL_STORAGE_KEY);
      const modelToUse = LLM_MODELS.find((model) => model.model === storedModel) ||
        LLM_MODELS.find((model) => model.default === true) || LLM_MODELS[0];
      updateModel(modelToUse.model);
    }
  }, [selectedModel, updateModel]);

  const handleModelChange = (model) => {
    updateModel(model);
    window.localStorage.setItem(AI_MODEL_STORAGE_KEY, model);
  };

  if (LLM_MODELS.length === 0) return null;
  const option = options.find((model) => model.value === selectedModel) || options.find((model) => model.default === true) || options[0];

  return (
    <Selector
      value={option.value}
      options={options}
      className="sea-ai-model-selector"
      editorClassName="sea-ai-model-selector-editor"
      icon="arrow-down"
      iconPlacement="right"
      border={false}
      onChange={handleModelChange}
      isSearchEnabled={false}
      displayBgColor={true}
      placement="top-start"
    >
      <div className={`sea-ai-model-logo sea-ai-model-logo-${option.type}`}>
        <img src={option.img} alt="" />
      </div>
      <div className="sea-ai-model-name text-truncate">{isSimple ? option?.simple_label : option?.label}</div>
    </Selector>
  );
};

export default AIModelSelector;
