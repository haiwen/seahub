import React from 'react';
import PropTypes from 'prop-types';
import AsyncSelect from 'react-select/async';
import { seafileAPI } from '../utils/seafile-api';
import { gettext, enableShowContactEmailWhenSearchUser } from '../utils/constants';
import { Utils } from '../utils/utils';
import toaster from './toast';
import { UserSelectStyle } from './common/select';

import '../css/user-select.css';

const propTypes = {
  placeholder: PropTypes.string.isRequired,
  onSelectChange: PropTypes.func.isRequired,
  isMulti: PropTypes.bool.isRequired,
  className: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
};

class UserSelect extends React.Component {

  constructor(props) {
    super(props);
    this.options = [];
    this.finalValue = '';
    this.state = {
      searchValue: ''
    };
    this.userSelect = React.createRef();
  }

  onInputChange = (searchValue) => {
    if (!this.props.isMulti && searchValue.trim()) {
      this.handleSelectChange(null);
      this.clearSelect();
    }
    this.setState({ searchValue });
  };

  handleSelectChange = (option) => {
    this.options = [];
    this.props.onSelectChange(option);
  };

  loadOptions = (input, callback) => {
    const value = input.trim();
    this.finalValue = value;
    setTimeout(() => {
      if (this.finalValue === value && value.length > 0) {
        seafileAPI.searchUsers(value).then((res) => {
          this.options = [];
          for (let i = 0 ; i < res.data.users.length; i++) {
            const item = res.data.users[i];
            let obj = {};
            obj.value = item.name;
            obj.email = item.email;
            if (enableShowContactEmailWhenSearchUser) {
              obj.label = (
                <div className="d-flex">
                  <img src={item.avatar_url} className="avatar" width="24" alt="" />
                  <div className="ml-2">
                    <span className="user-option-name">{item.name}</span><br />
                    <span className="user-option-email">{item.contact_email}</span>
                  </div>
                </div>
              );
            } else {
              obj.label = (
                <>
                  <img src={item.avatar_url} className="select-module select-module-icon avatar" alt=""/>
                  <span className='select-module select-module-name'>{item.name}</span>
                </>
              );
            }
            this.options.push(obj);
          }
          callback(this.options);
        }).catch(error => {
          let errMessage = Utils.getErrorMsg(error);
          toaster.danger(errMessage);
        });
      }
    }, 1000);
  };

  clearSelect = () => {
    this.userSelect.current.onChange([], { action: 'clear' });
  };

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
        isMulti={true}
        loadOptions={this.loadOptions}
        onChange={this.handleSelectChange}
        onInputChange={this.onInputChange}
        placeholder={this.props.placeholder}
        className={`user-select ${this.props.className}`}
        value={this.props.value}
        ref={this.userSelect}
        styles={UserSelectStyle}
      />
    );
  }
}

UserSelect.propTypes = propTypes;

export default UserSelect;
