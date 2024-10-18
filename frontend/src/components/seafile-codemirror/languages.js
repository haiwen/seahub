import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { shell } from '@codemirror/legacy-modes/mode/shell';
import { html } from '@codemirror/lang-html';
import { loadLanguage } from '@uiw/codemirror-extensions-langs';
import { Utils } from '../../utils/utils';

export const getLanguageExtensions = (fileExt) => {
  const mode = Utils.chooseLanguage(fileExt);

  switch (mode) {
    case 'javascript':
      return [javascript({ jsx: true })];
    case 'python':
      return [python()];
    case 'cpp':
    case 'c':
      return [cpp()];
    case 'java':
      return [java()];
    case 'shell':
      return [shell()];
    case 'html':
      return [html()];
    default:
      return [loadLanguage(mode)];
  }
};
