import React from 'react';
import PropTypes from 'prop-types';
import AsyncSelect from 'react-select/lib/Async';
import { seafileAPI } from '../utils/seafile-api.js';
import { gettext } from '../utils/constants';
import { Utils } from '../utils/utils.js';
import toaster from './toast';

const propTypes = {
  placeholder: PropTypes.string.isRequired,
  onSelectChange: PropTypes.func.isRequired,
  isMulti: PropTypes.bool.isRequired,
  className: PropTypes.string,
  value: PropTypes.string,
};

class UserSelect extends React.Component {

  constructor(props) {
    super(props);
    this.options = [];
    this.state = {
      searchValue: '',
    };
  }

  onInputChange = (searchValue) => {
    this.setState({ searchValue });
  }

  handleSelectChange = (option) => {
    this.options = [];
    this.props.onSelectChange(option);
  }

  loadOptions = (input, callback) => {
    const value = input.trim();
    if (value.length > 0) {
      seafileAPI.searchUsers(value).then((res) => {
        this.options = [];
        for (let i = 0 ; i < res.data.users.length; i++) {
          const item = res.data.users[i];
          let obj = {};
          obj.value = item.name;
          obj.email = item.email;
          obj.label =
            <React.Fragment>
              <img src={item.avatar_url} className="select-module select-module-icon avatar" alt=""/>
              <span className='select-module select-module-name'>{item.name}</span>
            </React.Fragment>;
          this.options.push(obj);
        }
        callback(this.options);
      }).catch(error => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    }
  }

  clearSelect = () => {
    this.refs.userSelect.select.onChange([], { action: 'clear' });
  }

  render() {
    const searchValue = this.state.searchValue;
    const style = { margin: '6px 10px', textAlign: 'center', color: 'hsl(0,0%,50%)' };
    return (
      <AsyncSelect
        isClearable
        classNamePrefix
        components={{
          NoOptionsMessage: (props) => {
            return (
              <div {...props.innerProps} style={style}>{searchValue ? gettext('User not found') : gettext('Enter characters to start searching')}</div>
            );
          } 
        }}
        isMulti={this.props.isMulti}
        loadOptions={this.loadOptions}
        onChange={this.handleSelectChange}
        onInputChange={this.onInputChange}
        placeholder={this.props.placeholder}
        className={`user-select ${this.props.className}`}
        value={this.props.value}
        ref="userSelect"
      />
    );
  }
}

UserSelect.propTypes = propTypes;

export default UserSelect;
