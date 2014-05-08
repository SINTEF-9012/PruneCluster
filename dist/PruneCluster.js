var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var PruneCluster;
(function (_PruneCluster) {
    var ratioForNativeSort = 0.2;

    var Point = (function () {
        function Point() {
        }
        return Point;
    })();
    _PruneCluster.Point = Point;

    var ClusterObject = (function () {
        function ClusterObject() {
        }
        return ClusterObject;
    })();
    _PruneCluster.ClusterObject = ClusterObject;

    var Marker = (function (_super) {
        __extends(Marker, _super);
        function Marker(lat, lng, data) {
            if (typeof data === "undefined") { data = {}; }
            _super.call(this);
            this.data = data;
            this.position = { lat: lat, lng: lng };
            this.weight = 1;
        }
        Marker.prototype.Move = function (lat, lng) {
            this.position.lat = lat;
            this.position.lng = lng;
        };
        return Marker;
    })(ClusterObject);
    _PruneCluster.Marker = Marker;

    var Cluster = (function (_super) {
        __extends(Cluster, _super);
        function Cluster(marker) {
            _super.call(this);

            this.lastMarker = marker;

            this.stats = {};
            this.data = {};
            this.population = 1;

            if (marker.category) {
                this.stats[marker.category] = 1;
            }

            this.totalWeight = marker.weight;

            this.position = {
                lat: marker.position.lat,
                lng: marker.position.lng
            };

            this.averagePosition = {
                lat: marker.position.lat,
                lng: marker.position.lng
            };
        }
        Cluster.prototype.AddMarker = function (marker) {
            this.lastMarker = marker;

            var weight = marker.weight, currentTotalWeight = this.totalWeight, newWeight = weight + currentTotalWeight;

            this.averagePosition.lat = (this.averagePosition.lat * currentTotalWeight + marker.position.lat * weight) / newWeight;

            this.averagePosition.lng = (this.averagePosition.lng * currentTotalWeight + marker.position.lng * weight) / newWeight;

            ++this.population;
            this.totalWeight = newWeight;

            if (marker.category) {
                if (this.stats.hasOwnProperty(marker.category)) {
                    ++this.stats[marker.category];
                } else {
                    this.stats[marker.category] = 1;
                }
            }
        };

        Cluster.prototype.Reset = function () {
            this.lastMarker = undefined;
            this.population = 0;
            this.totalWeight = 0;
        };

        Cluster.prototype.ComputeBounds = function (cluster) {
            var proj = cluster.Project(this.position.lat, this.position.lng);

            var size = cluster.Size;

            var nbX = Math.floor(proj.x / size), nbY = Math.floor(proj.y / size), startX = nbX * size, startY = nbY * size;

            var a = cluster.UnProject(startX, startY), b = cluster.UnProject(startX + size, startY + size);

            this.bounds = {
                minLat: b.lat,
                maxLat: a.lat,
                minLng: a.lng,
                maxLng: b.lng
            };
        };
        return Cluster;
    })(ClusterObject);
    _PruneCluster.Cluster = Cluster;

    function checkPositionInsideBounds(a, b) {
        return (a.lat >= b.minLat && a.lat <= b.maxLat) && a.lng >= b.minLng && a.lng <= b.maxLng;
    }

    function insertionSort(list) {
        for (var i = 1, j, tmp, tmpLng, length = list.length; i < length; ++i) {
            tmp = list[i];
            tmpLng = tmp.position.lng;
            for (j = i - 1; j >= 0 && list[j].position.lng > tmpLng; --j) {
                list[j + 1] = list[j];
            }
            list[j + 1] = tmp;
        }
    }

    var PruneCluster = (function () {
        function PruneCluster() {
            this._markers = [];
            this._nbChanges = 0;
            this._clusters = [];
            this.Size = 166;
            this.ViewPadding = 0.13;
        }
        PruneCluster.prototype.RegisterMarker = function (marker) {
            if (marker._removeFlag) {
                delete marker._removeFlag;
            }
            this._markers.push(marker);
            this._nbChanges += 1;
        };

        PruneCluster.prototype._sortMarkers = function () {
            var markers = this._markers, length = markers.length;

            if (this._nbChanges && (!length || this._nbChanges / length > ratioForNativeSort)) {
                this._markers.sort(function (a, b) {
                    return a.position.lng - b.position.lng;
                });
            } else {
                insertionSort(markers);
            }

            this._nbChanges = 0;
        };

        PruneCluster.prototype._sortClusters = function () {
            insertionSort(this._clusters);
        };

        PruneCluster.prototype._indexLowerBoundLng = function (lng) {
            var markers = this._markers, it, step, first = 0, count = markers.length;

            while (count > 0) {
                step = Math.floor(count / 2);
                it = first + step;
                if (markers[it].position.lng < lng) {
                    first = ++it;
                    count -= step + 1;
                } else {
                    count = step;
                }
            }

            return first;
        };

        PruneCluster.prototype._resetClusterViews = function () {
            for (var i = 0, l = this._clusters.length; i < l; ++i) {
                var cluster = this._clusters[i];
                cluster.Reset();

                cluster.ComputeBounds(this);
            }
        };

        PruneCluster.prototype.ProcessView = function (bounds) {
            var heightBuffer = Math.abs(bounds.maxLat - bounds.minLat) * this.ViewPadding, widthBuffer = Math.abs(bounds.maxLng - bounds.minLng) * this.ViewPadding;

            var extendedBounds = {
                minLat: bounds.minLat - heightBuffer - heightBuffer,
                maxLat: bounds.maxLat + heightBuffer + heightBuffer,
                minLng: bounds.minLng - widthBuffer - widthBuffer,
                maxLng: bounds.maxLng + widthBuffer + widthBuffer
            };

            this._sortMarkers();

            this._resetClusterViews();

            var firstIndex = this._indexLowerBoundLng(extendedBounds.minLng);

            var markers = this._markers, clusters = this._clusters;

            var startClustersIndex = 0;

            for (var i = firstIndex, l = markers.length; i < l; ++i) {
                var marker = markers[i], markerPosition = marker.position;

                if (markerPosition.lng > extendedBounds.maxLng) {
                    break;
                }

                if (markerPosition.lat > extendedBounds.minLat && markerPosition.lat < extendedBounds.maxLat) {
                    var clusterFound = false, cluster;

                    for (var j = startClustersIndex, ll = clusters.length; j < ll; ++j) {
                        cluster = clusters[j];

                        if (checkPositionInsideBounds(markerPosition, cluster.bounds)) {
                            cluster.AddMarker(marker);

                            clusterFound = true;
                            break;
                        }
                    }

                    if (!clusterFound) {
                        cluster = new Cluster(marker);
                        cluster.ComputeBounds(this);
                        clusters.push(cluster);
                    }
                }
            }

            var newClustersList = [];
            for (i = 0, l = clusters.length; i < l; ++i) {
                cluster = clusters[i];
                if (cluster.population > 0) {
                    newClustersList.push(cluster);
                }
            }

            this._clusters = newClustersList;

            this._sortClusters();

            return this._clusters;
        };

        PruneCluster.prototype.RemoveMarkers = function (markers) {
            for (var i = 0, l = markers.length; i < l; ++i) {
                markers[i]._removeFlag = true;
            }

            var newMarkersList = [];
            for (i = 0, l = this._markers.length; i < l; ++i) {
                if (!this._markers[i]._removeFlag) {
                    newMarkersList.push(this._markers[i]);
                }
            }

            this._markers = newMarkersList;
        };

        PruneCluster.prototype.FindMarkersBoundsInArea = function (area) {
            var aMinLat = area.minLat, aMaxLat = area.maxLat, aMinLng = area.minLng, amaxLng = area.maxLng, rMinLat = Number.MAX_VALUE, rMaxLat = Number.MIN_VALUE, rMinLng = Number.MAX_VALUE, rMaxLng = Number.MIN_VALUE, markers = this._markers, nbMarkersInArea = 0;

            for (var i = 0, l = markers.length; i < l; ++i) {
                var pos = markers[i].position;
                if (pos.lat >= aMinLat && pos.lat <= aMaxLat && pos.lng >= aMinLng && pos.lng <= amaxLng) {
                    ++nbMarkersInArea;

                    if (pos.lat < rMinLat)
                        rMinLat = pos.lat;
                    if (pos.lat > rMaxLat)
                        rMaxLat = pos.lat;
                    if (pos.lng < rMinLng)
                        rMinLng = pos.lng;
                    if (pos.lng > rMaxLng)
                        rMaxLng = pos.lng;
                }
            }

            if (nbMarkersInArea) {
                return {
                    minLat: rMinLat,
                    maxLat: rMaxLat,
                    minLng: rMinLng,
                    maxLng: rMaxLng
                };
            }

            return null;
        };
        return PruneCluster;
    })();
    _PruneCluster.PruneCluster = PruneCluster;
})(PruneCluster || (PruneCluster = {}));
var PruneCluster;
(function (PruneCluster) {
})(PruneCluster || (PruneCluster = {}));

