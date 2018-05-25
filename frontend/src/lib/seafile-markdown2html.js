var unified = require('unified');
var remark = require('remark');
var markdown = require('remark-parse');
var slug = require('remark-slug');
var remark2rehype = require('remark-rehype');
var format = require('rehype-format');
var raw = require('rehype-raw');
var xtend = require('xtend');
var toHTML = require('hast-util-to-html');
var sanitize = require('hast-util-sanitize');
// var github = require('hast-util-sanitize/lib/github');


function stringify(config) {
  var settings = xtend(config, this.data('settings'));

  this.Compiler = compiler;

  function compiler(tree) {
    // use sanity to remove dangerous html, the default is
    // GitHub style sanitation
    var hast = sanitize(tree);
    return toHTML(hast, settings);
  }
}

// markdown -> mdast -> html AST -> html
var processor = unified()
  .use(markdown, {commonmark: true})
  .use(slug)
  .use(remark2rehype, {allowDangerousHTML: true})
  .use(raw)
  .use(format)
  .use(stringify);

var processorGetAST = unified()
  .use(markdown, {commonmark: true})
  .use(slug)

export { processor, processorGetAST };
