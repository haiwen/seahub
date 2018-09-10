import React from 'react';
import Prism from 'prismjs';
require('@seafile/seafile-editor/src/lib/code-hight-package');

const contentClass = "markdown-viewer-render-content";
class MainPanel extends React.Component {

  constructor(props) {
    super(props);
  }

  componentDidMount() {
    Prism.highlightAll();
    var links = document.querySelectorAll(`.${contentClass} a`);
    links.forEach((li) => {
      li.addEventListener("click", this.onLinkClick); 
    });
  }

  onLinkClick = (event) => {
    event.preventDefault();
    this.props.onLinkClick(event);
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
              ref={(mdContent) => {this.mdContentRef = mdContent;} }
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
