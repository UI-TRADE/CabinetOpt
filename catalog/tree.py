import json
from collections import defaultdict
from functools import partial


def compare_elements(base_element, element):
    if base_element != element['node']:
        return base_element in element['node']


def fill_tree(root, nodes, top_node=''):
    tree = defaultdict(list)
    for node in nodes:
        if node['done']:
            continue
        if root != node['node']:
            new_tree = fill_tree(
                node['node'],
                list(filter(partial(compare_elements, node['node']), nodes)),
                top_node
            )  
            if new_tree:
                tree[root].append(dict(new_tree))
                continue

        node['done'] = True
        tree[root].append(node['element'] | {'root': top_node})
   
    return tree


def get_tree(seq_data):
    seq_data = [
        {
            'root': el['name'].split(' ')[0],
            'node': el['name'],
            'done': False,
            'element': el} \
                for el in sorted(seq_data, key=lambda x: x['name'].split()[0])
    ]

    tree = list()
    for root in sorted(set([el['root'] for el in seq_data])):
        tree.append(dict(fill_tree(
            root,
            [el for el in seq_data if el['root'] == root],
            root
        )))

    return json.dumps(tree, ensure_ascii=False)


def find_in_tree(tree, lookup_key):
    if isinstance(tree, dict):
        for key, val in tree.items():
            if key == lookup_key:
                yield val
            else:
                yield from find_in_tree(val, lookup_key)
    elif isinstance(tree, list):
        for item in tree:
            yield from find_in_tree(item, lookup_key)
