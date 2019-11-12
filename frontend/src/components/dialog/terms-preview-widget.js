import React from 'react';
import PropTypes from 'prop-types';
import { processor } from '@seafile/seafile-editor/dist/utils/seafile-markdown2html';
import Loading from '../loading';

const propTypes = {
  content: PropTypes.object,
  onContentClick: PropTypes.func,
};

class TermsPreviewWidget extends React.Component {

  static defaultProps = {
    content: {text: '', perview: ''}
  }

  constructor(props) {
    super(props);
    this.state = {
      innerHtml: null,
      isFormatValue: true,
    }
  }

  componentDidMount() {
    let content = this.props.content;
    let mdFile = content ? content.text : '';
    if (mdFile) {
      this.formatterLongTextValue(mdFile);
    } else {
      this.setState({
        isFormatValue: false,
        innerHtml: ''
      });
    }
  }

  componentWillReceiveProps(nextProps) {
    let mdFile = nextProps.content.text;
    this.formatterLongTextValue(mdFile);
  }

  formatterLongTextValue = (mdFile) => {
    processor.process(mdFile).then((result) => {
      let innerHtml = String(result);
      this.setState({
        isFormatValue: false,
        innerHtml: innerHtml
      });
    });
  }

  render() {
    if (this.state.isFormatValue) {
      return <Loading />;
    }

    return (
      <div className="conditions-preview-container" onClick={this.props.onContentClick}>
        <div dangerouslySetInnerHTML={{__html: this.state.innerHtml}}></div>
      </div>
    );
  }

}

TermsPreviewWidget.propTypes = propTypes;

export default TermsPreviewWidget;
