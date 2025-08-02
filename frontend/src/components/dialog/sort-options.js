import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody } from 'reactstrap';
import { gettext } from '../../utils/constants';

const propTypes = {
  toggleDialog: PropTypes.func.isRequired,
  sortBy: PropTypes.string.isRequired,
  sortOrder: PropTypes.string.isRequired,
  sortOptions: PropTypes.array,
  sortItems: PropTypes.func.isRequired
};

class SortOptions extends React.Component {

  constructor(props) {
    super(props);
    this.sortOptions = this.props.sortOptions || [
      { value: 'name-asc', text: gettext('Ascending by name') },
      { value: 'name-desc', text: gettext('Descending by name') },
      { value: 'size-asc', text: gettext('Ascending by size') },
      { value: 'size-desc', text: gettext('Descending by size') },
      { value: 'time-asc', text: gettext('Ascending by time') },
      { value: 'time-desc', text: gettext('Descending by time') }
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
    this.props.sortItems(sortBy, sortOrder);
    this.props.toggleDialog();
  };

  render() {
    return (
      <Modal isOpen={true} toggle={this.props.toggleDialog}>
        <ModalBody>
          {this.sortOptions.map((item, index) => {
            return (
              <Fragment key={index}>
                <input id={`option-${index}`} className="align-middle" type="radio" name="sort-option" value={item.value} checked={this.state.currentOption == item.value} onChange={this.switchOption} />
                <label htmlFor={`option-${index}`} className="align-middle m-2">{item.text}</label><br />
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
