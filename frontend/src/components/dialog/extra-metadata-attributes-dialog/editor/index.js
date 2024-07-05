import SimpleText from './simple-text';
import FormulaFormatter from './formula-formatter';
import SingleSelect from './single-select';
import NumberEditor from './number-editor';
import DateEditor from './date-editor';
import CtimeFormatter from './ctime-formatter';
import { EXTRA_ATTRIBUTES_COLUMN_TYPE } from '../../../../constants';


const CONFIG = {
  [EXTRA_ATTRIBUTES_COLUMN_TYPE.TEXT]: SimpleText,
  [EXTRA_ATTRIBUTES_COLUMN_TYPE.FORMULA]: FormulaFormatter,
  [EXTRA_ATTRIBUTES_COLUMN_TYPE.SINGLE_SELECT]: SingleSelect,
  [EXTRA_ATTRIBUTES_COLUMN_TYPE.NUMBER]: NumberEditor,
  [EXTRA_ATTRIBUTES_COLUMN_TYPE.DATE]: DateEditor,
  [EXTRA_ATTRIBUTES_COLUMN_TYPE.CTIME]: CtimeFormatter,
  [EXTRA_ATTRIBUTES_COLUMN_TYPE.MTIME]: CtimeFormatter,
};

export default CONFIG;
