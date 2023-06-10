import json
from collections import defaultdict
from functools import partial


def compare_elements(base_element, element):
    if base_element != element['node']:
        return base_element in element['node']


def fill_tree(root, nodes):
    tree = defaultdict(list)
    for node in nodes:
        if node['done']:
            continue
        if root != node['node']:
            new_tree = fill_tree(node['node'], list(filter(partial(compare_elements, node['node']), nodes)))  
            if new_tree:
                tree[root].append(dict(new_tree))
                continue

        node['done'] = True
        tree[root].append(node['element'])
   
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
        tree.append(dict(fill_tree(root, [el for el in seq_data if el['root'] == root])))

    return json.dumps(tree, ensure_ascii=False)
