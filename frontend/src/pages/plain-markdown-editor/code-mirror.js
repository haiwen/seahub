import React from 'react';
import PropTypes from 'prop-types';
import className from 'classnames';
import { basicSetup } from 'codemirror';
import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';

import './code-mirror.css';

const propTypes = {
  autoFocus: PropTypes.bool,
  initialValue: PropTypes.string,
  className: PropTypes.string,
  onChange: PropTypes.func,
};

class SeafileCodeMirror extends React.Component {

  componentDidMount() {
    const { initialValue, autoFocus } = this.props;

    this.view = new EditorView({
      doc: initialValue,
      extensions: [
        basicSetup,
        markdown({ codeLanguages: languages }),
        EditorView.updateListener.of((viewUpdate) => {
          this.onValueChanged(viewUpdate);
        }),
        EditorView.lineWrapping
      ],
      parent: this.codeMirrorRef,
    });
    if (autoFocus) this.focus();
  }

  componentWillUnmount() {
    if (this.view) {
      this.view.destroy();
    }
  }

  componentDidUpdate(prevProps) {
    if (!prevProps.initialValue && prevProps.initialValue !== this.props.initialValue) {
      this.view.dispatch({
        changes: {
          from: 0,
          to: this.view.state.doc.length,
          insert: this.props.initialValue,
        },
      });
    }
  }

  onValueChanged = (viewUpdate) => {
    const { onChange } = this.props;
    if (onChange && viewUpdate.docChanged) {
      const doc = viewUpdate.state.doc;
      const value = doc.toString();
      onChange(value);
    }
  };

  focus = () => {
    this.view.focus();
  };

  scrollIntoView = (pos) => {
    EditorView.scrollIntoView(pos);
  };


  setCodeMirrorRef = (ref) => {
    this.codeMirrorRef = ref;
  };

  render() {
    return (
      <div className={className('sf-code-mirror', this.props.className)}>
        <div ref={this.setCodeMirrorRef} />
      </div>
    );
  }

}

SeafileCodeMirror.propTypes = propTypes;

export default SeafileCodeMirror;
