import React from 'react';
import PropTypes from 'prop-types';
import CodeMirror from '@uiw/react-codemirror';
import { getLanguageExtensions } from './languages';
import { myTheme } from './theme';

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

  onChange = (value) => {
    this.props.onChange && this.props.onChange(value);
  };

  render() {
    const { value, readOnly = true, fileExt } = this.props;
    const extensions = [...getLanguageExtensions(fileExt).filter(item => item !== null)];
    return (
      <div className='seafile-code-mirror-container'>
        <CodeMirror
          value={value}
          basicSetup={DEFAULT_CODEMIRROR_OPTIONS}
          theme={myTheme}
          readOnly={readOnly}
          editable={!readOnly}
          extensions={extensions}
          onChange={this.onChange}
        />
      </div>
    );
  }
}

SeafileCodeMirror.propTypes = propTypes;

export default SeafileCodeMirror;
