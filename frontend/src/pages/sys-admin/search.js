import React from 'react';
import PropTypes from 'prop-types';
import Icon from '../../components/icon';

const propTypes = {
  placeholder: PropTypes.string.isRequired,
  submit: PropTypes.func.isRequired
};

class Search extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      value: ''
    };
  }

  handleInputChange = (e) => {
    this.setState({
      value: e.target.value
    });
  };

  handleKeyDown = (e) => {
    if (e.key == 'Enter') {
      e.preventDefault();
      this.handleSubmit();
    }
  };

  handleSubmit = () => {
    const value = this.state.value.trim();
    if (!value) {
      return false;
    }
    this.props.submit(value);
  };

  render() {
    return (
      <div className="input-icon">
        <span className="d-flex input-icon-addon">
          <Icon symbol="search" />
        </span>
        <input
          type="text"
          className="form-control search-input h-6 mr-1"
          style={{ width: '17rem' }}
          placeholder={this.props.placeholder}
          value={this.state.value}
          onChange={this.handleInputChange}
          onKeyDown={this.handleKeyDown}
          autoComplete="off"
        />
      </div>
    );
  }
}

Search.propTypes = propTypes;

export default Search;
