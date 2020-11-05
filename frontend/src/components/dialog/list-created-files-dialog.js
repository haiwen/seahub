import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter, Table } from 'reactstrap';
import { gettext, siteRoot, serviceURL } from '../../utils/constants';
import { Utils } from '../../utils/utils';

const propTypes = {
  activity: PropTypes.object.isRequired,
  toggleCancel: PropTypes.func.isRequired,
};

class ListCreatedFileDialog extends React.Component {

  toggle = (activity) => {
    this.props.toggleCancel(activity);
  }

  render() {
    let activity = this.props.activity;
    return (
      <Modal isOpen={true}>
        <ModalHeader toggle={this.toggle}>{gettext('Created Files')}</ModalHeader>
        <ModalBody>
          <Table>
            <thead>
              <tr>
                <th width='75%'>{gettext('Name')}</th>
                <th width='25%'>{gettext('Time')}</th>
              </tr>
            </thead>
            <tbody>
              {
                activity.createdFilesList.map((item, index) => {
                  let fileURL = `${siteRoot}lib/${item.repo_id}/file${Utils.encodePath(item.path)}`;
                  if (item.name.endsWith('(draft).md')) {
                    fileURL = serviceURL + '/drafts/' + item.draft_id + '/';
                  }
                  let fileLink = <a href={fileURL} target='_blank'>{item.name}</a>;
                  if (item.name.endsWith('(draft).md') && !item.draft_id) {
                    fileLink = item.name;
                  }
                  return (
                    <tr key={index}>
                      <td>{fileLink}</td>
                      <td>{moment(item.time).fromNow()}</td>
                    </tr>
                  );
                })
              }
            </tbody>
          </Table>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle.bind(this, activity)}>{gettext('Close')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

ListCreatedFileDialog.propTypes = propTypes;

export default ListCreatedFileDialog;
