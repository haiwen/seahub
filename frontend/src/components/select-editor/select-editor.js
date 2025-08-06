import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { gettext } from '../../utils/constants';
import Select, { components } from 'react-select';
import { MenuSelectStyle } from '../common/select';
import '../../css/select-editor.css';

const propTypes = {
  isTextMode: PropTypes.bool.isRequired, // there will be two mode. first: text and select. second: just select
  isEditing: PropTypes.bool,
  isEditIconShow: PropTypes.bool.isRequired,
  isWiki: PropTypes.bool,
  autoFocus: PropTypes.bool,
  options: PropTypes.array.isRequired,
  currentOption: PropTypes.string.isRequired,
  translateOption: PropTypes.func.isRequired,
  translateExplanation: PropTypes.func,
  onOptionChanged: PropTypes.func.isRequired,
  toggleItemFreezed: PropTypes.func,
  enableAddCustomPermission: PropTypes.bool,
  onAddCustomPermissionToggle: PropTypes.func,
};

const DropdownIndicator = props => {
  return (
    components.DropdownIndicator && (
      <components.DropdownIndicator {...props}>
        <span className="sf3-font sf3-font-down" style={{ fontSize: '12px', marginLeft: '-2px' }} aria-hidden="true"></span>
      </components.DropdownIndicator>
    )
  );
};

class SelectEditor extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isEditing: props.isEditing || false,
      options: []
    };
    this.options = [];
  }

  componentDidMount() {
    this.setOptions();
  }

  setOptions = () => {
    const { enableAddCustomPermission = false, options } = this.props;
    this.options = [];
    for (let i = 0, length = options.length; i < length; i++) {
      let option = {};
      option.value = options[i];
      if (!options[i].length) { // it's ''. for example, intitution option in 'system admin - users' page can be ''.
        option.label = <div style={{ minHeight: '1em' }}></div>;
      } else {
        option.label = (
          <div>
            {this.props.translateOption(options[i])}
            {this.props.translateExplanation &&
              <div className="permission-editor-explanation">{this.props.translateExplanation(options[i])}</div>
            }
          </div>
        );
      }
      this.options.push(option);
    }

    if (enableAddCustomPermission && !this.props.isWiki) {
      const option = {
        value: gettext('Add custom permission'),
        isDisabled: true,
        label: (
          <div className="permission-editor-btn-add-custom-permission" onClick={this.props.onAddCustomPermissionToggle}>
            <i className="sf3-font sf3-font-enlarge"></i>
            <span>{gettext('Add custom permission')}</span>
          </div>
        )
      };
      this.options.push(option);
    }

    this.setState({
      options: this.options
    });
  };

  UNSAFE_componentWillReceiveProps() {
    this.setOptions();
  }

  onEditPermission = (e) => {
    e.preventDefault();
    e.nativeEvent.stopImmediatePropagation();
    this.setState({ isEditing: true });
    this.props.toggleItemFreezed && this.props.toggleItemFreezed(true);
  };

  onOptionChanged = (e) => {
    let permission = e.value;
    if (permission !== this.props.currentOption) {
      this.props.onOptionChanged(permission);
    }
    this.setState({ isEditing: false });
    this.props.toggleItemFreezed && this.props.toggleItemFreezed(false);
  };

  onSelectHandler = (e) => {
    e.nativeEvent.stopImmediatePropagation();
  };

  onMenuClose = () => {
    this.setState({ isEditing: false });
    this.props.toggleItemFreezed && this.props.toggleItemFreezed(false);
  };

  render() {
    const {
      currentOption, isTextMode, autoFocus = false, isEditIconShow
    } = this.props;
    return (
      <div className="permission-editor" onClick={this.onSelectHandler}>
        {(!isTextMode || this.state.isEditing) &&
          <Select
            options={this.state.options}
            className="permission-editor-select"
            classNamePrefix="permission-editor"
            value={this.state.options.filter(item => item.value == currentOption)[0]}
            onChange={this.onOptionChanged}
            captureMenuScroll={false}
            menuPlacement="auto"
            menuPosition={'fixed'}
            menuPortalTarget={document.querySelector('#wrapper')}
            styles={MenuSelectStyle}
            components={{ DropdownIndicator }}
            onMenuClose={this.onMenuClose}
            autoFocus={autoFocus}
            menuShouldScrollIntoView
          />
        }
        {(isTextMode && !this.state.isEditing) &&
          <div className="d-flex align-item-center">
            <span>{this.props.translateOption(currentOption)}</span>
            <i
              role="button"
              aria-label={gettext('Edit')}
              title={gettext('Edit')}
              className={classnames('sf3-font sf3-font-rename op-icon ml-1', { 'invisible': !isEditIconShow })}
              onClick={this.onEditPermission}>
            </i>
          </div>
        }
      </div>
    );
  }
}

SelectEditor.propTypes = propTypes;

export default SelectEditor;
