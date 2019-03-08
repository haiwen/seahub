import React from 'react';
import PropTypes from 'prop-types';
import { Editor } from '@seafile/slate-react';
import { renderNode, renderMark } from '@seafile/slate-react/dist/utils/render-slate.js';
import { deserialize } from '@seafile/seafile-editor/dist/utils/slate2markdown';
import { decorationNode } from '@seafile/seafile-editor/dist/editor/plugin-utils';
import OutlineView from '@seafile/seafile-editor/dist/components/outline';
import { Value } from 'slate';
import '@seafile/seafile-editor/dist/css/markdown-viewer.css';

const URL = require('url-parse');

const propTypes = {
  markdownContent: PropTypes.string.isRequired,
  showTOC: PropTypes.bool,
  onContentRendered: PropTypes.func,
  activeTitleIndex: PropTypes.number,
  modifyValueBeforeRender: PropTypes.func,
}

class MarkdownViewer extends React.Component {

  constructor(props) {
    super(props);
    this.titlesInfo = [];
  }

  decorateNode(node) {
    return decorationNode(node);
  }

  scrollToNode = (node) => {
    let url = new URL(window.location.href);
    url.set('hash', ('user-content-' + node.text));
    window.location.href = url.toString();
  }

  getTitlesInfo = () => {
    let titlesInfo = [];
    let headingList = document.querySelectorAll('h2[id^="user-content"], h3[id^="user-content"]');
    for (let i = 0; i < headingList.length; i++) {
      titlesInfo.push(headingList[i].offsetTop);
    }
    this.titlesInfo = titlesInfo;
  }

  componentDidMount() {
    if (this.props.showTOC) {
      this.getTitlesInfo();
    }
    if (this.props.onContentRendered) {
      this.props.onContentRendered(this);
    }
  }
  
  shouldComponentUpdate(nextProps) {
    if (nextProps.activeTitleIndex === this.props.activeTitleIndex) {
      return false;
    }
    return true;
  }

  render() {
    let value = deserialize(this.props.markdownContent);

    if (this.props.modifyValueBeforeRender) {
      value = value.toJSON();
      value = this.props.modifyValueBeforeRender(value);
      value = Value.fromJSON(value);
    }

    return(
      <React.Fragment>
        <Editor
          readOnly
          style={{width: '100%'}}
          value={value}
          className={'article'}
          renderNode={renderNode}
          renderMark={renderMark}
          decorateNode={this.decorateNode}
        />
        {this.props.showTOC &&
          <div className="seafile-markdown-outline">
            <OutlineView document={value.document} isViewer={true} editor={this} activeTitleIndex={this.props.activeTitleIndex}/>
          </div>
        }
      </React.Fragment>
    );
  }
}

const defaultProps = {
  markdownContent: '',
  showTOC: false,
  isShared: false,
}

MarkdownViewer.propTypes = propTypes;
MarkdownViewer.defaultProps = defaultProps;

export default MarkdownViewer;
