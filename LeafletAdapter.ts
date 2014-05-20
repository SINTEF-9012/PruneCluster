/// <reference path="bower_components/DefinitelyTyped/Leaflet/Leaflet.d.ts"/>

module PruneCluster {
	export declare class LeafletAdapter implements L.ILayer {
		Cluster: PruneCluster;

		onAdd: (map: L.Map) => void;
		onRemove: (map: L.Map) => void;
		
		RegisterMarker: (marker: Marker) => void;
		RemoveMarkers: (markers: Marker[]) => void;
		ProcessView: () => void;
	}
}



var PruneClusterForLeaflet = ((<any>L).Layer? (<any>L).Layer : L.Class).extend({
	initialize: function(size: number = 160, clusterMargin: number = 10) {
		this.Cluster = new PruneCluster.PruneCluster();
		this.Cluster.Size = size;
		this.clusterMargin = Math.min(clusterMargin, size / 4);

		this.Cluster.Project = (lat: number, lng: number) =>
			this._map.project(new L.LatLng(lat, lng));

		this.Cluster.UnProject = (x: number, y: number) =>
			this._map.unproject(new L.Point(x, y));

		this._objectsOnMap = [];
	},

	RegisterMarker: function(marker: PruneCluster.Marker) {
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
			var b = this.Cluster.FindMarkersBoundsInArea(cluster.bounds);
			if (b) {
				this._map.fitBounds(new L.LatLngBounds(
					new L.LatLng(b.minLat, b.maxLng),
					new L.LatLng(b.maxLat, b.minLng)));
			}
		});

		return m;
	},

	BuildLeafletClusterIcon: function(cluster: PruneCluster.Cluster): L.Icon {
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

	BuildLeafletMarker: function(marker: PruneCluster.Marker, position: L.LatLng): L.ILayer {
		return new L.Marker(position);
	},

	onAdd: function(map: L.Map) {
		this._map = map;
		map.on('dragend', this.ProcessView, this);
		map.on('zoomstart', this._zoomStart, this);
		map.on('zoomend', this._zoomEnd, this);
		this.ProcessView();
	},

	onRemove: function (map: L.Map) {
		map.off('dragend', this.ProcessView, this);
		map.off('zoomstart', this._zoomStart, this);
		map.off('zoomend', this._zoomEnd, this);

		for (var i = 0, l = this._objectsOnMap.length; i < l; ++i) {
			this._map.removeLayer(this._objectsOnMap[i]);
		}
	},

	_zoomStart: function() {
		this.disableProcessView = true;
	},

	_zoomEnd: function() {
		this.disableProcessView = false;
		this.ProcessView();
	},

	ProcessView: function () {
		if (this.disableProcessView) return;

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
                    c.data._leafletCollision = true;
                    break;
                }
            }

            workingList.push(icluster);
        }

		clusters.forEach((cluster: PruneCluster.Cluster) => {
			var m = undefined;
		    var position: L.LatLng;

            latMargin = (cluster.bounds.maxLat - cluster.bounds.minLat) * marginRatio;
            lngMargin = (cluster.bounds.maxLng - cluster.bounds.minLng) * marginRatio;

            if (cluster.data._leafletCollision) {
                cluster.data._leafletCollision = false;
                position = new L.LatLng(
                    Math.max(
                        Math.min(cluster.averagePosition.lat, cluster.bounds.maxLat - latMargin),
                        cluster.bounds.minLat + latMargin),
                    Math.max(
                        Math.min(cluster.averagePosition.lng, cluster.bounds.maxLng - lngMargin),
                        cluster.bounds.minLng + lngMargin)
                );
            } else {
                position = new L.LatLng(cluster.averagePosition.lat, cluster.averagePosition.lng);
            }

			var oldMarker = cluster.data._leafletMarker;
			if (oldMarker) {
				if (cluster.population === 1 && cluster.data._leafletOldPopulation === 1) {
                    oldMarker.setLatLng(position);
					m = oldMarker;
				} else if (cluster.population > 1 && cluster.data._leafletOldPopulation > 1 && oldMarker._zoomLevel === zoom) {
					oldMarker.setLatLng(position);
					oldMarker.setIcon(this.BuildLeafletClusterIcon(cluster));
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
	}

});