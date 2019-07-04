import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import Loading from '../loading';

const propTypes = {
  importDepartmentDialogToggle: PropTypes.func.isRequired,
  onImportDepartmentSubmit: PropTypes.func.isRequired,
  departmentsCount: PropTypes.number.isRequired,
  membersCount: PropTypes.number.isRequired,
  importDepartment: PropTypes.object.isRequired,
};

class ImportWorkWeixinDepartmentDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isWitting : false,
    };
  }

  toggle = () => {
    this.props.importDepartmentDialogToggle(null);
  };

  handleSubmit = () => {
    this.props.onImportDepartmentSubmit();
    this.setState({
      isWitting : true,
    });
  };

  render() {
    let departmentsCount = this.props.departmentsCount;
    let membersCount = this.props.membersCount;
    let name = this.props.importDepartment.name;

    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{'导入部门'} <span className="op-target" title={name}>{name}</span></ModalHeader>
        <ModalBody>
          <p>{'将要导入 '}<b>{departmentsCount}</b>{' 个部门，其中包括 '}<b>{membersCount}</b>{' 个成员'}</p>
          {this.state.isWitting &&
          <Loading/>
          }
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmit}>{'导入'}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

ImportWorkWeixinDepartmentDialog.propTypes = propTypes;

export default ImportWorkWeixinDepartmentDialog;
