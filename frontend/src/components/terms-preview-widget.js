import React from 'react';
import PropTypes from 'prop-types';
import { processor } from '@seafile/seafile-editor';
import Loading from './loading';

const propTypes = {
  content: PropTypes.string,
  onContentClick: PropTypes.func,
};

class TermsPreviewWidget extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      innerHtml: null,
      isFormatValue: true,
    };
  }

  componentDidMount() {
    let content = this.props.content;
    if (content) {
      this.formatterLongTextValue(content);
    } else {
      this.setState({
        isFormatValue: false,
        innerHtml: ''
      });
    }
  }

  componentWillReceiveProps(nextProps) {
    let mdFile = nextProps.content;
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
