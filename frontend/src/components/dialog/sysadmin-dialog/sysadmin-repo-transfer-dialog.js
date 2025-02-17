import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalBody, ModalFooter } from 'reactstrap';
import { gettext } from '../../../utils/constants';
import UserSelect from '../../user-select';
import SeahubModalHeader from '@/components/common/seahub-modal-header';

const propTypes = {
  repoName: PropTypes.string.isRequired,
  toggle: PropTypes.func.isRequired,
  submit: PropTypes.func.isRequired,
};

class SysAdminRepoTransferDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedOption: null,
      errorMsg: [],
    };
    this.userSelect = React.createRef();
  }

  handleSelectChange = (option) => {
    this.setState({ selectedOption: option });
  };

  submit = () => {
    let user = this.state.selectedOption;
    this.props.submit(user);
  };

  render() {
    const repoName = this.props.repoName;
    const innerSpan = '<span class="op-target" title=' + repoName + '>' + repoName + '</span>';
    let msg = gettext('Transfer Library {library_name}');
    let message = msg.replace('{library_name}', innerSpan);
    return (
      <Modal isOpen={true} toggle={this.props.toggle}>
        <SeahubModalHeader toggle={this.props.toggle}>
          <div dangerouslySetInnerHTML={{ __html: message }} />
        </SeahubModalHeader>
        <ModalBody>
          <UserSelect
            ref={this.userSelect}
            isMulti={false}
            placeholder={gettext('Search users')}
            onSelectChange={this.handleSelectChange}
          />
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.submit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

SysAdminRepoTransferDialog.propTypes = propTypes;

export default SysAdminRepoTransferDialog;
