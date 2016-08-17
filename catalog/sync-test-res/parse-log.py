#!/usr/bin/python

recv = []
propagate = []

# local catalog
with open("92-files/catalog-lbl.log", "r") as ins:
    for line in ins:
        if "!!!" in line:
            line = line.strip().split()
            #print line[-1]
            recv.append(float(line[-1]))

#print recv

# remote catalog
with open("92-files/catalog-sac.log", "r") as ins:
    for line in ins:
        if "!!!" in line:
            line = line.strip().split()
            #print line[-1]
            propagate.append(float(line[-1]))

#print propagate

add = []
remove = []
for i in range(len(recv)):
    if i%2 == 0:
        add.append(propagate[i] - recv[i])
    else:
        remove.append(propagate[i] - recv[i])

print "add", add
print "remove", remove
