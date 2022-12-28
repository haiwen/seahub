import React from 'react';
import PropTypes from 'prop-types';
import { UnControlled as CodeMirror } from 'react-codemirror2';
import { Utils } from '../../utils/utils';

import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/css/css';
import 'codemirror/mode/clike/clike';
import 'codemirror/mode/php/php';
import 'codemirror/mode/sql/sql';
import 'codemirror/mode/vue/vue';
import 'codemirror/mode/xml/xml';
import 'codemirror/mode/go/go';
import 'codemirror/mode/python/python';
import 'codemirror/mode/htmlmixed/htmlmixed';
import 'codemirror/lib/codemirror.css';

import './style.css';

const DEFAULT_OPTIONS = {
  lineNumbers: true,
  extraKeys: {'Ctrl': 'autocomplete'},
  theme: 'default',
  textWrapping: true,
  lineWrapping: true,
  cursorBlinkRate: -1 // hide the cursor
};

const propTypes = {
  fileExt: PropTypes.string,
  value: PropTypes.string,
  readOnly: PropTypes.bool,
  onChange: PropTypes.func,
};

class SeafileCodeMirror extends React.Component {

  static defaultProps = {
    readOnly: true,
  }

  constructor(props) {
    super(props);
    this.options = null;
  }

  getOptions = () => {
    if (this.options) return this.options;

    const { fileExt, readOnly } = this.props;
    const mode = Utils.chooseLanguage(fileExt);
    const cursorBlinkRate = readOnly ? -1 : 530;
    return { ...DEFAULT_OPTIONS, ...{ mode, cursorBlinkRate } };
  }

  onChange = (editor, data, value) => {
    this.props.onChange && this.props.onChange(value);
  }

  render() {
    const { value } = this.props;
    const options = this.getOptions();
    return (
      <div className='seafile-code-mirror-container'>
        <CodeMirror
          ref="code-mirror-editor"
          value={value}
          options={options}
          onChange={this.onChange}
        />
      </div>
    );
  }
}

SeafileCodeMirror.propTypes = propTypes;

export default SeafileCodeMirror;
