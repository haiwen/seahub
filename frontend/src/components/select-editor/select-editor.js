import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import Select from 'react-select';
import { MenuSelectStyle } from '../common/select';
import '../../css/select-editor.css';

const propTypes = {
  isTextMode: PropTypes.bool.isRequired, // there will be two mode. first: text and select. second: just select
  isEditing: PropTypes.bool,
  isEditIconShow: PropTypes.bool.isRequired,
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

class SelectEditor extends React.Component {

  static defaultProps = {
    enableAddCustomPermission: false,
    isEditing: false,
    autoFocus: false,
  };

  constructor(props) {
    super(props);
    this.state = {
      isEditing: props.isEditing,
      options: []
    };
    this.options = [];
  }

  componentDidMount() {
    this.setOptions();
  }

  setOptions = () => {
    this.options = [];
    const options = this.props.options;
    for (let i = 0, length = options.length; i < length; i++) {
      let option = {};
      option.value = options[i];
      if (!options[i].length) { // it's ''. for example, intitution option in 'system admin - users' page can be ''.
        option.label = <div style={{minHeight: '1em'}}></div>;
      } else {
        option.label = <div>{this.props.translateOption(options[i])}{ this.props.translateExplanation && <div className="permission-editor-explanation">{this.props.translateExplanation(options[i])}</div>}</div>;
      }
      this.options.push(option);
    }

    const { enableAddCustomPermission } = this.props;
    if (enableAddCustomPermission) {
      const option = {
        value: gettext('Add custom permission'),
        isDisabled: true,
        label: (
          <div className="permission-editor-btn-add-custom-permission" onClick={this.props.onAddCustomPermissionToggle}>
            <i className="fa fa-plus"></i>
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
    this.setState({isEditing: true});
    this.props.toggleItemFreezed && this.props.toggleItemFreezed(true);
  };

  onOptionChanged = (e) => {
    let permission = e.value;
    if (permission !== this.props.currentOption) {
      this.props.onOptionChanged(permission);
    }
    this.setState({isEditing: false});
    this.props.toggleItemFreezed && this.props.toggleItemFreezed(false);
  };

  onSelectHandler = (e) => {
    e.nativeEvent.stopImmediatePropagation();
  };

  onMenuClose = () => {
    this.setState({isEditing: false});
    this.props.toggleItemFreezed && this.props.toggleItemFreezed(false);
  };

  render() {
    let { currentOption, isTextMode } = this.props;
    // scence1: isTextMode (text)editor-icon --> select
    // scence2: !isTextMode select
    return (
      <div className="permission-editor" onClick={this.onSelectHandler}>
        {(!isTextMode || this.state.isEditing) &&
          <Select
            options={this.state.options}
            className="permission-editor-select"
            classNamePrefix="permission-editor"
            placeholder={this.props.translateOption(currentOption)}
            value={currentOption}
            onChange={this.onOptionChanged}
            captureMenuScroll={false}
            menuPlacement="auto"
            menuPosition={'fixed'}
            menuPortalTarget={document.querySelector('#wrapper')}
            styles={MenuSelectStyle}
            onMenuClose={this.onMenuClose}
            autoFocus={this.props.autoFocus}
            menuShouldScrollIntoView
          />
        }
        {(isTextMode && !this.state.isEditing) &&
          <div>
            {this.props.translateOption(currentOption)}
            {this.props.isEditIconShow && (
              <a href="#"
                role="button"
                aria-label={gettext('Edit')}
                title={gettext('Edit')}
                className="fa fa-pencil-alt attr-action-icon"
                onClick={this.onEditPermission}>
              </a>
            )}
          </div>
        }
      </div>
    );
  }
}

SelectEditor.propTypes = propTypes;

export default SelectEditor;
