import CustomNode from '../custom-node';
import { TYPE_CONDITION_NODE_CONFIG } from '../../constants/node-config';

const ConditionNode = ({ id, data }) => {
  const { config_id } = data || {};
  const nodeConfig = TYPE_CONDITION_NODE_CONFIG[config_id] || {};
  if (!nodeConfig) return null;
  return (
    <CustomNode
      id={id}
      data={data}
      label={nodeConfig.label}
      iconSymbol={nodeConfig.icon_symbol}
    />
  );
};

export default ConditionNode;
