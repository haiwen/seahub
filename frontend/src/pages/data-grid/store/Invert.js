import Operation from './operation';
import OperationTypes from './operation-types';

function invert(operation) {

  let op = new Operation(operation);
  let { type } = operation;
  switch(type) {

    case OperationTypes.DELETE_COLUMN : {
      op.type = OperationTypes.INSERT_COLUMN;
      return op;
    }

    case OperationTypes.INSERT_COLUMN : {
      op.type = OperationTypes.DELETE_COLUMN;
      return op;
    }

    case OperationTypes.DELETE_ROW : {
      op.type = OperationTypes.INSERT_ROW;
      return op;
    }

    case OperationTypes.INSERT_ROW : {
      op.type = OperationTypes.DELETE_ROW;
      return op;
    }

    default :
      break;
  }
}

export default invert;
