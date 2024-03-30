import deepmerge from 'deepmerge';
import { defaultSchema } from 'hast-util-sanitize';

const customSchema = {
  'tagNames': [
    'input',
    'code',
    'span',
    'div',
    'blockquote',
    'pre',
  ],
  'attributes': {
    'input': [
      'type',
    ],
    'li': [
      'className'
    ],
    'code': [
      'className',
    ],
    'span': [
      'className'
    ],
    'div': [
      'className'
    ]
  },
  'protocols': {
    'src': [
      'http',
      'https',
      'cid',
    ],
  }
};

const sanitizeSchema = deepmerge(defaultSchema, customSchema);

export default sanitizeSchema;
