'use strict';

Tinytest.add('PruneCluster.is', function (test) {
    var pruneCluster = new PruneClusterForLeaflet();
    var pruneMarker = new PruneCluster.Marker(0,0);
    test.isNotUndefined(pruneCluster, 'Cluster Instantiation OK');
    test.equal(pruneMarker.position,{ lat: 0, lng: 0 }, 'Marker Instantiation OK');
});