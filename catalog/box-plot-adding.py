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

collectn_1 = np.array([52.0, 51.0, 49.0, 50.0, 48.0, 50.0, 52.0, 49.0, 49.0, 51.0])
collectn_2 = np.array([53.0, 49.0, 49.0, 50.0, 49.0, 50.0, 144.0, 48.0, 48.0, 49.0])
collectn_3 = np.array([53.0, 49.0, 51.0, 414.0, 50.0, 48.0, 49.0, 49.0, 51.0, 44.0])
collectn_4 = np.array([54.0, 465.0, 50.0, 50.0, 49.0, 47.0, 51.0, 49.0, 47.0, 48.0])
collectn_5 = np.array([53.0, 200.0, 52.0, 53.0, 50.0, 52.0, 169.0, 52.0, 50.0, 51.0])
collectn_6 = np.array([58.0, 55.0, 53.0, 429.0, 253.0, 54.0, 72.0, 343.0, 64.0, 55.0])
collectn_7 = np.array([699.0, 139.0, 107.0, 69.0, 69.0, 61.0, 151.0, 72.0, 65.0, 60.0])
collectn_8 = np.array([125.0, 203.0, 72.0, 71.0, 210.0, 269.0, 64.0, 68.0, 84.0, 101.0])

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
fig.savefig('publishing-benchmark-adding-files.png', bbox_inches='tight')


