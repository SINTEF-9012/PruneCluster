// package metadata file for Meteor.js
'use strict';

var packageName = 'prunecluster:prunecluster';
var where = 'client';
var packageJson = JSON.parse(Npm.require("fs").readFileSync('package.json'));

Package.describe({
  name: packageName,
  version: packageJson.version,
  summary: 'PruneCluster: add fast, realtime marker clustering to Leaflet, with low memory footprint',
  git: 'https://github.com/SINTEF-9012/PruneCluster.git'
});

Package.onUse(function(api) {
  api.versionsFrom(['METEOR@0.9.0', 'METEOR@1.0']);
  api.use(["bevanhunt:leaflet@1.0.3"]);
  api.export("PruneCluster",where);
  api.export("PruneClusterForLeaflet",where);
  api.export("PruneClusterLeafletSpiderfier",where);
  api.addFiles(['dist/LeafletStyleSheet.css',
    'dist/PruneCluster.js',
    'dist/PruneCluster.js.map',
    'dist/PruneCluster.min.js'
  ],where,{bare: true});
});

Package.onTest(function (api) {
    api.use(packageName, where);
    api.use('tinytest', where);

    api.addFiles('meteor/test.js', where);
});
