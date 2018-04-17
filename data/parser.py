import os
import pandas as pd
import re
import csv
import json

nodeList = [] #entries within nodelist have the format {name: df['code'], id: df['code'].str.strip(), group: ?}
linkList = [] #entries within linklist have format {source: df['code'].str.strip(), target: id, value: 32 (or) 64 (and) }

for file in os.listdir('./parsed_data/'):
    reader = csv.DictReader(open('./parsed_data/' + file), fieldnames=['code','title','units','prereqs','offered','corrupt','prereqs_parsed'])
    for row in reader:
        if row['code'] == 'code':
            continue
        nodeDict = {"name": row['code'], "group": 1, "details": row['prereqs_parsed'], "id": row['code'].replace(" ", ""), "title": row['title']}
        print(nodeDict)
        nodeList.append(nodeDict)
        if row['prereqs_parsed']:
            prereqs = row['prereqs_parsed']
            reqs = re.split(r'[()|&]', prereqs)
            reqs = [r for r in reqs if r]
            for r in reqs:
                linkDict = {'source': row['code'].replace(" ", ""), 'target':r, 'value': 32}
                linkList.append(linkDict)
outjson = {'nodes':nodeList, 'links':linkList}
json.dump(outjson, open('nodes_links.json', 'w'))
