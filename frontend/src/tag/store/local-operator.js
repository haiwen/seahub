import { OPERATION_TYPE } from './operations';

class LocalOperator {

  applyOperation(operation) {
    const { op_type } = operation;

    switch (op_type) {
      case OPERATION_TYPE.MODIFY_COLUMN_WIDTH: {
        const { column_key, new_width } = operation;
        try {
          const oldValue = window.sfTagsDataContext.localStorage.getItem('columns_width') || {};
          window.sfTagsDataContext.localStorage.setItem('columns_width', { ...oldValue, [column_key]: new_width });
        } catch (err) {
          break;
        }
        break;
      }
      default: {
        break;
      }
    }
  }

}

export default LocalOperator;
