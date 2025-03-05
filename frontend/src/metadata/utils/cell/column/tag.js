import { getTagName } from '../../../../tag/utils/cell';
import { getRowById } from '../../../../components/sf-table/utils/table';

export const getTagsDisplayString = (tagsData, cellValue) => {
  if (!tagsData) return '';
  if (!Array.isArray(cellValue) || cellValue.length === 0) return '';
  return cellValue.map(item => getRowById(tagsData, item.row_id)).map(tag => getTagName(tag)).join(', ');
};
