import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { gettext, siteRoot } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import moment from 'moment';
import editorUtilities from '../../utils/editor-utilities';
import toaster from '../../components/toast';
import { Utils } from '../../utils/utils';
import Draft from '../../models/draft';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  toggle: PropTypes.func.isRequired,
};

class ListRepoDraftsDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      drafts: [],
    };
  }

  componentDidMount() {
    seafileAPI.listRepoDrafts(this.props.repoID).then(res => {
      let drafts = res.data.drafts.map(item => {
        let draft = new Draft(item);
        return draft;
      });
      this.setState({
        drafts: drafts
      });
    });
  }

  onDeleteDraftItem = (draft) => {
    editorUtilities.deleteDraft(draft.id).then(() => {
      let drafts = this.state.drafts.filter(item => {
        return item.id !== draft.id;
      });
      this.setState({drafts: drafts});
      let msg = gettext('Successfully deleted draft %(draft)s.');
      msg = msg.replace('%(draft)s', draft.draftFilePath);
      toaster.success(msg);
    }).catch(() => {
      let msg = gettext('Failed to delete draft %(draft)s.');
      msg = msg.replace('%(draft)s', draft.draftFilePath);
      toaster.danger(msg);
    });
  }

  toggle = () => {
    this.props.toggle();
  }

  render() {
    return (
      <Modal isOpen={true}>
        <ModalHeader toggle={this.toggle}>{gettext('Drafts')}</ModalHeader>
        <ModalBody className="dialog-list-container">
          <table>
            <thead>
              <tr>
                <th width='50%' className="ellipsis">{gettext('Name')}</th>
                <th width='20%'>{gettext('Owner')}</th>
                <th width='20%'>{gettext('Last Update')}</th>
                <th width='10%'></th>
              </tr>
            </thead>
            <tbody>
              {this.state.drafts.map((item, index) => {
                return (
                  <DraftItem
                    key={index}
                    draftItem={item}
                    onDeleteDraftItem={this.onDeleteDraftItem}
                  />
                );
              })}
            </tbody>
          </table>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Close')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

ListRepoDraftsDialog.propTypes = propTypes;

export default ListRepoDraftsDialog;

const DraftItemPropTypes = {
  draftItem: PropTypes.object,
  onDeleteDraftItem: PropTypes.func.isRequired,
};

class DraftItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = ({
      active: false,
    });
  }

  onMouseEnter = () => {
    this.setState({
      active: true
    });
  }

  onMouseLeave = () => {
    this.setState({
      active: false
    });
  }

  render() {
    const draftItem = this.props.draftItem;
    let href = siteRoot + 'drafts/' + draftItem.id + '/';
    let className = this.state.active ? 'action-icon sf2-icon-x3' : 'action-icon vh sf2-icon-x3';
    return (
      <tr onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td className="name">
          <a href={href} target='_blank'>{Utils.getFileName(draftItem.draftFilePath)}</a>
        </td>
        <td>{draftItem.ownerNickname}</td>
        <td>{moment(draftItem.createdStr).fromNow()}</td>
        <td>
          <i className={className} onClick={this.props.onDeleteDraftItem.bind(this, draftItem)}></i>
        </td>
      </tr>
    );
  }
}

DraftItem.propTypes = DraftItemPropTypes;
