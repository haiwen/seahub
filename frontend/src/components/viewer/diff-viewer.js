import React from 'react';
import { Value } from 'slate';
import { Editor } from '@seafile/slate-react';
import { SlateDiff } from '@seafile/seafile-editor/dist/utils/diff';
import { renderNode, renderMark } from '@seafile/seafile-editor/dist/utils/render-slate.js';
import '@seafile/seafile-editor/dist/css/diff-viewer.css';

class DiffViewer extends React.PureComponent {

  constructor(props) {
    super(props);
    this.value = Value.create();
    this.slateDiff = new SlateDiff();
  }


  renderDiffNode = props => {
    const { node, parent } = props;
    let diffState = node.data.get('diff_state');
    let parentDiffState = parent.data.get('diff_state');
    if (diffState === 'diff-added') {
      if (parentDiffState) {
        if (node.type === 'blockquote' || node.type === 'code_block') {
          return (
            <div className={'diff-added-container'}>
              {renderNode(props)}
            </div>
          );
        }
        return (
          renderNode(props)
        );
      } else {
        return (
          <div className={'diff-added'}>
            {renderNode(props)}
          </div>
        );
      }
    } else if (diffState === 'diff-removed') {
      if (parentDiffState) {
        if (node.type === 'blockquote' || node.type === 'code_block') {
          return (
            <div className={'diff-removed-container'}>
              {renderNode(props)}
            </div>
          );
        }
        return (
          renderNode(props)
        );
      } else {
        return (
          <div className={'diff-removed'}>
            {renderNode(props)}
          </div>
        );
      }
    } else if (diffState === 'diff-replaced') {
      if (parentDiffState) {
        return (
          renderNode(props)
        );
      } else {
        return (
          <div className={'diff-replaced'}>
            {renderNode(props)}
          </div>
        );
      }
    } else {
      return (
        renderNode(props)
      );
    }
  }


  render() {
    const newMarkdownContent = this.props.newMarkdownContent;
    const OldMarkdownContent = this.props.oldMarkdownContent;
    const diffDocument = this.slateDiff.getDiffDocument(newMarkdownContent, OldMarkdownContent);
    this.value = Value.create({document: diffDocument});
    return (
      <Editor
        style={{width:'100%'}}
        renderNode={this.renderDiffNode}
        renderMark={renderMark}
        value={this.value}
        readOnly={true}
      />
    );
  }
}


export default DiffViewer;