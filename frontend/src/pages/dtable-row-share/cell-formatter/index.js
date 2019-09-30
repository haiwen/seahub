import React from 'react';
import { CELL_TYPE } from '../contants/contants';
import NumberFormatter from './number-formater';

const FormatterConfig = {
  [CELL_TYPE.NUMBER]: <NumberFormatter />
}

export default FormatterConfig;