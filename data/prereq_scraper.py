from bs4 import BeautifulSoup
import collections
import requests
import json
import csv



#if running on machine/aws/whatever for the first time, initially collects all the urls to look up
def get_urls():
    try:
        departmentUrls = json.load(open('urls.json'))
    except FileNotFoundError as e:
        content = requests.get('http://guide.berkeley.edu/courses/').content
        soup = BeautifulSoup(content, 'html.parser')

        departmentUrls = collections.defaultdict(str)

        for link in soup.find_all('a'):
            linkUrl = link.get('href')
            if linkUrl and '/courses' in linkUrl:
                linkText = link.contents[0]
                departmentName = linkText[linkText.find("(")+1:linkText.find(")")] #get the department code by taking the part within the parentheses, and stirpping out the parentheses
                departmentUrls[departmentName] = 'http://guide.berkeley.edu' + linkUrl

        with open('urls.json', 'w') as outFile:
            json.dump(departmentUrls, outFile)

    return departmentUrls

def go_through_courses(departmentName, url, writer):
    content = requests.get(url).content
    soup = BeautifulSoup(content, 'html.parser')
    for courseBlock in soup.find_all("div", "courseblock"):
        find_prereqs_for_course(courseBlock, writer)

def find_prereqs_for_course(courseBlock, writer):
    #check to see if course is legacy or not, since the source of information contains all courses ever from the stone age onward

    for elem in courseBlock.find('div', 'coursebody').find('p', 'courseblockdesc').find('span', 'descshow').contents:
        termsOffered += str(elem)
    if not('2018' in termsOffered or '2017' in termsOffered or '2016' in termsOffered):
        return

    #get text in the 'course code/title/units' section. Since browser encodes space as '\xa0', remove that.
    #the identifiers (code, title, hours) are unique within the courseblock div, so no need to find_all
    courseCode = courseBlock.find('span', 'code').contents[0].replace(u'\xa0', ' ')
    courseTitle = courseBlock.find('span', 'title').contents[0].replace(u'\xa0', ' ')
    courseUnits = courseBlock.find('span', 'hours').contents[0].replace(u'\xa0', ' ')

    #there are n subsections of info in the courseblock section. find the appropriate one containing the requirements
    #typically this is the first one, which is returned by a .find. However, let's just look through all of them just in case. some courses don't have this subsection.
    courseInfo = courseBlock.find_all('div', 'course-section')
    requirementBlock = None
    for section in courseInfo:
        if 'Requirements' in section.find('p', 'course-heading').find('strong').contents[0]:
            requirementBlock = section

    prereqText = ""
    corrupt = 0
    #in the event that a requirement block doesn't exist, or one exists but the child prerequisite block doesn't exist, write "" to output
    #in the event that any structure/section is weird, mark it as needing manual intervention
    if requirementBlock:
        #if there is a block for requirements, let's explore it
        #typically, the 'prereqs' section is the 2nd <p>, but let's not take any risks - some courses also don't have a 'prereqs' section
        entries = requirementBlock.find_all('p')
        prerequisiteBlock = None
        for entry in entries:
            if 'Prerequisites' in entry.find('strong').contents[0]:
                prerequisiteBlock = entry

        if prerequisiteBlock:
            #first entry is typically the <strong>prerequisite thing; second one is plaintext requirements
            #jUST IN CASE we have some funkier structure here, tag the entry as potentially 'corrupt' if the structure is not as expected
            prereqText = prerequisiteBlock.contents[1]
            if len(prerequisiteBlock.contents) > 2:
                corrupt = 1
    courseInfoDict = {'code': courseCode, 'title': courseTitle, 'units':courseUnits, 'prereqs':prereqText, 'offered':termsOffered, 'corrupt':corrupt}
    writer.writerow(courseInfoDict)

if __name__ == '__main__':
    urls = get_urls()
    for departmentName, url in urls.items():
        if '/' in departmentName:
            departmentName = departmentName.replace('/', '')
        writeFile = open(departmentName + '.csv', 'w')
        writer = csv.DictWriter(writeFile, fieldnames = ['code', 'title', 'units', 'prereqs', 'offered', 'corrupt'])
        writer.writeheader()
        go_through_courses(departmentName, url, writer)
        writeFile.close()
