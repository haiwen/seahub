import React from 'react';
import PropTypes from 'prop-types';
import Prism from 'prismjs';
import Loading from '../../components/loading';
import CommonToolbar from '../../components/toolbar/common-toolbar';
import DiffViewer from '@seafile/seafile-editor/dist/diff-viewer/diff-viewer';
import '../../css/initial-style.css';

require('@seafile/seafile-editor/src/lib/code-hight-package');

const contentClass = 'markdown-viewer-render-content';
const propTypes = {
  renderingContent: PropTypes.bool.isRequired,
  content: PropTypes.string,
  markdownContent: PropTypes.string.isRequired,
  markdownContentOld: PropTypes.string.isRequired,
};

class MainPanel extends React.Component {

  componentDidMount() {
    Prism.highlightAll();
  }

  onSearchedClick = () => {
    //todos;
  }

  render() {
    return (
      <div className="main-panel viewer">
        <div className="main-panel-north">
          <CommonToolbar onSearchedClick={this.onSearchedClick} />
        </div>
        <div className="main-panel-center history-viewer-contanier">
          <div className="content-viewer">
            { 
              this.props.renderingContent ? 
                (<div className={contentClass + ' article'}><Loading /></div>) : 
                (<div className={contentClass + ' article'}><DiffViewer markdownContent={this.props.markdownContent} markdownContent1={this.props.markdownContentOld}/></div>)
            }
          </div>
        </div>
      </div>
    );
  }
}

MainPanel.propTypes = propTypes;

export default MainPanel;
