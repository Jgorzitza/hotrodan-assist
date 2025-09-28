#!/usr/bin/env python3
"""
RPG Graph Validator
Validates the Repository Plan Graph for cycles, structure, and topology consistency.
"""

import json
import sys
from collections import defaultdict, deque
from typing import Dict, List, Set, Tuple

def load_rpg(filepath: str) -> dict:
    """Load and parse the RPG JSON file."""
    with open(filepath, 'r') as f:
        return json.load(f)

def build_graph(rpg: dict) -> Tuple[Dict[str, List[str]], Dict[str, Set[str]]]:
    """Build adjacency lists for the graph and reverse graph."""
    graph = defaultdict(list)
    reverse_graph = defaultdict(set)
    
    for edge in rpg['edges']:
        src = edge['src']
        dst = edge['dst']
        graph[src].append(dst)
        reverse_graph[dst].add(src)
    
    return dict(graph), dict(reverse_graph)

def detect_cycles(graph: Dict[str, List[str]]) -> List[List[str]]:
    """Detect cycles in the graph using DFS."""
    WHITE, GRAY, BLACK = 0, 1, 2
    color = {node: WHITE for node in graph}
    cycles = []
    
    def dfs(node: str, path: List[str]) -> None:
        if color[node] == GRAY:
            # Found a cycle
            cycle_start = path.index(node)
            cycles.append(path[cycle_start:] + [node])
            return
        
        if color[node] == BLACK:
            return
        
        color[node] = GRAY
        path.append(node)
        
        for neighbor in graph.get(node, []):
            dfs(neighbor, path.copy())
        
        color[node] = BLACK
    
    for node in graph:
        if color[node] == WHITE:
            dfs(node, [])
    
    return cycles

def validate_topology_layers(rpg: dict) -> List[str]:
    """Validate that topology layers are consistent with the graph."""
    errors = []
    graph, reverse_graph = build_graph(rpg)
    
    # Check that all nodes appear in exactly one layer
    all_nodes = set(node['id'] for node in rpg['nodes'])
    layer_nodes = set()
    
    for i, layer in enumerate(rpg['topo_layers']):
        for node in layer:
            if node in layer_nodes:
                errors.append(f"Node {node} appears in multiple topology layers")
            layer_nodes.add(node)
    
    missing_nodes = all_nodes - layer_nodes
    if missing_nodes:
        errors.append(f"Nodes missing from topology layers: {missing_nodes}")
    
    # Check layer ordering constraints
    for i, layer in enumerate(rpg['topo_layers']):
        for node in layer:
            # Check that all dependencies of this node are in earlier layers
            for dep in reverse_graph.get(node, []):
                dep_layer = None
                for j, check_layer in enumerate(rpg['topo_layers']):
                    if dep in check_layer:
                        dep_layer = j
                        break
                
                if dep_layer is None:
                    errors.append(f"Dependency {dep} of {node} not found in any layer")
                elif dep_layer >= i:
                    errors.append(f"Dependency {dep} of {node} is in layer {dep_layer} >= {i}")
    
    return errors

def validate_edge_types(rpg: dict) -> List[str]:
    """Validate that edge types are consistent with the defined types."""
    errors = []
    valid_types = set(rpg['scheduling_edge_types'])
    
    for edge in rpg['edges']:
        if edge['type'] not in valid_types:
            errors.append(f"Invalid edge type '{edge['type']}' in edge {edge['src']} -> {edge['dst']}")
    
    return errors

def validate_node_references(rpg: dict) -> List[str]:
    """Validate that all edge references point to existing nodes."""
    errors = []
    node_ids = set(node['id'] for node in rpg['nodes'])
    
    for edge in rpg['edges']:
        if edge['src'] not in node_ids:
            errors.append(f"Edge source '{edge['src']}' not found in nodes")
        if edge['dst'] not in node_ids:
            errors.append(f"Edge destination '{edge['dst']}' not found in nodes")
    
    return errors

def main():
    if len(sys.argv) != 2:
        print("Usage: python validate_rpg.py <rpg.json>")
        sys.exit(1)
    
    rpg_file = sys.argv[1]
    
    try:
        rpg = load_rpg(rpg_file)
    except Exception as e:
        print(f"Error loading RPG file: {e}")
        sys.exit(1)
    
    print("Validating RPG Graph...")
    print("=" * 50)
    
    # Build graph
    graph, reverse_graph = build_graph(rpg)
    
    # Check for cycles
    cycles = detect_cycles(graph)
    if cycles:
        print("❌ CYCLES DETECTED:")
        for cycle in cycles:
            print(f"  {' -> '.join(cycle)}")
        print()
    else:
        print("✅ No cycles detected")
    
    # Validate edge types
    edge_errors = validate_edge_types(rpg)
    if edge_errors:
        print("❌ EDGE TYPE ERRORS:")
        for error in edge_errors:
            print(f"  {error}")
        print()
    else:
        print("✅ All edge types are valid")
    
    # Validate node references
    node_errors = validate_node_references(rpg)
    if node_errors:
        print("❌ NODE REFERENCE ERRORS:")
        for error in node_errors:
            print(f"  {error}")
        print()
    else:
        print("✅ All edge references are valid")
    
    # Validate topology layers
    topo_errors = validate_topology_layers(rpg)
    if topo_errors:
        print("❌ TOPOLOGY LAYER ERRORS:")
        for error in topo_errors:
            print(f"  {error}")
        print()
    else:
        print("✅ Topology layers are valid")
    
    # Summary
    total_errors = len(cycles) + len(edge_errors) + len(node_errors) + len(topo_errors)
    if total_errors == 0:
        print("🎉 RPG Graph is VALID!")
        sys.exit(0)
    else:
        print(f"❌ RPG Graph has {total_errors} errors")
        sys.exit(1)

if __name__ == "__main__":
    main()