var PruneClusterForLeaflet = L.Class.extend({
    initialize: function (size, clusterMargin) {
        var _this = this;
        if (typeof size === "undefined") { size = 160; }
        if (typeof clusterMargin === "undefined") { clusterMargin = 20; }
        this.Cluster = new PruneCluster.PruneCluster();
        this.Cluster.Size = size;
        this.clusterMargin = Math.min(clusterMargin, size / 4);

        this.Cluster.Project = function (lat, lng) {
            return _this._map.project(new L.LatLng(lat, lng));
        };

        this.Cluster.UnProject = function (x, y) {
            return _this._map.unproject(new L.Point(x, y));
        };

        this._objectsOnMap = [];
    },
    RegisterMarker: function (marker) {
        this.Cluster.RegisterMarker(marker);
    },
    RemoveMarkers: function (markers) {
        this.Cluster.RemoveMarkers(markers);
    },
    BuildLeafletCluster: function (cluster, position) {
        var _this = this;
        var m = new L.Marker(position, {
            icon: this.BuildLeafletClusterIcon(cluster)
        });

        m.on('click', function () {
            var b = _this.Cluster.FindMarkersBoundsInArea(cluster.bounds);
            if (b) {
                _this._map.fitBounds(new L.LatLngBounds(new L.LatLng(b.minLat, b.maxLng), new L.LatLng(b.maxLat, b.minLng)));
            }
        });

        return m;
    },
    BuildLeafletClusterIcon: function (cluster) {
        var c = 'prunecluster prunecluster-';
        if (cluster.population < 10) {
            c += 'small';
        } else if (cluster.population < 100) {
            c += 'medium';
        } else {
            c += 'large';
        }

        return new L.DivIcon({
            html: "<div><span>" + cluster.population + "</span></div>",
            className: c,
            iconSize: L.point(40, 40)
        });
    },
    BuildLeafletMarker: function (marker, position) {
        return new L.Marker(position);
    },
    onAdd: function (map) {
        this._map = map;
        map.on('dragend', this.ProcessView, this);
        map.on('zoomstart', this._zoomStart, this);
        map.on('zoomend', this._zoomEnd, this);
        this.ProcessView();
    },
    onRemove: function (map) {
        map.off('dragend', this.ProcessView, this);
        map.off('zoomstart', this._zoomStart, this);
        map.off('zoomend', this._zoomEnd, this);

        for (var i = 0, l = this._objectsOnMap.length; i < l; ++i) {
            this._map.removeLayer(this._objectsOnMap[i]);
        }
    },
    _zoomStart: function () {
        this.disableProcessView = true;
    },
    _zoomEnd: function () {
        this.disableProcessView = false;
        this.ProcessView();
    },
    ProcessView: function () {
        var _this = this;
        if (this.disableProcessView)
            return;

        var map = this._map, bounds = map.getBounds(), zoom = map.getZoom(), marginRatio = this.clusterMargin / this.Cluster.Size;

        var southWest = bounds.getSouthWest(), northEast = bounds.getNorthEast();

        var clusters = this.Cluster.ProcessView({
            minLat: southWest.lat,
            minLng: southWest.lng,
            maxLat: northEast.lat,
            maxLng: northEast.lng
        });

        var objectsOnMap = this._objectsOnMap, newObjectsOnMap = [];

        for (var i = 0, l = objectsOnMap.length; i < l; ++i) {
            objectsOnMap[i]._removeFromMap = true;
        }

        var opacityUpdateList = [];

        clusters.forEach(function (cluster) {
            var m = undefined;

            var latMargin = (cluster.bounds.maxLat - cluster.bounds.minLat) * marginRatio, lngMargin = (cluster.bounds.maxLng - cluster.bounds.minLng) * marginRatio;

            var position = new L.LatLng(Math.max(Math.min(cluster.averagePosition.lat, cluster.bounds.maxLat - latMargin), cluster.bounds.minLat + latMargin), Math.max(Math.min(cluster.averagePosition.lng, cluster.bounds.maxLng - lngMargin), cluster.bounds.minLng + lngMargin));

            var oldMarker = cluster.data._leafletMarker;
            if (oldMarker) {
                if (cluster.population === 1 && cluster.data._leafletOldPopulation === 1) {
                    oldMarker.setLatLng(position);
                    m = oldMarker;
                } else if (cluster.population > 1 && cluster.data._leafletOldPopulation > 1 && oldMarker._zoomLevel === zoom) {
                    oldMarker.setLatLng(position);
                    oldMarker.setIcon(_this.BuildLeafletClusterIcon(cluster));
                    cluster.data._leafletOldPopulation = cluster.population;
                    m = oldMarker;
                }
            }

            if (!m) {
                if (cluster.population === 1) {
                    m = _this.BuildLeafletMarker(cluster.lastMarker, position);
                } else {
                    m = _this.BuildLeafletCluster(cluster, position);
                }
                m.addTo(map);
                m.setOpacity(0);
                opacityUpdateList.push(m);

                cluster.data._leafletMarker = m;
                cluster.data._leafletOldPopulation = cluster.population;
            }

            m._zoomLevel = zoom;
            m._removeFromMap = false;
            newObjectsOnMap.push(m);
        });

        window.setTimeout(function () {
            for (i = 0, l = opacityUpdateList.length; i < l; ++i) {
                opacityUpdateList[i].setOpacity(1);
            }
        }, 1);

        var toRemove = [];
        for (i = 0, l = objectsOnMap.length; i < l; ++i) {
            if (objectsOnMap[i]._removeFromMap) {
                objectsOnMap[i].setOpacity(0);
                toRemove.push(objectsOnMap[i]);
            }
        }

        if (toRemove.length > 0) {
            window.setTimeout(function () {
                for (i = 0, l = toRemove.length; i < l; ++i) {
                    map.removeLayer(toRemove[i]);
                }
            }, 300);
        }

        this._objectsOnMap = newObjectsOnMap;
    }
});
//# sourceMappingURL=PruneCluster.js.map
