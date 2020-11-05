import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import Loading from '../loading';

const propTypes = {
  importDepartmentDialogToggle: PropTypes.func.isRequired,
  onImportDepartmentSubmit: PropTypes.func.isRequired,
  departmentsCount: PropTypes.number.isRequired,
  membersCount: PropTypes.number.isRequired,
  departmentName: PropTypes.string.isRequired,
};

class ImportDingtalkDepartmentDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isLoading : false,
    };
  }

  toggle = () => {
    this.props.importDepartmentDialogToggle(null);
  };

  handleSubmit = () => {
    this.props.onImportDepartmentSubmit();
    this.setState({ isLoading : true });
  };

  render() {
    const { departmentsCount, membersCount, departmentName } = this.props;
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>
          <span>{'导入部门 '}</span><span className="op-target" title={departmentName}>{departmentName}</span>
        </ModalHeader>
        <ModalBody>
          <p>{'将要导入 '}<strong>{departmentsCount}</strong>{' 个部门，其中包括 '}<strong>{membersCount}</strong>{' 个成员'}</p>
          {this.state.isLoading && <Loading/>}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{'取消'}</Button>
          <Button color="primary" onClick={this.handleSubmit}>{'导入'}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

ImportDingtalkDepartmentDialog.propTypes = propTypes;

export default ImportDingtalkDepartmentDialog;
