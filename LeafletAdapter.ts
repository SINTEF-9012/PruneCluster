/// <reference path="bower_components/DefinitelyTyped/Leaflet/Leaflet.d.ts"/>

module PruneCluster {
	export declare class LeafletAdapter implements L.ILayer {
		Cluster: PruneCluster;

		onAdd: (map: L.Map) => void;
		onRemove: (map: L.Map) => void;
		
		RegisterMarker: (marker: Marker) => void;
		RemoveMarkers: (markers: Marker[]) => void;
        ProcessView: () => void;
        FitBounds: () => void;

        BuildLeafletCluster: (cluster: Cluster, position: L.LatLng) => L.ILayer;
	    BuildLeafletClusterIcon: (cluster: Cluster) => L.Icon;
        BuildLeafletMarker: (marker: Marker, position: L.LatLng) => L.Marker;
        PrepareLeafletMarker: (marker: L.Marker, data: {}) => void;
	}
}



var PruneClusterForLeaflet = ((<any>L).Layer? (<any>L).Layer : L.Class).extend({
	initialize: function(size: number = 120, clusterMargin: number = 20) {
		this.Cluster = new PruneCluster.PruneCluster();
		this.Cluster.Size = size;
		this.clusterMargin = Math.min(clusterMargin, size / 4);

		this.Cluster.Project = (lat: number, lng: number) =>
			this._map.project(new L.LatLng(lat, lng));

		this.Cluster.UnProject = (x: number, y: number) =>
			this._map.unproject(new L.Point(x, y));

        this._objectsOnMap = [];

        this.spiderfier = new PruneClusterLeafletSpiderfier(this);
	},

    RegisterMarker: function (marker: PruneCluster.Marker) {
		this.Cluster.RegisterMarker(marker);
	},

	RemoveMarkers: function(markers: PruneCluster.Marker[]) {
		this.Cluster.RemoveMarkers(markers);
	},

    BuildLeafletCluster: function (cluster: PruneCluster.Cluster, position: L.LatLng): L.ILayer {
		var m = new L.Marker(position, {
			icon: this.BuildLeafletClusterIcon(cluster)
		});

        m.on('click', () => {
            var markersArea = this.Cluster.FindMarkersInArea(cluster.bounds);
            var b = this.Cluster.ComputeBounds(markersArea);

            if (b) {

                var bounds = new L.LatLngBounds(
					new L.LatLng(b.minLat, b.maxLng),
                    new L.LatLng(b.maxLat, b.minLng));

                var zoomLevelBefore = this._map.getZoom(),
                    zoomLevelAfter = this._map.getBoundsZoom(bounds, false, new L.Point(20, 20));

                if (zoomLevelAfter === zoomLevelBefore) {
                    this._map.fire('overlappingmarkers', { markers: markersArea, center: m.getLatLng(), marker: m });
                    this._map.setView(position, zoomLevelAfter);
                } else {
                    this._map.fitBounds(bounds);
                }

			}
		});

		return m;
	},

    BuildLeafletClusterIcon: function (cluster: PruneCluster.Cluster): L.Icon {
        var c = 'prunecluster prunecluster-';
	    var iconSize = 38;
		if (cluster.population < 10) {
			c += 'small';
		} else if (cluster.population < 100) {
            c += 'medium';
		    iconSize = 40;
		} else {
			c += 'large';
		    iconSize = 44;
		}

		return new L.DivIcon({
			html: "<div><span>" + cluster.population + "</span></div>",
			className: c,
			iconSize: L.point(iconSize, iconSize)
		});
	},

    BuildLeafletMarker: function (marker: PruneCluster.Marker, position: L.LatLng): L.Marker {
        var m = new L.Marker(position);
        this.PrepareLeafletMarker(m, marker.data);
        return m;
    },

    PrepareLeafletMarker: function (marker: L.Marker, data: {}) {
    },

	onAdd: function(map: L.Map) {
		this._map = map;
		map.on('movestart', this._moveStart, this);
        map.on('moveend', this._moveEnd, this);
		map.on('zoomend', this._zoomStart, this);
        map.on('zoomend', this._zoomEnd, this);
        this.ProcessView();

	    map.addLayer(this.spiderfier);
	},

	onRemove: function (map: L.Map) {
		map.off('movestart', this._moveStart, this);
		map.off('moveend', this._moveEnd, this);
		map.off('zoomend', this._zoomStart, this);
		map.off('zoomend', this._zoomEnd, this);

		for (var i = 0, l = this._objectsOnMap.length; i < l; ++i) {
			map.removeLayer(this._objectsOnMap[i]);
		}

        map.removeLayer(this.spiderfier);
	},

	_moveStart: function() {
		this._moveInProgress = true;
    },

	_moveEnd: function() {
	    this._moveInProgress = false;
		this.ProcessView();
    },

    _zoomStart: function () {
		this._zoomInProgress = true;
	},

	_zoomEnd: function() {
		this._zoomInProgress = false;
	    this.ProcessView();
	},

    ProcessView: function () {
        if (this._zoomInProgress || this._moveInProgress) {
            return;
        }

		var map = this._map,
			bounds = map.getBounds(),
			zoom = map.getZoom(),
			marginRatio = this.clusterMargin / this.Cluster.Size;

		var southWest = bounds.getSouthWest(),
			northEast = bounds.getNorthEast();

//		var t = +new Date();
		var clusters : PruneCluster.Cluster[] = this.Cluster.ProcessView({
			minLat: southWest.lat,
			minLng: southWest.lng,
			maxLat: northEast.lat,
			maxLng: northEast.lng
		});
//		console.log("time: ", (+new Date()) - t);

		var objectsOnMap: PruneCluster.Cluster[] = this._objectsOnMap,
			newObjectsOnMap: PruneCluster.Cluster[] = [];

        // By default, all the objects should be removed
        // the removeFromMap property will be 
		for (var i = 0, l = objectsOnMap.length; i < l; ++i) {
			objectsOnMap[i].data._leafletMarker._removeFromMap = true;
        }

	    var clusterCreationList: PruneCluster.Cluster[] = [];

        var opacityUpdateList = [];

        // Anti collapsing system
        var workingList: PruneCluster.Cluster[] = [];

        for (i = 0, l = clusters.length; i < l; ++i) {
            var icluster = clusters[i];

            var latMargin = (icluster.bounds.maxLat - icluster.bounds.minLat) * marginRatio,
                lngMargin = (icluster.bounds.maxLng - icluster.bounds.minLng) * marginRatio;

            for (var j = 0, ll = workingList.length; j < ll; ++j) {
                var c = workingList[j];
                if (c.bounds.maxLng < icluster.bounds.minLng) {
                    workingList.splice(j, 1);
                    --j;
                    --ll;
                    continue;
                }

                var oldMaxLng = c.averagePosition.lng + lngMargin,
                    oldMinLat = c.averagePosition.lat - latMargin,
                    oldMaxLat = c.averagePosition.lat + latMargin,
                    newMinLng = icluster.averagePosition.lng - lngMargin,
                    newMinLat = icluster.averagePosition.lat - latMargin,
                    newMaxLat = icluster.averagePosition.lat + latMargin;
                 
                if (oldMaxLng > newMinLng && oldMaxLat > newMinLat && oldMinLat < newMaxLat ) {
                    icluster.data._leafletCollision = true;
                    //c.data._leafletCollision = true;
                    c.ApplyCluster(icluster);
                    break;
                }
            }

            if (!icluster.data._leafletCollision) {
                workingList.push(icluster);    
            }
            
        }

		clusters.forEach((cluster: PruneCluster.Cluster) => {
			var m = undefined;
		    var position: L.LatLng;

            //latMargin = (cluster.bounds.maxLat - cluster.bounds.minLat) * marginRatio;
            //lngMargin = (cluster.bounds.maxLng - cluster.bounds.minLng) * marginRatio;

            if (cluster.data._leafletCollision) {
                cluster.data._leafletCollision = false;
                cluster.data._leafletOldPopulation = 0;
                return;
            } else {
                position = new L.LatLng(cluster.averagePosition.lat, cluster.averagePosition.lng);
            }

            var oldMarker = cluster.data._leafletMarker;
			if (oldMarker) {
                if (cluster.population === 1 && cluster.data._leafletOldPopulation === 1) {
                    if (oldMarker._zoomLevel !== zoom) {
                        this.PrepareLeafletMarker(oldMarker, cluster.lastMarker.data);
                    }
                    oldMarker.setLatLng(position);
					m = oldMarker;
                } else if (cluster.population > 1 && cluster.data._leafletOldPopulation > 1 && (oldMarker._zoomLevel === zoom ||
                cluster.data._leafletPosition.equals(position))) {
                    oldMarker.setLatLng(position);

                    if (cluster.population != cluster.data._leafletOldPopulation) {
                        oldMarker.setIcon(this.BuildLeafletClusterIcon(cluster));       
                    }
					
					cluster.data._leafletOldPopulation = cluster.population;
					m = oldMarker;
                }

			}

		    if (!m) {
		        clusterCreationList.push(cluster);

                cluster.data._leafletPosition = position;
		        cluster.data._leafletOldPopulation = cluster.population;
		    } else {
                m._removeFromMap = false;
                m._zoomLevel = zoom;
		        m._population = cluster.population;
                cluster.data._leafletMarker = m;
		        cluster.data._leafletPosition = position;
		        newObjectsOnMap.push(cluster);
		    }

		});

		var toRemove = [];
        for (i = 0, l = objectsOnMap.length; i < l; ++i) {
            icluster = objectsOnMap[i];
            var data = icluster.data,
                marker = data._leafletMarker;

            if (data._leafletMarker._removeFromMap) {

                var remove = true;

                if (marker._zoomLevel === zoom) {
                    var pa = icluster.averagePosition;

			        latMargin = (icluster.bounds.maxLat - icluster.bounds.minLat) * marginRatio,
                    lngMargin = (icluster.bounds.maxLng - icluster.bounds.minLng) * marginRatio;

                    for (j = 0, ll = clusterCreationList.length; j < ll; ++j) {
                        var jcluster = clusterCreationList[j];
                        var pb = jcluster.averagePosition;
                         
                        var oldMinLng = pa.lng - lngMargin,
                            newMaxLng = pb.lng + lngMargin;

                        oldMaxLng = pa.lng + lngMargin;
                        oldMinLat = pa.lat - latMargin;
                        oldMaxLat = pa.lat + latMargin;
                        newMinLng = pb.lng - lngMargin;
                        newMinLat = pb.lat - latMargin;
                        newMaxLat = pb.lat + latMargin;
                         
                        if (oldMaxLng > newMinLng && oldMinLng < newMaxLng && oldMaxLat > newMinLat && oldMinLat < newMaxLat) {

                            if (marker._population === 1 && jcluster.population === 1) {
                                this.PrepareLeafletMarker(marker, jcluster.lastMarker.data);
                                marker.setLatLng(jcluster.data._leafletPosition);
                                remove = false;
                            } else if (marker._population > 1 && jcluster.population > 1) {
                                marker.setLatLng(jcluster.data._leafletPosition);
                                remove = false;
                                marker.setIcon(this.BuildLeafletClusterIcon(jcluster));
                                jcluster.data._leafletOldPopulation = jcluster.population;
                                marker._population = jcluster.population;
                            }

                            if (!remove) {

                                jcluster.data._leafletMarker = marker;
                                newObjectsOnMap.push(jcluster);

                                clusterCreationList.splice(j, 1);
                                --j;
                                --ll;

                                break;
                            }
                        }
                    }
                }

                if (remove) {
                    data._leafletMarker.setOpacity(0);
                    toRemove.push(data._leafletMarker);
                }
            }
        }

        for (i = 0, l = clusterCreationList.length; i < l; ++i) {
            icluster = clusterCreationList[i];
            var iposition = icluster.data._leafletPosition;

            var creationMarker: any;
            if (icluster.population === 1) {
                creationMarker = this.BuildLeafletMarker(icluster.lastMarker, iposition);
            } else {
               creationMarker = this.BuildLeafletCluster(icluster, iposition);
            }

            creationMarker.addTo(map);
            creationMarker.setOpacity(0);
            creationMarker._zoomLevel = zoom;
            creationMarker._population = icluster.population;
            opacityUpdateList.push(creationMarker);

			icluster.data._leafletMarker = creationMarker;

            newObjectsOnMap.push(icluster);
        }

		window.setTimeout(() => {
			for (i = 0, l = opacityUpdateList.length; i < l; ++i) {
				opacityUpdateList[i].setOpacity(1);	
			}
		}, 1);

		if (toRemove.length > 0) {
			window.setTimeout(() => {
				for (i = 0, l = toRemove.length; i < l; ++i) {
				    map.removeLayer(toRemove[i]);
				}
			}, 300);
		}
				
		this._objectsOnMap = newObjectsOnMap;
	},

    FitBounds: function() {
        var bounds : PruneCluster.Bounds = this.Cluster.ComputeGlobalBounds();
		if (bounds) {
			this._map.fitBounds(new L.LatLngBounds(
						new L.LatLng(bounds.minLat, bounds.maxLng),
						new L.LatLng(bounds.maxLat, bounds.minLng)));
		}
    }    
});