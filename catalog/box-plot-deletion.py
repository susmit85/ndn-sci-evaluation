## http://blog.bharatbhole.com/creating-boxplots-with-matplotlib/


## numpy is used for creating fake data
import numpy as np
import matplotlib as mpl

## agg backend is used to create plot as a .png file
mpl.use('agg')

import matplotlib.pyplot as plt

#np.random.seed(10)
#collectn_1 = np.random.normal(100, 10, 200)
#collectn_2 = np.random.normal(80, 30, 200)
#collectn_3 = np.random.normal(90, 20, 200)
#collectn_4 = np.random.normal(70, 25, 200)

collectn_1 = np.array([164.0, 258.0, 165.0, 202.0, 162.0, 158.0, 172.0, 158.0, 154.0, 159.0])
collectn_2 = np.array([163.0, 158.0, 160.0, 178.0, 359.0, 162.0, 164.0, 179.0, 159.0, 161.0])
collectn_3 = np.array([167.0, 165.0, 171.0, 172.0, 151.0, 164.0, 165.0, 172.0, 165.0, 165.0])
collectn_4 = np.array([168.0, 181.0, 171.0, 160.0, 173.0, 174.0, 162.0, 174.0, 173.0, 166.0])
collectn_5 = np.array([314.0, 173.0, 182.0, 171.0, 174.0, 170.0, 181.0, 172.0, 544.0, 170.0])
collectn_6 = np.array([182.0, 175.0, 180.0, 486.0, 488.0, 181.0, 334.0, 176.0, 187.0, 640.0])
collectn_7 = np.array([191.0, 259.0, 211.0, 189.0, 212.0, 190.0, 192.0, 206.0, 193.0, 365.0])
collectn_8 = np.array([524.0, 196.0, 207.0, 206.0, 213.0, 199.0, 460.0, 210.0, 203.0, 177.0])

## combine these different collections into a list
data_to_plot = [collectn_1, collectn_2, collectn_3, collectn_4, collectn_5, collectn_6, collectn_7, collectn_8]

# Create a figure instance
fig = plt.figure(1, figsize=(9, 6))

# Create an axes instance
ax = fig.add_subplot(111)

# Create the boxplot
bp = ax.boxplot(data_to_plot)

## add patch_artist=True option to ax.boxplot()
## to get fill color
bp = ax.boxplot(data_to_plot, patch_artist=True)

## change outline color, fill color and linewidth of the boxes
for box in bp['boxes']:
    # change outline color
    box.set( color='#7570b3', linewidth=2)
    # change fill color
    box.set( facecolor = '#1b9e77' )

## change color and linewidth of the whiskers
for whisker in bp['whiskers']:
    whisker.set(color='#7570b3', linewidth=2)

## change color and linewidth of the caps
for cap in bp['caps']:
    cap.set(color='#7570b3', linewidth=2)

## change color and linewidth of the medians
for median in bp['medians']:
    #median.set(color='#b2df8a', linewidth=2)
    median.set(color='red', linewidth=2)

## change the style of fliers and their fill
for flier in bp['fliers']:
    flier.set(marker='o', color='#e7298a', alpha=0.5)

## Custom x-axis labels
ax.set_xticklabels(['1', '2', '4', '8', '16', '32', '64', '92'])

## Remove top axes and right axes ticks
ax.get_xaxis().tick_bottom()
ax.get_yaxis().tick_left()

ax.set_xlabel('# Published-files')
ax.set_ylabel('Time(ms)')

#ax.set_yscale('log')

# Save the figure
fig.savefig('publishing-benchmark-removing-files.png', bbox_inches='tight')


