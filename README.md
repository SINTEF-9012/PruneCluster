![PruneCluster](http://medias.master-bridge.eu/e30525b1a92f01204ac69039a642e370c85bf906.png)
============

PruneCluster is a fast and realtime marker clustering library.

It's working with [Leaflet](http://leafletjs.com/) as an alternative to [Leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster).

 
*The library is designed for big data or live situations.*

![](http://medias.master-bridge.eu/resize/728/720/59dedba492400bfefddf3179fa83f18fbf4ee599.png)
**A lot of tweets over the world**

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

You can specify a category for the markers. Then a small object representing the number of markers for each category is attached to the clusters. This way, you can create cluster icons adapted to their content.

The category can be a number or a string, but in order to minimize the performance cost, it's recommanded to use numbers between 0 and 7.

#### Dynamic cluster size

The size of cluster can be adjusted on the fly *([Example](http://sintef-9012.github.io/PruneCluster/examples/random.10000-size.html))*
