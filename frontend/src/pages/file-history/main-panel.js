import React from 'react';
import PropTypes from 'prop-types';
import Prism from 'prismjs';
import Loading from '../../components/loading';
import Account from '../../components/account';
import Notification from '../../components/notification';
import { seafileAPI } from '../../utils/editor-utilties';
import '../../css/initial-style.css';
require('@seafile/seafile-editor/src/lib/code-hight-package');

const contentClass = 'markdown-viewer-render-content';
const propTypes = {
  renderingContent: PropTypes.bool.isRequired,
  content: PropTypes.string.isRequired,
};

class MainPanel extends React.Component {

  componentDidMount() {
    Prism.highlightAll();
  }

  render() {
    return (
      <div className="main-panel viewer">
        <div className="main-panel-north">
          <div className="history-heading">
            <Notification seafileAPI={seafileAPI} />
            <Account seafileAPI={seafileAPI}/>
          </div>
        </div>
        <div className="main-panel-center history-viewer-contanier">
          <div className="content-viewer">
            { 
              this.props.renderingContent ? 
                (<div className={contentClass + ' article'}><Loading /></div>) : 
                (<div 
                  className={contentClass + ' article'}
                  dangerouslySetInnerHTML={{ __html: this.props.content }}
                />)
            }
          </div>
        </div>
      </div>
    );
  }
}

MainPanel.propTypes = propTypes;

export default MainPanel;
