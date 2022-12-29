import React from 'react';
import PropTypes from 'prop-types';
import CodeMirror from '@uiw/react-codemirror';
import { loadLanguage } from '@uiw/codemirror-extensions-langs';
import { Utils } from '../../utils/utils';

import './style.css';

const DEFAULT_CODEMIRROR_OPTIONS = {
  lineNumbers: true,
  highlightActiveLineGutter: false,
  highlightActiveLine: false,
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
    const extensions = loadLanguage(mode);
    if (extensions) {
      return {
        theme: 'light',
        readOnly: readOnly,
        extensions: extensions,
      };
    }
    return {
      theme: 'light',
      readOnly: readOnly,
    };
  }

  onChange = (value) => {
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
          {...options}
          onChange={this.onChange}
          basicSetup={DEFAULT_CODEMIRROR_OPTIONS}
        />
      </div>
    );
  }
}

SeafileCodeMirror.propTypes = propTypes;

export default SeafileCodeMirror;
