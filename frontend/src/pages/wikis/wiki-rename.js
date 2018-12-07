import React from 'react';
import PropTypes from 'prop-types';

const propTypes = {
  wiki: PropTypes.object.isRequired,
  onRenameConfirm: PropTypes.func.isRequired,
  onRenameCancel: PropTypes.func.isRequired,
};
class WikiRename extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      name: props.wiki.name
    };
  }

  componentDidMount() {
    this.refs.renameInput.focus();
    this.refs.renameInput.setSelectionRange(0, -1);
  }

  onChange = (e) => {
    this.setState({name: e.target.value});
  }

  onClick = (e) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
  }

  onKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.onRenameConfirm(e);
    }
  }

  onRenameConfirm = (e) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    this.props.onRenameConfirm(this.state.name);
  }

  onRenameCancel = (e) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    this.props.onRenameCancel();
  }

  render() {
    return (
      <div className="rename-container">
        <input 
          ref="renameInput" 
          value={this.state.name} 
          onChange={this.onChange} 
          onKeyPress={this.onKeyPress} 
          onClick={this.onClick} 
        />
        <button className="btn btn-secondary sf2-icon-confirm confirm" onClick={this.onRenameConfirm}></button>
        <button className="btn btn-secondary sf2-icon-cancel cancel" onClick={this.onRenameCancel}></button>
      </div>
    );
  }
}

WikiRename.propTypes = propTypes;

export default WikiRename;