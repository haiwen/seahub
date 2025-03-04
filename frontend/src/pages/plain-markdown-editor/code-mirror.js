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

    // 初始化编辑器
    this.view = new EditorView({
      doc: initialValue,
      extensions: [
        // basicSetup: 一个基本的编辑器配置，包括了光标、选择、滚动条等基本功能
        basicSetup,
        // markdown:  markdown 语言的解析器
        // languages:  一个对象，key 是语言的名称，value 是语言对应的解析器
        markdown({ codeLanguages: languages }),
        // EditorView.updateListener: 一个监听器，每当编辑器的状态更新时，会被调用
        EditorView.updateListener.of((viewUpdate) => {
          this.onValueChanged(viewUpdate);
        }),
        // EditorView.lineWrapping:  使得编辑器支持自动换行
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
    // 父节点重新渲染时，初始化变化，重新渲染编辑器
    if (!prevProps.initialValue && prevProps.initialValue !== this.props.initialValue) {
      // 用新的值替换全部旧的值
      this.view.dispatch({
        changes: {
          from: 0,
          to: this.view.state.doc.length,
          insert: this.props.initialValue,
        },
      });
    }
  }

  // 双向的值的变化
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
