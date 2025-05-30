import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { processor } from '@seafile/seafile-editor';
import classnames from 'classnames';
import { gettext } from '../../../utils/constants';
import { Utils } from '../../../utils/utils';
import getPreviewContent from '../../../utils/markdown-utils';
import AddOrUpdateTermDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-add-or-update-term-dialog';
import CommonOperationConfirmationDialog from '../../../components/dialog/common-operation-confirmation-dialog';
import TermsPreviewDialog from '../../../components/dialog/terms-preview-dialog';
import ModalPortal from '../../../components/modal-portal';
import OpMenu from '../../../components/dialog/op-menu';

dayjs.extend(relativeTime);

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      itemContent: '...',
      isHighlighted: false,
      isOpIconShown: false,
      isUpdateDialogOpen: false,
      isDeleteDialogOpen: false,
      isTermsPreviewDialogOpen: false,
    };
  }

  componentDidMount() {
    let mdFile = this.props.item.text;
    processor.process(mdFile).then((result) => {
      let innerHtml = String(result);
      this.setState({ itemContent: innerHtml });
    });
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (nextProps.item.text !== this.props.item.text) {
      let mdFile = nextProps.item.text;
      processor.process(mdFile).then((result) => {
        let innerHtml = String(result);
        this.setState({ itemContent: innerHtml });
      });
    }
  }

  handleMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isOpIconShown: true,
        isHighlighted: true
      });
    }
  };

  handleMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isOpIconShown: false,
        isHighlighted: false
      });
    }
  };

  toggleUpdateDialog = (e) => {
    this.setState({ isUpdateDialogOpen: !this.state.isUpdateDialogOpen });
  };

  toggleDeleteDialog = (e) => {
    this.setState({ isDeleteDialogOpen: !this.state.isDeleteDialogOpen });
  };

  toggleTermsContentDialog = (e) => {
    this.setState({ isTermsPreviewDialogOpen: !this.state.isTermsPreviewDialogOpen });
  };

  onMenuItemClick = (operation) => {
    switch (operation) {
      case 'Update':
        this.toggleUpdateDialog();
        break;
      case 'Delete':
        this.toggleDeleteDialog();
        break;
    }
  };

  onUnfreezedItem = () => {
    this.setState({
      isHighlighted: false,
      isOpIconShow: false
    });
    this.props.onUnfreezedItem();
  };

  deleteTerm = () => {
    this.props.deleteTerm(this.props.item.id);
    this.toggleDeleteDialog();
  };

  updateTerm = (name, versionNumber, text, isActive) => {
    this.props.updateTerm(this.props.item.id, name, versionNumber, text, isActive);
    this.toggleUpdateDialog();
  };

  translateOperations = (item) => {
    let translateResult = '';
    switch (item) {
      case 'Update':
        translateResult = gettext('Update');
        break;
      case 'Delete':
        translateResult = gettext('Delete');
        break;
      default:
        break;
    }

    return translateResult;
  };

  render() {
    let { item } = this.props;
    let { isDeleteDialogOpen, isUpdateDialogOpen, isTermsPreviewDialogOpen, isHighlighted } = this.state;
    let previewContent = getPreviewContent(item.text);
    let itemName = '<span class="op-target">' + Utils.HTMLescape(item.name) + '</span>';
    let deleteDialogMsg = gettext('Are you sure you want to delete {placeholder} ?').replace('{placeholder}', itemName);
    return (
      <Fragment>
        <tr
          className={classnames({
            'tr-highlight': isHighlighted
          })}
          onMouseEnter={this.handleMouseEnter}
          onMouseLeave={this.handleMouseLeave}
        >
          <td>{item.name}</td>
          <td>{item.version_number}</td>
          <td className="ellipsis">
            <a href='#' onClick={this.toggleTermsContentDialog}>{previewContent.previewText}</a>
          </td>
          <td>{dayjs(item.ctime).fromNow()}</td>
          <td>{item.activate_time ? dayjs(item.activate_time).fromNow() : '--'}</td>
          <td>
            {this.state.isOpIconShown &&
              <OpMenu
                operations={['Update', 'Delete']}
                translateOperations={this.translateOperations}
                onMenuItemClick={this.onMenuItemClick}
                onFreezedItem={this.props.onFreezedItem}
                onUnfreezedItem={this.onUnfreezedItem}
              />
            }
          </td>
        </tr>
        {isDeleteDialogOpen &&
          <ModalPortal>
            <CommonOperationConfirmationDialog
              title={gettext('Delete T&C')}
              message={deleteDialogMsg}
              toggleDialog={this.toggleDeleteDialog}
              executeOperation={this.deleteTerm}
              confirmBtnText={gettext('Delete')}
            />
          </ModalPortal>
        }
        {isUpdateDialogOpen &&
          <ModalPortal>
            <AddOrUpdateTermDialog
              updateTerm={this.updateTerm}
              toggle={this.toggleUpdateDialog}
              isUpdate={true}
              oldTermObj={item}
            />
          </ModalPortal>
        }
        {isTermsPreviewDialogOpen &&
          <ModalPortal>
            <TermsPreviewDialog
              content={item.text}
              onClosePreviewDialog={this.toggleTermsContentDialog}
            />
          </ModalPortal>
        }
      </Fragment>
    );
  }
}

Item.propTypes = {
  item: PropTypes.object.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  onFreezedItem: PropTypes.func.isRequired,
  onUnfreezedItem: PropTypes.func.isRequired,
  deleteTerm: PropTypes.func.isRequired,
  updateTerm: PropTypes.func.isRequired,
};

export default Item;
