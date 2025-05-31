import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import OpIcon from '../op-icon';
import { SeahubSelect } from '../common/select';

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
  };

  onEditPermission = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    this.setState({ isEditing: true });
  };

  onPermissionChanged = (e) => {
    if (e.value !== this.props.currentPermission) {
      this.props.onPermissionChanged(e.value);
    }
    this.setState({ isEditing: false });
  };

  onSelectHandler = (e) => {
    e.nativeEvent.stopImmediatePropagation();
  };

  render() {
    const { currentPermission, isTextMode } = this.props;
    let optionTranslation = currentPermission === 'rw' ? gettext('Read-Write') : gettext('Read-Only');
    return (
      <div onClick={this.onSelectHandler}>
        {(isTextMode && !this.state.isEditing) ?
          <div className="d-flex align-items-center">
            <span>{optionTranslation}</span>
            {this.props.isEditIconShow &&
              <OpIcon title={gettext('Edit')} className="sf3-font sf3-font-rename op-icon ml-1" op={this.onEditPermission} />
            }
          </div>
          :
          <SeahubSelect
            isSearchable={false}
            isClearable={false}
            options={this.options}
            placeholder={optionTranslation}
            onChange={this.onPermissionChanged}
            captureMenuScroll={false}
            value={this.options.find(opt => opt.value === currentPermission) || null}
          />
        }
      </div>
    );
  }
}

RepoAPITokenPermissionEditor.propTypes = propTypes;

export default RepoAPITokenPermissionEditor;
