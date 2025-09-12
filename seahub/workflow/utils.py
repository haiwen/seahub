

def check_graph(graph=None):
    if not graph:
        return False, None

    nodes = graph.get('nodes', [])
    edges = graph.get('edges', [])

    if not nodes:
        return False, None

    start_nodes = []
    action_nodes = []
    for node in nodes:
        node_type = node.get('type')
        node_id = node.get('id')
        node_config = node['data'].get('config_id')
        if not node_config:
            return False, "not configured"
        if node_type == 'trigger':
            start_nodes.append(node_id)
        if node_type == 'action':
            action_nodes.append(node_id)
    start_nodes =[node.get('id') for node in nodes if node.get('type') == 'trigger']
    if len(start_nodes) != 1:
        return False, None

    if len(edges) == 0:
        return False, "edges not found"

    if len(action_nodes) == 0:
        return False, "action node not found"

    node_ids = {n['id'] for n in nodes}
    start_node = start_nodes[0]
    is_start_node_edge = False
    for edge in edges:
        if edge['source'] not in node_ids or edge['target'] not in node_ids:
            return False, f"node not found: {edge['source']} -> {edge['target']}"
        if edge['source'] == start_node:
            is_start_node_edge = True

    if not is_start_node_edge:
        return False, "start node not edge"

    return True, True
