import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';
import { gettext } from '../../utils/constants';
import OpIcon from '../op-icon';

const propTypes = {
  isTextMode: PropTypes.bool.isRequired,
  isEditIconShow: PropTypes.bool.isRequired,
  currentPermission: PropTypes.string.isRequired,
  onPermissionChanged: PropTypes.func.isRequired,
};

class RepoAPITokenPermissionEditor extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isEditing: false,
    };
    this.options = [
      { value: 'rw', label: <div>{gettext('Read-Write')}</div> },
      { value: 'r', label: <div>{gettext('Read-Only')}</div> }
    ];
  }

  componentDidMount() {
    document.addEventListener('click', this.onHideSelect);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.onHideSelect);
  }

  onHideSelect = () => {
    this.setState({ isEditing: false });
  }

  onEditPermission = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    this.setState({ isEditing: true });
  }

  onPermissionChanged = (e) => {
    if (e.value !== this.props.currentPermission) {
      this.props.onPermissionChanged(e.value);
    }
    this.setState({ isEditing: false });
  }

  onSelectHandler = (e) => {
    e.nativeEvent.stopImmediatePropagation();
  }

  render() {
    const { currentPermission, isTextMode } = this.props;
    let optionTranslation = currentPermission === 'rw' ? gettext('Read-Write') : gettext('Read-Only');
    return (
      <div onClick={this.onSelectHandler}>
        {(isTextMode && !this.state.isEditing) ?
          <Fragment>
            <span>{optionTranslation}</span>
            {this.props.isEditIconShow &&
              <OpIcon title={gettext('Edit')} className="fa fa-pencil-alt attr-action-icon" op={this.onEditPermission} />
            }
          </Fragment>
          :
          <Select
            options={this.options}
            placeholder={optionTranslation}
            onChange={this.onPermissionChanged}
            captureMenuScroll={false}
          />
        }
      </div>
    );
  }
}

RepoAPITokenPermissionEditor.propTypes = propTypes;

export default RepoAPITokenPermissionEditor;
