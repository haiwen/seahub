import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import AISearchIcon from '../assets/icons/AI-search.svg';
import AddTableIcon from '../assets/icons/add-table.svg';
import AiIcon from '../assets/icons/ai.svg';
import ArrowIcon from '../assets/icons/arrow.svg';
import BellIcon from '../assets/icons/bell.svg';
import CheckCircleIcon from '../assets/icons/check-circle.svg';
import CheckMarkIcon from '../assets/icons/check-mark.svg';
import CheckSquareSolidIcon from '../assets/icons/check-square-solid.svg';
import CheckboxIcon from '../assets/icons/checkbox.svg';
import ClientIcon from '../assets/icons/client.svg';
import CloseIcon from '../assets/icons/close.svg';
import CollaboratorIcon from '../assets/icons/collaborator.svg';
import CopyIcon from '../assets/icons/copy.svg';
import CreationTimeIcon from '../assets/icons/creation-time.svg';
import CreatorIcon from '../assets/icons/creator.svg';
import CurrencyIcon from '../assets/icons/currency.svg';
import DateIcon from '../assets/icons/date.svg';
import DeleteIcon from '../assets/icons/delete.svg';
import DescriptionIcon from '../assets/icons/description.svg';
import DoubleArrowDownIcon from '../assets/icons/double-arrow-down.svg';
import DoubleArrowUpIcon from '../assets/icons/double-arrow-up.svg';
import DownloadIcon from '../assets/icons/download.svg';
import DragIcon from '../assets/icons/drag.svg';
import DropDownIcon from '../assets/icons/drop-down.svg';
import EditIcon from '../assets/icons/edit.svg';
import ExclamationCircleIcon from '../assets/icons/exclamation-circle.svg';
import ExclamationTriangleIcon from '../assets/icons/exclamation-triangle.svg';
import ExpandIcon from '../assets/icons/expand.svg';
import EyeSlashIcon from '../assets/icons/eye-slash.svg';
import FaceRecognitionViewIcon from '../assets/icons/face-recognition-view.svg';
import FileIcon from '../assets/icons/file.svg';
import FilesIcon from '../assets/icons/files.svg';
import FilterCircledIcon from '../assets/icons/filter-circled.svg';
import FilterIcon from '../assets/icons/filter.svg';
import FlagIcon from '../assets/icons/flag.svg';
import FolderIcon from '../assets/icons/folder.svg';
import FoldersIcon from '../assets/icons/folders.svg';
import ForkNumberIcon from '../assets/icons/fork-number.svg';
import GroupIcon from '../assets/icons/group.svg';
import HelpfulSelectedIcon from '../assets/icons/helpful-selected.svg';
import HelpfulIcon from '../assets/icons/helpful.svg';
import HelplessSelectedIcon from '../assets/icons/helpless-selected.svg';
import HelplessIcon from '../assets/icons/helpless.svg';
import HideIcon from '../assets/icons/hide.svg';
import ImageIcon from '../assets/icons/image.svg';
import InfoIcon from '../assets/icons/info.svg';
import KanbanIcon from '../assets/icons/kanban.svg';
import LeftArrowIcon from '../assets/icons/left_arrow.svg';
import LikeIcon from '../assets/icons/like.svg';
import LinkIcon from '../assets/icons/link.svg';
import LinkageIcon from '../assets/icons/linkage.svg';
import LocationIcon from '../assets/icons/location.svg';
import LockIcon from '../assets/icons/lock.svg';
import LongTextIcon from '../assets/icons/long-text.svg';
import MainViewIcon from '../assets/icons/main-view.svg';
import MapIcon from '../assets/icons/map.svg';
import MarkdownIcon from '../assets/icons/markdown.svg';
import MinusSignIcon from '../assets/icons/minus_sign.svg';
import MonitorIcon from '../assets/icons/monitor.svg';
import MoreLevelIcon from '../assets/icons/more-level.svg';
import MoreVerticalIcon from '../assets/icons/more-vertical.svg';
import MoveToIcon from '../assets/icons/move-to.svg';
import MultipleSelectIcon from '../assets/icons/multiple-select.svg';
import NumberIcon from '../assets/icons/number.svg';
import OpenFileIcon from '../assets/icons/open-file.svg';
import OpenFolderIcon from '../assets/icons/open-folder.svg';
import PartiallySelectedIcon from '../assets/icons/partially-selected.svg';
import PlusSignIcon from '../assets/icons/plus_sign.svg';
import PraiseIcon from '../assets/icons/praise.svg';
import PrintIcon from '../assets/icons/print.svg';
import RateIcon from '../assets/icons/rate.svg';
import RemoveFromFolderIcon from '../assets/icons/remove-from-folder.svg';
import RenameIcon from '../assets/icons/rename.svg';
import RightArrowIcon from '../assets/icons/right_arrow.svg';
import RotateIcon from '../assets/icons/rotate.svg';
import RowHeightDefaultIcon from '../assets/icons/row-height-default.svg';
import RowHeightDoubleIcon from '../assets/icons/row-height-double.svg';
import RowHeightQuadrupleIcon from '../assets/icons/row-height-quadruple.svg';
import RowHeightTripleIcon from '../assets/icons/row-height-triple.svg';
import SaveIcon from '../assets/icons/save.svg';
import SearchIcon from '../assets/icons/search.svg';
import SendIcon from '../assets/icons/send.svg';
import SetUpIcon from '../assets/icons/set-up.svg';
import ShareIcon from '../assets/icons/share.svg';
import SingleSelectIcon from '../assets/icons/single-select.svg';
import SortAscendingIcon from '../assets/icons/sort-ascending.svg';
import SortDescendingIcon from '../assets/icons/sort-descending.svg';
import SortIcon from '../assets/icons/sort.svg';
import SpinnerIcon from '../assets/icons/spinner.svg';
import TableIcon from '../assets/icons/table.svg';
import TagIcon from '../assets/icons/tag.svg';
import TextIcon from '../assets/icons/text.svg';
import TimeIcon from '../assets/icons/time.svg';
import UnlockIcon from '../assets/icons/unlock.svg';
import UrlIcon from '../assets/icons/url.svg';
import WikiPreviewIcon from '../assets/icons/wiki-preview.svg';
import WikiSettingsIcon from '../assets/icons/wiki-settings.svg';
import X01Icon from '../assets/icons/x-01.svg';

