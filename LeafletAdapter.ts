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



var PruneClusterForLeaflet = L.Class.extend({
	initialize: function(size: number = 160, clusterMargin: number = 20) {
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

		var objectsOnMap: any[] = this._objectsOnMap,
			newObjectsOnMap: any[] = [];

		for (var i = 0, l = objectsOnMap.length; i < l; ++i) {
			objectsOnMap[i]._removeFromMap = true;
		}

		var opacityUpdateList = [];

		clusters.forEach((cluster: PruneCluster.Cluster) => {
			var m = undefined;

			// Anti collapsing system
			var latMargin = (cluster.bounds.maxLat - cluster.bounds.minLat)*marginRatio,
				lngMargin = (cluster.bounds.maxLng - cluster.bounds.minLng)*marginRatio;

			var position = new L.LatLng(
				Math.max(
					Math.min(cluster.averagePosition.lat, cluster.bounds.maxLat - latMargin),
					cluster.bounds.minLat + latMargin),
				Math.max(
					Math.min(cluster.averagePosition.lng, cluster.bounds.maxLng - lngMargin),
					cluster.bounds.minLng + lngMargin)
				);

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
				if (cluster.population === 1) {
					m = this.BuildLeafletMarker(cluster.lastMarker, position);
				} else {
					m = this.BuildLeafletCluster(cluster, position);
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

		window.setTimeout(() => {
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
			window.setTimeout(() => {
				for (i = 0, l = toRemove.length; i < l; ++i) {
					map.removeLayer(toRemove[i]);
				}
			}, 300);
		}
				
		this._objectsOnMap = newObjectsOnMap;
	}

});