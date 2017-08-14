define(function (require) {

    var echarts = require('echarts');
    var zrUtil = echarts.util;

    function BMapCoordSys(bmap, api) {
        this._bmap = bmap;
        this.dimensions = ['lng', 'lat'];
        this._mapOffset = [0, 0];

        this._api = api;
    }

    BMapCoordSys.prototype.dimensions = ['lng', 'lat'];

    BMapCoordSys.prototype.setZoom = function (zoom) {
        this._zoom = zoom;
    };

    BMapCoordSys.prototype.setCenter = function (center) {
        this._center = center;
    };

    BMapCoordSys.prototype.setMapOffset = function (mapOffset) {
        this._mapOffset = mapOffset;
    };

    BMapCoordSys.prototype.getBMap = function () {
        return this._bmap;
    };

    BMapCoordSys.prototype.dataToPoint = function (data) {
        //var point = new BMap.Point(data[0], data[1]);

        //var px = this._bmap.pointToOverlayPixel(point);
        var mapOffset = this._mapOffset;
        return [data[0] - mapOffset[0], data[1] - mapOffset[1]];
    };

    BMapCoordSys.prototype.pointToData = function (pt) {
        var mapOffset = this._mapOffset;
        // var pt = this._bmap.overlayPixelToPoint({
        //     x: pt[0] + mapOffset[0],
        //     y: pt[1] + mapOffset[1]
        // });
        return [pt[0], pt[1]];
    };

    BMapCoordSys.prototype.getViewRect = function () {
        var api = this._api;
        return new echarts.graphic.BoundingRect(0, 0, api.getWidth(), api.getHeight());
    };

    BMapCoordSys.prototype.getRoamTransform = function () {
        return echarts.matrix.create();
    };

    BMapCoordSys.prototype.prepareCustoms = function (data) {
        var rect = this.getViewRect();
        return {
            coordSys: {
                // The name exposed to user is always 'cartesian2d' but not 'grid'.
                type: 'bmap',
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
            },
            api: {
                coord: zrUtil.bind(this.dataToPoint, this),
                size: zrUtil.bind(dataToCoordSize, this)
            }
        };
    };

    function dataToCoordSize(dataSize, dataItem) {
        dataItem = dataItem || [0, 0];
        return zrUtil.map([0, 1], function (dimIdx) {
            var val = dataItem[dimIdx];
            var halfSize = dataSize[dimIdx] / 2;
            var p1 = [];
            var p2 = [];
            p1[dimIdx] = val - halfSize;
            p2[dimIdx] = val + halfSize;
            p1[1 - dimIdx] = p2[1 - dimIdx] = dataItem[1 - dimIdx];
            return Math.abs(this.dataToPoint(p1)[dimIdx] - this.dataToPoint(p2)[dimIdx]);
        }, this);
    }

    var Overlay;

    // For deciding which dimensions to use when creating list data
    BMapCoordSys.dimensions = BMapCoordSys.prototype.dimensions;

    BMapCoordSys.create = function (ecModel, api) {
        var bmapCoordSys;
        var root = api.getDom();

        // TODO Dispose
        ecModel.eachComponent('bmap', function (bmapModel) {
            var painter = api.getZr().painter;
            var viewportRoot = painter.getViewportRoot();
            if (typeof ol === 'undefined') {
                throw new Error('ol api is not loaded');
            }
            
            if (bmapCoordSys) {
                throw new Error('Only one bmap component can exist');
            }
            if (!bmapModel.__bmap) {
                // Not support IE8
                var bmapRoot = root.querySelector('.ec-extension-bmap');
                if (bmapRoot) {
                    // Reset viewport left and top, which will be changed
                    // in moving handler in BMapView
                    viewportRoot.style.left = '0px';
                    viewportRoot.style.top = '0px';
                    root.removeChild(bmapRoot);
                }
                bmapRoot = document.createElement('div');
                bmapRoot.style.cssText = 'width:100%;height:100%';
                // Not support IE8
                bmapRoot.classList.add('ec-extension-bmap');
                root.appendChild(bmapRoot);

                var bmap = bmapModel.__bmap = new ol.Map({
                    view: new ol.View({
                        center: [0, 0],
                        zoom: 1
                    }),
                    layers: [
                        new ol.layer.Tile({
                            source: new ol.source.OSM()
                        })
                    ],
                    target: bmapRoot
                });
                var imageCanvas=new ol.source.ImageCanvas({
                    canvasFunction: function() { return viewportRoot;},
                });
                var canvasLayer = new ol.layer.Image({
                    source: imageCanvas,
                });
                bmap.addLayer(canvasLayer);

                // Override
                painter.getViewportRootOffset = function () {
                    return {offsetLeft: 0, offsetTop: 0};
                };
            }
            var bmap = bmapModel.__bmap;

            // Set bmap options
            // centerAndZoom before layout and render
            var center = bmapModel.get('center');
            var zoom = bmapModel.get('zoom');
            if (center && zoom) {
                // === var pt = new BMap.Point(center[0], center[1]);
                // == bmap.centerAndZoom(pt, zoom);
                var view = bmap.getView();
                view.setCenter(center);
                view.setZoom(zoom);
            }

            bmapCoordSys = new BMapCoordSys(bmap, api);
            bmapCoordSys.setMapOffset(bmapModel.__mapOffset || [0, 0]);
            bmapCoordSys.setZoom(zoom);
            bmapCoordSys.setCenter(center);

            bmapModel.coordinateSystem = bmapCoordSys;
        });

        ecModel.eachSeries(function (seriesModel) {
            if (seriesModel.get('coordinateSystem') === 'bmap') {
                seriesModel.coordinateSystem = bmapCoordSys;
            }
        });
    };

    return BMapCoordSys;
});