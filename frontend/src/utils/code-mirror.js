import React from 'react';
import PropTypes from 'prop-types';
import codemirror from 'codemirror';
import lodash from 'lodash';
import className from 'classnames';

const CodeMirrorPropTypes = {
  autoFocus: PropTypes.bool,
  className: PropTypes.any,
  codeMirrorInstance: PropTypes.func,
  defaultValue: PropTypes.string,
  name: PropTypes.string,
  onChange: PropTypes.func,
  onCursorActivity: PropTypes.func,
  onFocusChange: PropTypes.func,
  onScroll: PropTypes.func,
  options: PropTypes.object,
  value: PropTypes.string,
  preserveScrollPosition: PropTypes.bool,
};

class CodeMirror extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isFocused: false,
    };
  }
  
  normalizeLineEndings = (str) => {
    if (!str) return str;
    return str.replace(/\r\n|\r/g, '\n');
  }

  getCodeMirrorInstance = () => {
    return this.props.codeMirrorInstance || codemirror;
  }

  componentDidMount () {
    const codeMirrorInstance = this.getCodeMirrorInstance();
    this.codeMirror = codeMirrorInstance.fromTextArea(this.textareaNode, this.props.options);
    this.codeMirror.on('change', this.codemirrorValueChanged);
    this.codeMirror.on('cursorActivity', this.cursorActivity);
    this.codeMirror.on('focus', this.focusChanged.bind(this, true));
    this.codeMirror.on('blur', this.focusChanged.bind(this, false));
    this.codeMirror.on('scroll', this.scrollChanged);
    this.codeMirror.setValue(this.props.defaultValue || this.props.value || '');
  }

  componentWillUnmount () {
    // is there a lighter-weight way to remove the codemirror instance?
    if (this.codeMirror) {
      this.codeMirror.toTextArea();
    }
  }

  componentWillReceiveProps (nextProps) {
    if (this.codeMirror && nextProps.value !== undefined && nextProps.value !== this.props.value && this.normalizeLineEndings(this.codeMirror.getValue()) !== this.normalizeLineEndings(nextProps.value)) {
      if (this.props.preserveScrollPosition) {
        var prevScrollPosition = this.codeMirror.getScrollInfo();
        this.codeMirror.setValue(nextProps.value);
        this.codeMirror.scrollTo(prevScrollPosition.left, prevScrollPosition.top);
      } else {
        this.codeMirror.setValue(nextProps.value);
      }
    }
    if (typeof nextProps.options === 'object') {
      for (let optionName in nextProps.options) {
        if (nextProps.options.hasOwnProperty(optionName)) {
          this.setOptionIfChanged(optionName, nextProps.options[optionName]);
        }
      }
    }
  }

  setOptionIfChanged = (optionName, newValue) => {
    const oldValue = this.codeMirror.getOption(optionName);
    if (!lodash.isEqual(oldValue, newValue)) {
      this.codeMirror.setOption(optionName, newValue);
    }
  }

  getCodeMirror = () => {
    return this.codeMirror;
  }

  focus = () => {
    if (this.codeMirror) {
      this.codeMirror.focus();
    }
  }

  focusChanged = (focused) => {
    this.setState({
      isFocused: focused,
    });
    this.props.onFocusChange && this.props.onFocusChange(focused);
  }

  cursorActivity = (codemirror) => {
    this.props.onCursorActivity && this.props.onCursorActivity(codemirror);
  }

  scrollChanged = (codemirror) => {
    this.props.onScroll && this.props.onScroll(codemirror.getScrollInfo());
  }

  codemirrorValueChanged  = (doc, change) => {
    if (this.props.onChange && change.origin !== 'setValue') {
      this.props.onChange(doc.getValue(), change);
    }
  }

  render () {
    const editorClassName = className('ReactCodeMirror', this.props.className,
      this.state.isFocused ? 'ReactCodeMirror--focused' : null);
    return (
      <div className={editorClassName}>
        <textarea
          ref={ref => this.textareaNode = ref}
          name={this.props.name || this.props.path}
          defaultValue={this.props.value}
          autoComplete="off"
          autoFocus={this.props.autoFocus}
        />
      </div>
    );
  }

}

CodeMirror.propTypes = CodeMirrorPropTypes;

module.exports = CodeMirror;
