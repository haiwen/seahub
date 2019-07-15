import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody } from 'reactstrap';
import { gettext } from '../../utils/constants';

const propTypes = {
  toggleDialog: PropTypes.func.isRequired,
  sortBy: PropTypes.string.isRequired,
  sortOrder: PropTypes.string.isRequired,
  sortList: PropTypes.func.isRequired
};

class SortOptions extends React.Component {

  constructor(props) {
    super(props);
    this.sortOptions = [
      {id: 'sort-option-1', value: 'name-asc', text: gettext('By name ascending')},
      {id: 'sort-option-2', value: 'name-desc', text: gettext('By name descending')},
      {id: 'sort-option-3', value: 'size-asc', text: gettext('By size ascending')},
      {id: 'sort-option-4', value: 'size-desc', text: gettext('By size descending')},
      {id: 'sort-option-5', value: 'time-asc', text: gettext('By time ascending')},
      {id: 'sort-option-6', value: 'time-desc', text: gettext('By time descending')}
    ];
    const { sortBy, sortOrder } = this.props;
    this.state = {
      currentOption: `${sortBy}-${sortOrder}`
    };
  }

  switchOption = (e) => {
    if (!e.target.checked) {
      return;
    }

    this.setState({
      currentOption: e.target.value
    });

    const [sortBy, sortOrder] = e.target.value.split('-');
    this.props.sortList(sortBy, sortOrder);
    this.props.toggleDialog();
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.props.toggleDialog}>
        <ModalBody>
          {this.sortOptions.map((item, index) => {
            return (
              <Fragment key={index}>
                <input id={item.id} className="align-middle" type="radio" name="sort-options" value={item.value} checked={this.state.currentOption == item.value} onChange={this.switchOption} />
                <label htmlFor={item.id} className="align-middle m-2">{item.text}</label><br />
              </Fragment>
            );
          })}
        </ModalBody>
      </Modal>
    );
  }
}

SortOptions.propTypes = propTypes;

export default SortOptions;
