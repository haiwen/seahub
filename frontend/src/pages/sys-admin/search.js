import React from 'react';
import PropTypes from 'prop-types';

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
  }

  handleKeyPress = (e) => {
    if (e.key == 'Enter') {
      e.preventDefault();
      this.handleSubmit();
    }
  }

  handleSubmit = () => {
    const value = this.state.value.trim();
    if (!value) {
      return false;
    }
    this.props.submit(value);
  }

  render() {
    return (
      <div className="input-icon">
        <i className="d-flex input-icon-addon fas fa-search"></i>
        <input
          type="text"
          className="form-control search-input h-6 mr-1"
          style={{width: '17rem'}}
          placeholder={this.props.placeholder}
          value={this.state.value}
          onChange={this.handleInputChange}
          onKeyPress={this.handleKeyPress}
          autoComplete="off"
        />
      </div>
    );
  }
}

Search.propTypes = propTypes;

export default Search;
