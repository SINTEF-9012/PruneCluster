![PruneCluster](http://medias.master-bridge.eu/e30525b1a92f01204ac69039a642e370c85bf906.png)
============

PruneCluster is a fast and realtime marker clustering library.

It's working with [Leaflet](http://leafletjs.com/) as an alternative to [Leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster).

 
*The library is designed for large datasets or live situations.* The memory consumption is keeped low and the library is fast on mobile devices, thanks to a new algorithm inspired by collision detection in physical engines.

![](http://medias.master-bridge.eu/resize/728/720/59dedba492400bfefddf3179fa83f18fbf4ee599.png)
**Some tweets over the world**

### Features

#### Realtime
The clusters can be updated in realtime. It's perfect for live situations.

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

[![](http://medias.master-bridge.eu/ebc9e5393a8a018abb8771a3155b802f05995792.png)](http://sintef-9012.github.io/PruneCluster/examples/random.10000-categories.html) [![](http://medias.master-bridge.eu/d02e09d5fe43654141693f22924f606f4fd6960a.png)](http://sintef-9012.github.io/PruneCluster/examples/random.10000-categories-2.html)

#### Dynamic cluster size

The size of cluster can be adjusted on the fly *([Example](http://sintef-9012.github.io/PruneCluster/examples/random.10000-size.html))*

#### Filtering
The markers can be filtered easely with no performance cost.


### Usage
```javascript
var pruneCluster = new PruneClusterForLeaflet();

...
var marker = new PruneCluster.Marker(latitude, longitude);
pruneCluster.RegisterMarker(marker);
...

leafletMap.addLayer(pruneCluster);
```


#### Update a position
```javascript
marker.Move(lat, lng);
```

#### Deletions
The method argument is an array of markers, it is better to group the deletions.

```javascript
pruneCluster.RemoveMarkers([markerA,markerB,...]);
```

#### Set the category
The category can be a number or a string, but in order to minimize the performance cost, it is recommanded to use numbers between 0 and 7.
```javascript
marker.category = 5;
```

#### Set the weight
```javascript
marker.weight = 4;
```

#### Filtering
```javascript
marker.filtered = true|false;
```

#### Set the clustering size
```javascript
pruneCluster.Cluster.Size = 87;
```

#### Apply the changes

```javascript
pruneCluster.ProcessView();
```

#### Add custom data to marker object

Each marker has a data object where you can specify your data.
```javascript
marker.data.name = 'Roger';
marker.data.ID = '76ez';
```

#### Setting up a Leaflet icon or a Leaflet popup
In order to improve the performances, the Leaflet marker is created only if needed and can be recycled. You can setup the marker by overriding the PreapareLeafletMarker method.

```javascript
pruneCluster.PrepareLeafletMarker = function(leafletMarker, data) {
    leafletMarker.setIcon(/*... */); // See http://leafletjs.com/reference.html#icon
    
    // A popup can already be attached to the marker
    // bindPopup can override it, but it's faster to update the content instead
    if (leafletMarker.getPopup()) {
        leafletMarker.setPopupContent(data.name);
    } else {
        marker.bindPopup(data.title);
    }
};
```

#### Setting up a custom cluster icon
```javascript
pruneCluster.BuildLeafletClusterIcon = function(cluster) {
    var population = cluster.population, // the number of markers inside the cluster
        stats = cluster.stats, // if you have categories on your markers
        markers = cluster.getClusterMarkers() // if you want list of markers in cluster
    ...
    
    return icon; // L.Icon object (See http://leafletjs.com/reference.html#icon);
};
```


### Acknowledgements

This library is developed in context of the [BRIDGE](http://www.bridgeproject.eu/en) project.

### Licence

The source code of this library is licenced under the MIT License.
