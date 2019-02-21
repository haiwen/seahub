import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import Select from 'react-select';
import '../../css/select-editor.css';

const propTypes = {
  isTextMode: PropTypes.bool.isRequired, // there will be two mode. first: text and select. second: just select
  isEditIconShow: PropTypes.bool.isRequired,
  options: PropTypes.array.isRequired,
  currentOption: PropTypes.string.isRequired,
  translateOption: PropTypes.func.isRequired,
  translateExplanation: PropTypes.func,
  onOptionChanged: PropTypes.func.isRequired,
};

class SelectEditor extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isEditing: false,
    };
    this.options = [];
  }

  componentDidMount() {
    document.addEventListener('click', this.onHideSelect);
    this.setOptions();
  }

  setOptions = () => {
    this.options = [];
    const options = this.props.options;
    for (let i = 0, length = options.length; i < length; i++) {
      let option = {};
      option.value = options[i];
      option.label = <div>{this.props.translateOption(options[i])}{ this.props.translateExplanation && <div className="permission-editor-explanation">{this.props.translateExplanation(options[i])}</div>}</div>;
      this.options.push(option);
    }
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.onHideSelect);
  }

  onEditPermission = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    this.setState({isEditing: true});
  }

  onOptionChanged = (e) => {
    let permission = e.value;
    if (permission !== this.props.currentOption) {
      this.props.onOptionChanged(permission);
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
    let { currentOption, isTextMode } = this.props;

    // scence1: isTextMode (text)editor-icon --> select
    // scence2: !isTextMode select
    return (
      <div className="permission-editor" onClick={this.onSelectHandler}>
        {(!isTextMode || this.state.isEditing) &&
          <Select
            options={this.options}
            className="permission-editor-select"
            classNamePrefix="permission-editor"
            placeholder={gettext('Select...')}
            onChange={this.onOptionChanged}
            menuPlacement="auto"
          />
        }
        {(isTextMode && !this.state.isEditing) &&
          <div>
            {this.props.translateOption(currentOption)}
            {this.props.isEditIconShow && (
              <span 
                title={gettext('Edit')} 
                className="fa fa-pencil-alt attr-action-icon" 
                onClick={this.onEditPermission}>
              </span>
            )}
          </div>
        }
      </div>
    );
  }
}

SelectEditor.propTypes = propTypes;

export default SelectEditor;
