import React from 'react';
import PropTypes from 'prop-types';
import { Input } from 'reactstrap';
import { Utils } from '../utils/utils';
import { gettext } from '../utils/constants';

const propTypes = {
  isTextMode: PropTypes.bool.isRequired, // there will be two mode. first: text and select. second: just select
  isEditIconShow: PropTypes.bool.isRequired,
  currentPermission: PropTypes.string.isRequired,
  permissions: PropTypes.array.isRequired,
  onPermissionChangedHandler: PropTypes.func.isRequired,
};

class PermissionEditor extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isEditing: false,
    }
  }

  componentDidMount() {
    document.addEventListener('click', this.onHideSelect);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.onHideSelect);
  }

  onEidtPermission = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    this.setState({isEditing: true});
  }

  onPermissionChangedHandler = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    let permission = e.target.value;
    if (permission !== this.props.currentPermission) {
      this.props.onPermissionChangedHandler(permission);
    }
    this.setState({isEditing: false});
  }

  onSelectHandler = (e) => {
    e.nativeEvent.stopImmediatePropagation();
  }

  onHideSelect = () => {
    this.setState({isEditing: false});
  }

  render() {
    let { currentPermission, permissions, isTextMode } = this.props;

    // scence1: isTextMode (text)editor-icon --> select
    // scence2: !isTextMode select
    let selectStyle = {
      height: '1.5rem',
      padding: 0
    };
    if (!isTextMode) {
      selectStyle = {};
    }
    return (
      <div className="permission-editor">
        {(!isTextMode || this.state.isEditing) &&
          <Input style={selectStyle} type="select" onChange={this.onPermissionChangedHandler} onClick={this.onSelectHandler} value={currentPermission}>
            {permissions.map((item, index) => {
              return (
                <option key={index} value={item}>{Utils.sharePerms(item)}</option>
              )
            })}
          </Input>
        }
        {(isTextMode && !this.state.isEditing) &&
          <div>
            {Utils.sharePerms(currentPermission)}
            {this.props.isEditIconShow && (
              <span 
                title={gettext('Edit')} 
                className="fa fa-pencil attr-action-icon" 
                onClick={this.onEidtPermission}>
              </span>
            )}
          </div>
        }
      </div>
    );
  }
}

PermissionEditor.propTypes = propTypes;

export default PermissionEditor;
