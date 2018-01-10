![PruneCluster](https://sintef-9012.github.io/PruneCluster/logo.png)
============

PruneCluster is a fast and realtime marker clustering library.

*Example 1:* [150 000 randomly moving markers](http://sintef-9012.github.io/PruneCluster/examples/random.150000.html).

![](https://sintef-9012.github.io/PruneCluster/twittermap.jpg)
*Example 2: Realtime clusters of tweets.*

It's working with [Leaflet](http://leafletjs.com/) as an alternative to [Leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster).

 
*The library is designed for large datasets or live situations.* The memory consumption is kept low and the library is fast on mobile devices, thanks to a new algorithm inspired by collision detection in physical engines.



### Features

#### Realtime
The clusters can be updated in realtime. It's perfect for live datasets or datasets you want to filter at runtime.

#### Fast

Number of markers|First step|Update (low zoom level)|Update (high zoom level)
---------|------------------|------------------------|------------------
[100](http://sintef-9012.github.io/PruneCluster/examples/random.100.html)|instant|instant|instant
[1 000](http://sintef-9012.github.io/PruneCluster/examples/random.1000.html)|instant|instant|instant
[10 000](http://sintef-9012.github.io/PruneCluster/examples/random.10000.html)|14ms|3ms|2ms
[60 000](http://sintef-9012.github.io/PruneCluster/examples/random.60000.html)|70ms|23ms|9ms
[150 000](http://sintef-9012.github.io/PruneCluster/examples/random.150000.html)|220ms|60ms|20ms
[1 000 000](http://sintef-9012.github.io/PruneCluster/examples/random.1000000.html)|1.9s|400ms|135ms

These values are tested with random positions, on a recent laptop, using Chrome 38. One half of markers is moving randomly and the other half is static. It is also fast enough for mobile devices.

If you prefer real world data, the [50k Leaflet.markercluster example](http://sintef-9012.github.io/PruneCluster/examples/realworld.50000.html) is computed in 60ms *([original](http://sintef-9012.github.io/Leaflet.markercluster/example/marker-clustering-realworld.50000.html))*.

#### Weight
You can specify the weight of each marker.

For example, you may want to add more importance to a marker representing an incident, than a marker representing a tweet.

#### Categories

You can specify a category for the markers. Then a small object representing the number of markers for each category is attached to the clusters. This way, you can create cluster icons adapted to their content.

[![](https://sintef-9012.github.io/PruneCluster/clustering_a.png)](http://sintef-9012.github.io/PruneCluster/examples/random.10000-categories.html) [![](https://sintef-9012.github.io/PruneCluster/clustering_b.png)](http://sintef-9012.github.io/PruneCluster/examples/random.10000-categories-2.html)

#### Dynamic cluster size

The size of a cluster can be adjusted on the fly *([Example](http://sintef-9012.github.io/PruneCluster/examples/random.10000-size.html))*

#### Filtering
The markers can be filtered easily with no performance cost.


### Usage

#### Classic Way
```html
	<!-- In <head> -->
	<link rel="stylesheet" href="https://unpkg.com/leaflet@1.2.0/dist/leaflet.css"
  integrity="sha512-M2wvCLH6DSRazYeZRIm1JnYyh22purTM+FDB5CsyxtQJYeKq83arPe5wgbNmcFXGqiSH2XR8dT/fJISVA1r/zQ=="
  crossorigin=""/>

	<!-- In <head> or before </body> -->
	<script src="https://unpkg.com/leaflet@1.2.0/dist/leaflet.js"
  integrity="sha512-lInM/apFSqyy1o6s89K4iQUKg6ppXEgsVxT35HbzUupEVRh2Eu9Wdl4tHj7dZO0s1uvplcYGmt3498TtHq+log=="
  crossorigin=""></script>
	<script src="PruneCluster/dist/PruneCluster.js"></script>
```

#### Webpack & NPM

`npm install exports-loader prunecluster`

```javascript
import { PruneCluster, PruneClusterForLeaflet } from 'exports-loader?PruneCluster,PruneClusterForLeaflet!prunecluster/dist/PruneCluster.js'

```

#### Example

```javascript
var pruneCluster = new PruneClusterForLeaflet();

...
var marker = new PruneCluster.Marker(59.8717, 11.1909);
pruneCluster.RegisterMarker(marker);
...

leafletMap.addLayer(pruneCluster);
```

#### AMD

```
npm install
npm install -g grunt-cli
grunt build:dist --force
```

Then, you will have files ready to use in AMD style under `dist` directory.

#### Example

```javascript
// First 'PruneCluster' must be declared in your module loader, pointing to file 'dist/PruneCluster.amd.min.js'
// (or use path to file instead)

define(['PruneCluster', function(PruneClusterModule) {

  var pruneCluster = new PruneClusterModule.PruneClusterForLeaflet();

  ...
  var marker = new PruneClusterModule.PruneCluster.Marker(59.8717, 11.1909);
  pruneCluster.RegisterMarker(marker);
  ...

  leafletMap.addLayer(pruneCluster);
});
```

### PruneClusterForLeaflet constructor

```javascript
PruneClusterForLeaflet([size](#set-the-clustering-size), margin);
```

You can specify the size and margin which affect when your clusters and markers will be merged.

size defaults to 120 and margin to 20.

#### Update a position
```javascript
marker.Move(lat, lng);
```

#### Deletions
```javascript
// Remove all the markers
pruneCluster.RemoveMarkers();

// Remove a list of markers
pruneCluster.RemoveMarkers([markerA,markerB,...]);
```

#### Set the category
The category can be a number or a string, but in order to minimize the performance cost, it is recommended to use numbers between 0 and 7.
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
You can specify a number indicating the area of the cluster. Higher number means more markers "merged". *([Example](http://sintef-9012.github.io/PruneCluster/examples/random.10000-size.html))*
```javascript
pruneCluster.Cluster.Size = 87;
```

#### Apply the changes

**Must be called when ANY changes are made.**

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

You can attach to the markers an icon object and a popup content
```javascript
marker.data.icon = L.icon(...);  // See http://leafletjs.com/reference.html#icon
marker.data.popup = 'Popup content';
```

#### Faster leaflet icons

If you have a lot of markers, you can create the icons and popups on the fly in order to improve their performance.

```javascript
function createIcon(data, category) {
    return L.icon(...);
}

...

marker.data.icon = createIcon;
```

You can also override the PreapareLeafletMarker method. You can apply listeners to the markers here.

```javascript
pruneCluster.PrepareLeafletMarker = function(leafletMarker, data) {
    leafletMarker.setIcon(/*... */); // See http://leafletjs.com/reference.html#icon
    //listeners can be applied to markers in this function
    leafletMarker.on('click', function(){
    //do click event logic here
    });
    // A popup can already be attached to the marker
    // bindPopup can override it, but it's faster to update the content instead
    if (leafletMarker.getPopup()) {
        leafletMarker.setPopupContent(data.name);
    } else {
        leafletMarker.bindPopup(data.name);
    }
};
```

#### Setting up a custom cluster icon
```javascript
pruneCluster.BuildLeafletClusterIcon = function(cluster) {
    var population = cluster.population, // the number of markers inside the cluster
        stats = cluster.stats; // if you have categories on your markers

    // If you want list of markers inside the cluster
    // (you must enable the option using PruneCluster.Cluster.ENABLE_MARKERS_LIST = true)
    var markers = cluster.GetClusterMarkers() 
        
    ...
    
    return icon; // L.Icon object (See http://leafletjs.com/reference.html#icon);
};
```

#### Listening to events on a cluster

To listen to events on the cluster, you will need to override the ```BuildLeafletCluster``` method. A click event is already specified on m, but you can add other events like mouseover, mouseout, etc. Any events that a Leaflet marker supports, the cluster also supports, since it is just a modified marker. A full list of events can be found [here](http://leafletjs.com/reference.html#marker-click).

Below is an example of how to implement mouseover and mousedown for the cluster, but any events can be used in place of those.
```javascript
pruneCluster.BuildLeafletCluster = function(cluster, position) {
      var m = new L.Marker(position, {
        icon: pruneCluster.BuildLeafletClusterIcon(cluster)
      });

      m.on('click', function() {
        // Compute the  cluster bounds (it's slow : O(n))
        var markersArea = pruneCluster.Cluster.FindMarkersInArea(cluster.bounds);
        var b = pruneCluster.Cluster.ComputeBounds(markersArea);

        if (b) {
          var bounds = new L.LatLngBounds(
            new L.LatLng(b.minLat, b.maxLng),
            new L.LatLng(b.maxLat, b.minLng));

          var zoomLevelBefore = pruneCluster._map.getZoom();
          var zoomLevelAfter = pruneCluster._map.getBoundsZoom(bounds, false, new L.Point(20, 20, null));

          // If the zoom level doesn't change
          if (zoomLevelAfter === zoomLevelBefore) {
            // Send an event for the LeafletSpiderfier
            pruneCluster._map.fire('overlappingmarkers', {
              cluster: pruneCluster,
              markers: markersArea,
              center: m.getLatLng(),
              marker: m
            });

            pruneCluster._map.setView(position, zoomLevelAfter);
          }
          else {
            pruneCluster._map.fitBounds(bounds);
          }
        }
      });
      m.on('mouseover', function() {
        //do mouseover stuff here
      });
      m.on('mouseout', function() {
        //do mouseout stuff here
      });

      return m;
    };
};
```

#### Redraw the icons

Marker icon redrawing with a flag:

```javascript
marker.data.forceIconRedraw = true;

...

pruneCluster.ProcessView();
```

Redraw all the icons:
```javascript
pruneCluster.RedrawIcons();
```

### Acknowledgements

This library was developed in context of the [BRIDGE](http://www.bridgeproject.eu/en) project. It is now supported by the community and we thank [the contributors](https://github.com/SINTEF-9012/PruneCluster/graphs/contributors).

### Licence

The source code of this library is licensed under the MIT License.
