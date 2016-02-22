/// <reference path="../typings/tsd.d.ts" />
declare module PruneCluster {
    interface Position {
        lat: number;
        lng: number;
    }
    class Point {
        x: number;
        y: number;
    }
    interface Bounds {
        minLat: number;
        maxLat: number;
        minLng: number;
        maxLng: number;
    }
    class ClusterObject {
        position: Position;
        data: any;
        hashCode: number;
    }
    class Marker extends ClusterObject {
        category: number;
        weight: number;
        filtered: boolean;
        constructor(lat: number, lng: number, data?: {}, category?: number, weight?: number, filtered?: boolean);
        Move(lat: number, lng: number): void;
        SetData(data: any): void;
    }
    class Cluster extends ClusterObject {
        bounds: Bounds;
        population: number;
        averagePosition: Position;
        stats: number[];
        totalWeight: number;
        lastMarker: Marker;
        static ENABLE_MARKERS_LIST: boolean;
        private _clusterMarkers;
        constructor(marker?: Marker);
        AddMarker(marker: Marker): void;
        Reset(): void;
        ComputeBounds(cluster: PruneCluster): void;
        GetClusterMarkers(): Marker[];
        ApplyCluster(newCluster: Cluster): void;
    }
    class PruneCluster {
        private _markers;
        private _nbChanges;
        private _clusters;
        Size: number;
        ViewPadding: number;
        Project: (lat: number, lng: number) => Point;
        UnProject: (x: number, y: number) => Position;
        RegisterMarker(marker: Marker): void;
        RegisterMarkers(markers: Marker[]): void;
        private _sortMarkers();
        private _sortClusters();
        private _indexLowerBoundLng(lng);
        private _resetClusterViews();
        ProcessView(bounds: Bounds): Cluster[];
        RemoveMarkers(markers?: Marker[]): void;
        FindMarkersInArea(area: Bounds): Marker[];
        ComputeBounds(markers: Marker[], withFiltered?: boolean): Bounds;
        FindMarkersBoundsInArea(area: Bounds): Bounds;
        ComputeGlobalBounds(withFiltered?: boolean): Bounds;
        GetMarkers(): Marker[];
        GetPopulation(): number;
        ResetClusters(): void;
    }
}
declare module PruneCluster {
    class LeafletAdapter implements L.ILayer {
        Cluster: PruneCluster;
        onAdd: (map: L.Map) => void;
        onRemove: (map: L.Map) => void;
        RegisterMarker: (marker: Marker) => void;
        RegisterMarkers: (markers: Marker[]) => void;
        RemoveMarkers: (markers: Marker[]) => void;
        ProcessView: () => void;
        FitBounds: (withFiltered?: boolean) => void;
        GetMarkers: () => Marker[];
        RedrawIcons: (processView?: boolean) => void;
        BuildLeafletCluster: (cluster: Cluster, position: L.LatLng) => L.ILayer;
        BuildLeafletClusterIcon: (cluster: Cluster) => L.Icon;
        BuildLeafletMarker: (marker: Marker, position: L.LatLng) => L.Marker;
        PrepareLeafletMarker: (marker: L.Marker, data: {}, category: number) => void;
    }
    interface LeafletMarker extends L.Marker {
        _population?: number;
        _hashCode?: number;
        _zoomLevel?: number;
        _removeFromMap?: boolean;
    }
    interface ILeafletAdapterData {
        _leafletMarker?: LeafletMarker;
        _leafletCollision?: boolean;
        _leafletOldPopulation?: number;
        _leafletOldHashCode?: number;
        _leafletPosition?: L.LatLng;
    }
}
declare var PruneClusterForLeaflet: any;
declare var PruneClusterLeafletSpiderfier: any;
