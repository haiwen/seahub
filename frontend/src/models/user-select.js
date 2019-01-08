import React from 'react';
import PropTypes from 'prop-types';
import AsyncSelect from 'react-select/lib/Async';
import { seafileAPI } from '../utils/seafile-api.js';
import { gettext } from '../utils/constants';

const propTypes = {
  placeholder: PropTypes.string.isRequired,
  onSelectChange: PropTypes.func.isRequired,
  clearSelect: PropTypes.bool.isRequired,
  isMulti: PropTypes.bool.isRequired,
  className: PropTypes.string.isRequired,
};

class UserSelect extends React.Component {

  constructor(props) {
    super(props);
    this.options = [];
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
      });
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.clearSelect === true && this.props.clearSelect === false) {
      this.refs.userSelect.select.onChange([], { action: 'clear' });
    }
  }

  render() {
    return (
      <AsyncSelect
        isClearable
        classNamePrefix
        isMulti={this.props.isMulti}
        loadOptions={this.loadOptions}
        onChange={this.handleSelectChange}
        placeholder={gettext(this.props.placeholder)}
        className={this.props.className}
        ref="userSelect"
      />
    );
  }
}

UserSelect.propTypes = propTypes;

export default UserSelect;