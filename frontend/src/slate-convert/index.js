import mdStringToSlate from './md-to-slate';
import slateToMdString from './slate-to-md';
import processor from './md-to-html';
import deserializeHtml from './html-to-slate';

export {
  mdStringToSlate,
  slateToMdString,
  processor, // md string to html
  deserializeHtml, // html -> slate notes
};
