import React from 'react';
import PropTypes from 'prop-types';
import { MarkdownViewer } from '@seafile/seafile-editor';
import Loading from '../../components/loading';
import { mediaUrl } from '../../utils/constants';

const propTypes = {
  renderingContent: PropTypes.bool.isRequired,
  content: PropTypes.string,
  newMarkdownContent: PropTypes.string.isRequired,
  oldMarkdownContent: PropTypes.string.isRequired,
};

class MainPanel extends React.Component {

  onSearchedClick = () => {
    //todos;
  };

  render() {
    const { renderingContent, newMarkdownContent } = this.props;
    return (
      <div className="content-viewer flex-fill">
        {renderingContent && <Loading />}
        {!renderingContent && (
          <MarkdownViewer
            isFetching={renderingContent}
            value={newMarkdownContent}
            isShowOutline={false}
            mathJaxSource={mediaUrl + 'js/mathjax/tex-svg.js'}
          />
        )}
      </div>
    );
  }
}

MainPanel.propTypes = propTypes;

export default MainPanel;
