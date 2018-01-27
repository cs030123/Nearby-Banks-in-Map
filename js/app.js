var map;
var service;
var infoWindow;
var markers = [];
var placeList = ko.observableArray();
var listModel;

$(function() {
    listModel = new PlaceListModel();
    ko.applyBindings(listModel);
    fitSize();
});

//调整页面布局
function fitSize() {
    var height = $(window).height();
    var width = $(window).width();
    $('#resultDiv').height(height - $('#resultDiv').offset().top - 3);
    $('#rightDiv').width(width - $('#rightDiv').offset().left).height(height);
}

var mapLoadError = function() {
    alert('无法正常载入地图，请检查网络后重试');
}

//地址列表
var Place = function(data) {
    this.lat = ko.observable(data.lat);
    this.lng = ko.observable(data.lng);
    this.title = ko.observable(data.title);
    this.address = ko.observable(data.address);
    this.showPlace = ko.observable(data.showPlace);
}

var PlaceListModel = function() {
    var self = this;
    self.txtKeyword = ko.observable('');
    //过滤响应事件
    self.filterPlace = function(e) {
        infoWindow.close();
        var keyword = self.txtKeyword();
        //显示包含关键字，符合查询条件的，列表记录和marker显示，其他的隐藏
        for (let i = 0; i < placeList().length; i++) {
            if (placeList()[i].title().indexOf(keyword) < 0) {
                placeList()[i].showPlace(false);
                markers[i].setVisible(false);
            } else {
                placeList()[i].showPlace(true);
                markers[i].setVisible(true);
            }
        }
        //移动地图，将第一个符合条件的marker显示在中央
        for (let j = 0; j < markers.length; j++) {
            if (placeList()[j].showPlace()) {
                map.setCenter(markers[j].getPosition());
                break;
            }
        }
    };
    self.currentPlace = ko.observable(placeList[0]);
    self.clickPlace = function(clickedPlace) {
        self.currentPlace(clickedPlace);
        toPosition();
    }
}

//点击列表某一项的事件
function toPosition() {
    var title = listModel.currentPlace().title();
    var lat = listModel.currentPlace().lat();
    var lng = listModel.currentPlace().lng();

    for (let i = 0; i < markers.length; i++) {
        var p = markers[i].position;
        if (p.lat() == lat() && p.lng() == lng()) {
            //对应marker上下跳动，并打开infowindow显示详细信息
            openInfoWindow(markers[i], listModel.currentPlace().title(), listModel.currentPlace().address());
            break;
        }
    }
}

//初始化map
function initMap() {
    //地图中心点定位于深圳
    var point = new google.maps.LatLng(22.559596, 114.065106);
    map = new google.maps.Map(document.getElementById('rightDiv'), {
        center: point,
        zoom: 13
    });
    //初始化公用变量
    infoWindow = new google.maps.InfoWindow();
    //查找银行
    service = new google.maps.places.PlacesService(map);
    var requestPlace = {
        location: point,
        radius: 30000,
        query: 'bank'
    };
    service.textSearch(requestPlace, callback1);
}

//搜索bank，得到返回结果后的处理
function callback1(results, status) {
    if (status !== google.maps.places.PlacesServiceStatus.OK) {
        alert(`无法正常在地图上搜索银行：${status} ${results}`);
        return;
    }
    //成功返回的place，将添加marker在地图上
    for (let i = 0, result; result = results[i]; i++) {
        addMarker(result);
    }
}

function addMarker(place) {
    //结果先保存于placeList中
    placeList.push(new Place({
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng,
        title: place.name,
        address: place.formatted_address,
        showPlace: true
    }));
    //创建marker
    var marker = new google.maps.Marker({
        map: map,
        animation: google.maps.Animation.DROP,
        position: place.geometry.location
    });
    markers.push(marker);

    //每个marker添加点击事件，点击后上下跳动，并打开infowindow显示相关信息
    google.maps.event.addListener(marker, 'click', function() {
        openInfoWindow(marker, place.name, place.formatted_address);
    });
}

function stopMarkerAnimation() {
    for (let i = 0; i < markers.length; i++) {
        markers[i].setAnimation(null);
    }
}

//marker上下跳动，并打开infowindow显示相关信息
function openInfoWindow(marker, name, address) {
    //对于选中项对应的marker添加上下跳动的效果，仅持续2s
    marker.setAnimation(google.maps.Animation.BOUNCE);
    setTimeout('stopMarkerAnimation();', 2000);
    //创建infowindow中显示的内容
    var content = `<div>
      <p style='width:210px;font:bold 14px/16px arial,sans-serif;margin:0;color:#cc5522;white-space:nowrap;overflow:hidden'>${name}</p>
      <p style='line-height:16px;font:12px arial,sans-serif;margin-top:10px;'>${address}</p>
      </div>`;
    infoWindow.setContent(content);
    infoWindow.open(map, marker);
    //从wikipedia获取当前marker所代表地址的详情，附加在infowindow中
    var wikiUrl = "https://zh.wikipedia.org/w/api.php?action=opensearch&search=" + name + "&format=json&callback=wikiCallback";
    $.ajax({
        url: wikiUrl,
        dataType: "jsonp",
        success: function(response) {
            content = content + `<p style='line-height:16px;font:12px arial,sans-serif;margin-top:10px;'>简介：${response[1]}</p>`;
            infoWindow.setContent(content);
        },
        //如果没有成功获取，则显示相应提示信息
        error: function() {
            content = content + "<p style='line-height:16px;font:12px arial,sans-serif;margin-top:10px;color:blue;'>暂时获取不到详细信息</p>";
            infoWindow.setContent(content);
        }
    });
}