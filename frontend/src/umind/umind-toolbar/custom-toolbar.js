import React from 'react';
import PropTypes from 'prop-types';
import withGGEditorContext from 'gg-editor/es/common/context/GGEditorContext/withGGEditorContext';

const propTypes = {
};

class CustomToolbar extends React.Component {

  onSaveClick = () => {
    let { editor } = this.props;
    let page = editor.getCurrentPage();
    let { data } = page._cfg;
    console.log(data);

  }

  render() {
    return (
      <div className="umind-custom-toolbar">
        <div onClick={this.onSaveClick}>保存</div>
      </div>
    );
  }
}

CustomToolbar.propTypes = propTypes;

export default withGGEditorContext(CustomToolbar);
