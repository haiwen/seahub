import React from 'react';
import Prism from 'prismjs';
import "../../css/initial-style.css";
require('@seafile/seafile-editor/src/lib/code-hight-package');

const contentClass = "markdown-viewer-render-content";
class MainPanel extends React.Component {

  componentDidMount() {
    Prism.highlightAll();
  }

  render() {
    return (
      <div className="main-panel viewer">
        <div className="main-panel-north">
          <div className="history-heading"></div>
        </div>
        <div className="main-panel-center history-viewer-contanier">
          <div className="content-viewer">
          { 
            this.props.renderingContent ? 
            (<div className={contentClass + " article"}>Loading...</div>) : 
            (<div 
              className={contentClass + " article"}
              dangerouslySetInnerHTML={{ __html: this.props.content }}
            />)
          }
          </div>
        </div>
      </div>
    );
  }
}

export default MainPanel;