import '../css/icon.css';


const Icon = (props) => {
  const { className, symbol, style } = props;
  const iconClass = classnames('seafile-multicolor-icon', className, `seafile-multicolor-icon-${symbol}`);
  const commonProps = { className: iconClass, style: style, 'aria-hidden': 'true' };

  switch (symbol) {
    case 'ai-search':
      return <AISearchIcon {...commonProps} />;
    case 'add-table':
      return <AddTableIcon {...commonProps} />;
    case 'ai':
      return <AiIcon {...commonProps} />;
    case 'arrow':
      return <ArrowIcon {...commonProps} />;
    case 'bell':
      return <BellIcon {...commonProps} />;
    case 'check-circle':
      return <CheckCircleIcon {...commonProps} />;
    case 'check-mark':
      return <CheckMarkIcon {...commonProps} />;
    case 'check-square-solid':
      return <CheckSquareSolidIcon {...commonProps} />;
    case 'checkbox':
      return <CheckboxIcon {...commonProps} />;
    case 'client':
      return <ClientIcon {...commonProps} />;
    case 'close':
      return <CloseIcon {...commonProps} />;
    case 'collaborator':
      return <CollaboratorIcon {...commonProps} />;
    case 'copy':
      return <CopyIcon {...commonProps} />;
    case 'creation-time':
      return <CreationTimeIcon {...commonProps} />;
    case 'creator':
      return <CreatorIcon {...commonProps} />;
    case 'currency':
      return <CurrencyIcon {...commonProps} />;
    case 'date':
      return <DateIcon {...commonProps} />;
    case 'delete':
      return <DeleteIcon {...commonProps} />;
    case 'description':
      return <DescriptionIcon {...commonProps} />;
    case 'double-arrow-down':
      return <DoubleArrowDownIcon {...commonProps} />;
    case 'double-arrow-up':
      return <DoubleArrowUpIcon {...commonProps} />;
    case 'download':
      return <DownloadIcon {...commonProps} />;
    case 'drag':
      return <DragIcon {...commonProps} />;
    case 'drop-down':
      return <DropDownIcon {...commonProps} />;
    case 'edit':
      return <EditIcon {...commonProps} />;
    case 'exclamation-circle':
      return <ExclamationCircleIcon {...commonProps} />;
    case 'exclamation-triangle':
      return <ExclamationTriangleIcon {...commonProps} />;
    case 'expand':
      return <ExpandIcon {...commonProps} />;
    case 'eye-slash':
      return <EyeSlashIcon {...commonProps} />;
    case 'face-recognition-view':
      return <FaceRecognitionViewIcon {...commonProps} />;
    case 'file':
      return <FileIcon {...commonProps} />;
    case 'files':
      return <FilesIcon {...commonProps} />;
    case 'filter-circled':
      return <FilterCircledIcon {...commonProps} />;
    case 'filter':
      return <FilterIcon {...commonProps} />;
    case 'flag':
      return <FlagIcon {...commonProps} />;
    case 'folder':
      return <FolderIcon {...commonProps} />;
    case 'folders':
      return <FoldersIcon {...commonProps} />;
    case 'fork-number':
      return <ForkNumberIcon {...commonProps} />;
    case 'group':
      return <GroupIcon {...commonProps} />;
    case 'helpful-selected':
      return <HelpfulSelectedIcon {...commonProps} />;
    case 'helpful':
      return <HelpfulIcon {...commonProps} />;
    case 'helpless-selected':
      return <HelplessSelectedIcon {...commonProps} />;
    case 'helpless':
      return <HelplessIcon {...commonProps} />;
    case 'hide':
      return <HideIcon {...commonProps} />;
    case 'image':
      return <ImageIcon {...commonProps} />;
    case 'info':
      return <InfoIcon {...commonProps} />;
    case 'kanban':
      return <KanbanIcon {...commonProps} />;
    case 'left_arrow':
      return <LeftArrowIcon {...commonProps} />;
    case 'like':
      return <LikeIcon {...commonProps} />;
    case 'link':
      return <LinkIcon {...commonProps} />;
    case 'linkage':
      return <LinkageIcon {...commonProps} />;
    case 'location':
      return <LocationIcon {...commonProps} />;
    case 'lock':
      return <LockIcon {...commonProps} />;
    case 'long-text':
      return <LongTextIcon {...commonProps} />;
    case 'main-view':
      return <MainViewIcon {...commonProps} />;
    case 'map':
      return <MapIcon {...commonProps} />;
    case 'markdown':
      return <MarkdownIcon {...commonProps} />;
    case 'minus_sign':
      return <MinusSignIcon {...commonProps} />;
    case 'monitor':
      return <MonitorIcon {...commonProps} />;
    case 'more-level':
      return <MoreLevelIcon {...commonProps} />;
    case 'more-vertical':
      return <MoreVerticalIcon {...commonProps} />;
    case 'move-to':
      return <MoveToIcon {...commonProps} />;
    case 'multiple-select':
      return <MultipleSelectIcon {...commonProps} />;
    case 'number':
      return <NumberIcon {...commonProps} />;
    case 'open-file':
      return <OpenFileIcon {...commonProps} />;
    case 'open-folder':
      return <OpenFolderIcon {...commonProps} />;
    case 'partially-selected':
      return <PartiallySelectedIcon {...commonProps} />;
    case 'plus_sign':
      return <PlusSignIcon {...commonProps} />;
    case 'praise':
      return <PraiseIcon {...commonProps} />;
    case 'print':
      return <PrintIcon {...commonProps} />;
    case 'rate':
      return <RateIcon {...commonProps} />;
    case 'remove-from-folder':
      return <RemoveFromFolderIcon {...commonProps} />;
    case 'rename':
      return <RenameIcon {...commonProps} />;
    case 'right_arrow':
      return <RightArrowIcon {...commonProps} />;
    case 'rotate':
      return <RotateIcon {...commonProps} />;
    case 'row-height-default':
      return <RowHeightDefaultIcon {...commonProps} />;
    case 'row-height-double':
      return <RowHeightDoubleIcon {...commonProps} />;
    case 'row-height-quadruple':
      return <RowHeightQuadrupleIcon {...commonProps} />;
    case 'row-height-triple':
      return <RowHeightTripleIcon {...commonProps} />;
    case 'save':
      return <SaveIcon {...commonProps} />;
    case 'search':
      return <SearchIcon {...commonProps} />;
    case 'send':
      return <SendIcon {...commonProps} />;
    case 'set-up':
      return <SetUpIcon {...commonProps} />;
    case 'share':
      return <ShareIcon {...commonProps} />;
    case 'single-select':
      return <SingleSelectIcon {...commonProps} />;
    case 'sort-ascending':
      return <SortAscendingIcon {...commonProps} />;
    case 'sort-descending':
      return <SortDescendingIcon {...commonProps} />;
    case 'sort':
      return <SortIcon {...commonProps} />;
    case 'spinner':
      return <SpinnerIcon {...commonProps} />;
    case 'table':
      return <TableIcon {...commonProps} />;
    case 'tag':
      return <TagIcon {...commonProps} />;
    case 'text':
      return <TextIcon {...commonProps} />;
    case 'time':
      return <TimeIcon {...commonProps} />;
    case 'unlock':
      return <UnlockIcon {...commonProps} />;
    case 'url':
      return <UrlIcon {...commonProps} />;
    case 'wiki-preview':
      return <WikiPreviewIcon {...commonProps} />;
    case 'wiki-settings':
      return <WikiSettingsIcon {...commonProps} />;
    case 'x-01':
      return <X01Icon {...commonProps} />;
    default:
      return null;
  }
};

Icon.propTypes = {
  symbol: PropTypes.string.isRequired,
  className: PropTypes.string,
  style: PropTypes.object,
};

export default Icon;
