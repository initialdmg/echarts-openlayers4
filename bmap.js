/**
 * BMap component extension
 */
define(function (require) {

    require('echarts').registerCoordinateSystem(
        'bmap', require('./BMapCoordSys')
    );
    require('./BMapModel');
    require('./BMapView');

    // Action
    require('echarts').registerAction({
        type: 'bmapRoam',
        event: 'bmapRoam',
        update: 'updateLayout'
    }, function (payload, ecModel) {
        ecModel.eachComponent('bmap', function (bMapModel) {
            var bmap = bMapModel.getBMap();
            var center = bmap.getView().getCenter();
            bMapModel.setCenterAndZoom(center, bmap.getView().getZoom());
        });
    });

    return {
        version: '1.0.0'
    };
});