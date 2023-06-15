import SimpleText from './simple-text';
import FormulaFormatter from './formula-formatter';
import SingleSelect from './single-select';
import NumberEditor from './number-editor';
import DateEditor from './date-editor';
import { LEDGER_COLUMN_TYPE } from '../../../../constants';


const CONFIG = {
  [LEDGER_COLUMN_TYPE.TEXT]: SimpleText,
  [LEDGER_COLUMN_TYPE.FORMULA]: FormulaFormatter,
  [LEDGER_COLUMN_TYPE.SINGLE_SELECT]: SingleSelect,
  [LEDGER_COLUMN_TYPE.NUMBER]: NumberEditor,
  [LEDGER_COLUMN_TYPE.DATE]: DateEditor,
};

export default CONFIG;
