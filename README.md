PruneCluster
============

PruneCluster is a fast and realtime marker clustering library.

It's compatible with [Leaflet](http://leafletjs.com/) and the goal is to provide the most of  [Leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster)'s features.

### 60 000 markers over Oslo, clustered in 70ms
![](http://medias.master-bridge.eu/resize/400/400/ac3faf9c2beba4376d8466f53405d330a9a7baab.png)

### Features

#### Realtime
The clusters are updated in realtime. It's perfect for live situations.

#### Fast

Number of markers|First step|Update (low zoom level)|Update (high zoom level)
---------|------------------|------------------------|------------------
[100](http://sintef-9012.github.io/PruneCluster/examples/random.100.html)|instant|instant|instant
[1 000](http://sintef-9012.github.io/PruneCluster/examples/random.1000.html)|instant|instant|instant
[10 000](http://sintef-9012.github.io/PruneCluster/examples/random.10000.html)|14ms|3ms|2ms
[60 000](http://sintef-9012.github.io/PruneCluster/examples/random.60000.html)|70ms|23ms|9ms
[150 000](http://sintef-9012.github.io/PruneCluster/examples/random.150000.html)|220ms|60ms|20ms
[1 000 000](http://sintef-9012.github.io/PruneCluster/examples/random.1000000.html)|1.9s|400ms|135ms

This values are tested with random positions, on a recent laptop and Chrome 38. The half of markers is moving randomly and the other half is static. It is also fast enough for mobile devices.

If you prefer real world data, the [50k Leaflet.markercluster example](http://sintef-9012.github.io/PruneCluster/examples/realworld.50000.html) is computed in 60ms *([original](http://sintef-9012.github.io/Leaflet.markercluster/example/marker-clustering-realworld.50000.html))*.

#### Weight
You can specify the weight of each marker.

For example, you may want to add more importance to a marker representing an incident than a marker representing a tweet.

#### Categories

When you set categories to your markers, a small object representing the number of markers for each category is attached with the clusters. This way, you can create cluster icons adapted to their content.

#### Dynamic cluster size

The size of cluster can be adjusted on the fly *([Example](http://sintef-9012.github.io/PruneCluster/examples/random.10000-size.html))*

### TODO list

 - [ ] Tests
 - [ ] Documentation
 - [ ] Stable alone markers (anti-overlaping improvement needed)
 - [ ] Beautiful examples
