import React from 'react';
import { CELL_TYPE } from '../contants/contants';
import TextFormatter from './text-formatter';
import NumberFormatter from './number-formater';
import DateFormatter from './date-formatter';

const FormatterConfig = {
  [CELL_TYPE.TEXT]: <TextFormatter />,
  [CELL_TYPE.NUMBER]: <NumberFormatter />,
  [CELL_TYPE.DATE]: <DateFormatter />
}

export default FormatterConfig;