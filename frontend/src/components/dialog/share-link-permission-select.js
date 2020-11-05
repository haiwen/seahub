import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody } from 'reactstrap';
import { Utils } from '../../utils/utils';

const propTypes = {
  currentPerm: PropTypes.string.isRequired,
  permissions: PropTypes.array.isRequired,
  changePerm: PropTypes.func.isRequired,
  toggleDialog: PropTypes.func.isRequired
};

class ShareLinkPermissionSelect extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      currentOption: this.props.currentPerm
    };
  }

  switchOption = (e) => {
    if (!e.target.checked) {
      return;
    }

    const currentOption = e.target.value;
    this.setState({
      currentOption: currentOption
    });

    this.props.changePerm(currentOption);
    this.props.toggleDialog();
  }

  render() {
    const options = this.props.permissions;
    const { currentOption } = this.state;

    return (
      <Modal isOpen={true} toggle={this.props.toggleDialog}>
        <ModalBody>
          {options.map((item, index) => {
            return (
              <div className="d-flex" key={index}>
                <input id={`option-${index}`} className="mt-1" type="radio" name="permission" value={item} checked={currentOption == item} onChange={this.switchOption} />
                <label htmlFor={`option-${index}`} className="ml-2">
                  {Utils.getShareLinkPermissionObject(item).text}
                </label>
              </div>
            );
          })}
        </ModalBody>
      </Modal>
    );
  }
}

ShareLinkPermissionSelect.propTypes = propTypes;

export default ShareLinkPermissionSelect;
