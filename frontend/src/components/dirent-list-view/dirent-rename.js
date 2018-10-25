import React from 'react';
import PropTypes from 'prop-types';

const propTypes = {
  dirent: PropTypes.object.isRequired,
  onRenameConfirm: PropTypes.func.isRequired,
  onRenameCancel: PropTypes.func.isRequired,
};
class DirentRename extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      name: props.dirent.name
    };
  }

  componentDidMount() {
    this.refs.renameInput.focus();
    if (this.props.dirent.type === 'file') {
      var endIndex = this.props.dirent.name.lastIndexOf('.');
      this.refs.renameInput.setSelectionRange(0, endIndex, 'forward');
    } else {
      this.refs.renameInput.setSelectionRange(0, -1);
    }
  }

  onChange = (e) => {
    this.setState({name: e.target.value});
  }

  onClick = (e) => {
    e.nativeEvent.stopImmediatePropagation();
  }

  onKeyPress = (e) => {
    if (e.key === 'Enter') {
      this.onRenameConfirm(e);
    }
  }

  onRenameConfirm = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    this.props.onRenameConfirm(this.state.name);
  }

  onRenameCancel = (e) => {
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

DirentRename.propTypes = propTypes;

export default DirentRename;
