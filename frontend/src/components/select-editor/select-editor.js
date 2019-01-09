import React from 'react';
import PropTypes from 'prop-types';
import { Input } from 'reactstrap';
import { gettext } from '../../utils/constants';

const propTypes = {
  isTextMode: PropTypes.bool.isRequired, // there will be two mode. first: text and select. second: just select
  isEditIconShow: PropTypes.bool.isRequired,
  options: PropTypes.array.isRequired,
  currentOption: PropTypes.string.isRequired,
  translateOption: PropTypes.func.isRequired,
  onOptionChangedHandler: PropTypes.func.isRequired,
};

class SelectEditor extends React.Component {

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

  onOptionChangedHandler = (e) => {
    e.nativeEvent.stopImmediatePropagation();
    let permission = e.target.value;
    if (permission !== this.props.currentOption) {
      this.props.onOptionChangedHandler(permission);
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
    let { currentOption, options, isTextMode } = this.props;

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
          <Input style={selectStyle} type="select" onChange={this.onOptionChangedHandler} onClick={this.onSelectHandler} value={currentOption}>
            {options.map((item, index) => {
              return (
                <option key={index} value={item}>{this.props.translateOption(item)}</option>
              );
            })}
          </Input>
        }
        {(isTextMode && !this.state.isEditing) &&
          <div>
            {this.props.translateOption(currentOption)}
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

SelectEditor.propTypes = propTypes;

export default SelectEditor;
