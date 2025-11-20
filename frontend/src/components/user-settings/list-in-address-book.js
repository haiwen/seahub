import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';

class ListInAddressBook extends React.Component {

  constructor(props) {
    super(props);
    const { list_in_address_book } = this.props.userInfo;
    this.state = {
      inputChecked: list_in_address_book
    };
  }

  handleInputChange = (e) => {
    const checked = e.target.checked;
    this.setState({
      inputChecked: checked
    });
    this.props.updateUserInfo({
      list_in_address_book: checked.toString()
    });
  };

  render() {
    const { inputChecked } = this.state;

    return (
      <div className="setting-item" id="list-in-address-book">
        <h3 className="setting-item-heading">{gettext('Global Address Book')}</h3>
        <div className="d-flex align-items-center">
          <input type="checkbox" id="list-in-address-book" name="list_in_address_book" className="mr-1 form-check-input" checked={inputChecked} onChange={this.handleInputChange} />
          <label htmlFor="list-in-address-book" className="m-0">{gettext('List your account in global address book, so that others can find you by typing your name.')}</label>
        </div>
      </div>
    );
  }
}

ListInAddressBook.propTypes = {
  updateUserInfo: PropTypes.func.isRequired,
  userInfo: PropTypes.object.isRequired,
};

export default ListInAddressBook;
