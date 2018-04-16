import os
import csv
from pyparsing import Word, alphas, nums

coursePrereq = Word(alphas) + ' ' + Word(nums)

filename = './department_course_data/CHEM.csv'
readFile = open(filename, 'r')
reader = csv.DictReader(readFile)

for row in reader:
    code = row['code']
    prereqString = row['prereqs']
    prereq =



for filename in os.listdir('./department_course_data/'):
