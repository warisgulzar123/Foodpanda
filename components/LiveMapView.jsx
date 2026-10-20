import React, { useEffect, useRef } from "react";
import { View, Text, Platform, StyleSheet, TouchableOpacity, Linking } from "react-native";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";

// Safely require react-native-maps only on native platforms (iOS / Android)
let MapView, Marker, Polyline, Callout, PROVIDER_GOOGLE;
if (Platform.OS !== "web") {
  try {
    const Maps = require("react-native-maps");
    MapView = Maps.default;
    Marker = Maps.Marker;
    Polyline = Maps.Polyline;
    Callout = Maps.Callout;
    PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
  } catch (err) {
    console.warn("[LiveMapView] react-native-maps native load warning:", err.message);
  }
}

/**
 * Authentic Foodpanda / Bykea Clean Navigation Google Maps Styling.
 * Light, distraction-free cartography with soft amber arterial highways,
 * crystal blue waterways, and muted non-essential POIs.
 */
export const FOODPANDA_MAP_STYLE = [
  {
    elementType: "geometry",
    stylers: [{ color: "#f8f9fa" }],
  },
  {
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#616161" }],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#f8f9fa" }],
  },
  {
    featureType: "administrative.land_parcel",
    elementType: "labels.text.fill",
    stylers: [{ color: "#bdbdbd" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#eeeeee" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#757575" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#e8f5e9" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#81c784" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road.arterial",
    elementType: "labels.text.fill",
    stylers: [{ color: "#757575" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#ffe082" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#616161" }],
  },
  {
    featureType: "road.local",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9e9e9e" }],
  },
  {
    featureType: "transit.line",
    elementType: "geometry",
    stylers: [{ color: "#e5e5e5" }],
  },
  {
    featureType: "transit.station",
    elementType: "geometry",
    stylers: [{ color: "#eeeeee" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#c9e6ff" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9e9e9e" }],
  },
];

export default function LiveMapView({
  riderLocation = { lat: 24.8145, lng: 67.0325, heading: 45 },
  restaurantLocation = { lat: 24.8145, lng: 67.0325, name: "KFC - Clifton" },
  customerLocation = { lat: 24.822, lng: 67.039, address: "Clifton Block 2" },
  status = "On the Way",
  eta = "12-18 min",
  height = 260,
}) {
  const mapRef = useRef(null);

  const restLat = Number(restaurantLocation?.lat) || 24.8145;
  const restLng = Number(restaurantLocation?.lng) || 67.0325;
  const riderLat = Number(riderLocation?.lat) || 24.818;
  const riderLng = Number(riderLocation?.lng) || 67.035;
  const riderHeading = Number(riderLocation?.heading) || 0;
  const custLat = Number(customerLocation?.lat) || 24.822;
  const custLng = Number(customerLocation?.lng) || 67.039;

  const initialRegion = {
    latitude: riderLat,
    longitude: riderLng,
    latitudeDelta: 0.025,
    longitudeDelta: 0.025,
  };

  // Center native map smoothly when rider location or heading updates
  useEffect(() => {
    if (Platform.OS !== "web" && mapRef.current && riderLat && riderLng) {
      try {
        if (typeof mapRef.current.animateCamera === "function") {
          mapRef.current.animateCamera(
            {
              center: {
                latitude: riderLat,
                longitude: riderLng,
              },
              heading: riderHeading,
              pitch: 30,
              zoom: 16,
            },
            { duration: 1000 }
          );
        } else if (typeof mapRef.current.animateToRegion === "function") {
          mapRef.current.animateToRegion(
            {
              latitude: riderLat,
              longitude: riderLng,
              latitudeDelta: 0.018,
              longitudeDelta: 0.018,
            },
            1000
          );
        }
      } catch (err) {
        console.warn("[LiveMapView Camera Notice]:", err.message);
      }
    }
  }, [riderLat, riderLng, riderHeading]);

  const handleRecenter = () => {
    if (mapRef.current && riderLat && riderLng) {
      try {
        mapRef.current.animateToRegion(
          {
            latitude: riderLat,
            longitude: riderLng,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          },
          600
        );
      } catch (e) {}
    }
  };

  const openExternalGoogleMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${restLat},${restLng}&destination=${custLat},${custLng}&travelmode=driving`;
    Linking.openURL(url).catch((err) => console.warn("Could not open Google Maps link:", err.message));
  };

  // =========================================================================
  // NATIVE PLATFORM: RENDER AUTHENTIC GOOGLE MAPS TILES VIA PROVIDER_GOOGLE
  // =========================================================================
  if (Platform.OS !== "web" && MapView && Marker) {
    const routeCoordinates = [
      { latitude: restLat, longitude: restLng },
      { latitude: riderLat, longitude: riderLng },
      { latitude: custLat, longitude: custLng },
    ];

    return (
      <View style={[{ height, borderRadius: 24, overflow: "hidden" }]} className="border border-[#E2E8F0] relative">
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFillObject}
          initialRegion={initialRegion}
          customMapStyle={FOODPANDA_MAP_STYLE}
          showsUserLocation={false}
          showsCompass={true}
          showsMyLocationButton={false}
          rotateEnabled={true}
          pitchEnabled={true}
          scrollEnabled={true}
          zoomEnabled={true}
          loadingEnabled={true}
          loadingIndicatorColor="#D70F64"
          loadingBackgroundColor="#F7F7F7"
        >
          {/* Active Navigation Polyline */}
          {Polyline && (
            <>
              {/* Soft outline shadow line */}
              <Polyline
                coordinates={routeCoordinates}
                strokeColor="rgba(215, 15, 100, 0.25)"
                strokeWidth={8}
              />
              {/* Primary crisp Foodpanda navigation line */}
              <Polyline
                coordinates={routeCoordinates}
                strokeColor="#D70F64"
                strokeWidth={4.5}
                lineCap="round"
                lineJoin="round"
              />
            </>
          )}

          {/* Restaurant Marker (Pickup Point) */}
          <Marker
            coordinate={{ latitude: restLat, longitude: restLng }}
            title={restaurantLocation?.name || "Restaurant"}
            description="Kitchen Pickup Location"
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View className="items-center">
              <View className="w-10 h-10 rounded-full bg-[#D70F64] items-center justify-center border-2 border-white shadow-lg">
                <Ionicons name="restaurant" size={17} color="#FFFFFF" />
              </View>
              <View className="bg-white/95 px-2 py-0.5 rounded-md mt-1 border border-[#E2E8F0] shadow-sm">
                <Text className="text-[#1F1F1F] text-[9px] font-black" numberOfLines={1}>
                  {restaurantLocation?.name || "Kitchen"}
                </Text>
              </View>
            </View>
            {Callout && (
              <Callout tooltip>
                <View className="bg-white px-3 py-2 rounded-xl shadow-xl border border-[#E2E8F0] items-center">
                  <Text className="text-[#1F1F1F] text-xs font-black">{restaurantLocation?.name || "Restaurant"}</Text>
                  <Text className="text-[#707070] text-[10px]">Pickup Location</Text>
                </View>
              </Callout>
            )}
          </Marker>

          {/* Live Rider Marker (Motorbike with live rotation) */}
          <Marker
            coordinate={{ latitude: riderLat, longitude: riderLng }}
            title="Your Rider"
            description="Live GPS Tracking"
            anchor={{ x: 0.5, y: 0.5 }}
            flat={true}
            rotation={riderHeading}
          >
            <View className="items-center justify-center relative">
              {/* Pulsing halo wave */}
              <View className="w-12 h-12 rounded-full bg-[#D70F64]/20 absolute" />
              {/* Inner branded motorbike badge */}
              <View className="w-10 h-10 rounded-full bg-[#1F1F1F] items-center justify-center border-2 border-[#D70F64] shadow-xl">
                <MaterialCommunityIcons name="motorbike" size={20} color="#FFFFFF" />
              </View>
            </View>
            {Callout && (
              <Callout tooltip>
                <View className="bg-white px-3 py-2 rounded-xl shadow-xl border border-[#E2E8F0] items-center">
                  <Text className="text-[#1F1F1F] text-xs font-black">Foodpanda Rider</Text>
                  <Text className="text-emerald-600 text-[10px] font-bold">● Live GPS Active</Text>
                </View>
              </Callout>
            )}
          </Marker>

          {/* Customer Destination Marker */}
          <Marker
            coordinate={{ latitude: custLat, longitude: custLng }}
            title="Delivery Destination"
            description={customerLocation?.address || "Your Address"}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View className="items-center">
              <View className="w-10 h-10 rounded-full bg-[#059669] items-center justify-center border-2 border-white shadow-lg">
                <Ionicons name="home" size={17} color="#FFFFFF" />
              </View>
              <View className="bg-white/95 px-2 py-0.5 rounded-md mt-1 border border-[#E2E8F0] shadow-sm">
                <Text className="text-[#1F1F1F] text-[9px] font-black" numberOfLines={1}>
                  {customerLocation?.address || "Home"}
                </Text>
              </View>
            </View>
            {Callout && (
              <Callout tooltip>
                <View className="bg-white px-3 py-2 rounded-xl shadow-xl border border-[#E2E8F0] items-center">
                  <Text className="text-[#1F1F1F] text-xs font-black">Delivery Doorstep</Text>
                  <Text className="text-[#707070] text-[10px]">{customerLocation?.address || "Customer Address"}</Text>
                </View>
              </Callout>
            )}
          </Marker>
        </MapView>

        {/* Floating Live Telemetry Badge */}
        <View className="absolute top-3 left-3 bg-white/95 px-3 py-1.5 rounded-full border border-[#E2E8F0] shadow-sm flex-row items-center">
          <View className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2" />
          <Text className="text-[#1F1F1F] text-xs font-black">
            Google Maps Live • {eta}
          </Text>
        </View>

        {/* Floating Re-center Action Button */}
        <TouchableOpacity
          onPress={handleRecenter}
          activeOpacity={0.85}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 items-center justify-center border border-[#E2E8F0] shadow-md"
        >
          <Ionicons name="locate" size={18} color="#D70F64" />
        </TouchableOpacity>

        {/* Coordinates Pill */}
        <View className="absolute bottom-3 right-3 bg-white/90 px-2.5 py-1 rounded-full border border-[#E2E8F0] shadow-sm">
          <Text className="text-[#707070] text-[10px] font-bold">
            {riderLat.toFixed(4)}, {riderLng.toFixed(4)}
          </Text>
        </View>
      </View>
    );
  }

  // =========================================================================
  // WEB PLATFORM: REAL INTERACTIVE LEAFLET / OPENSTREETMAP EMBED
  // =========================================================================
  const leafletHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: #f8f9fa; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; overflow: hidden; }
    .custom-pin { display: flex; align-items: center; justify-content: center; border-radius: 50%; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
    .restaurant-pin { background: #D70F64; border: 2.5px solid #ffffff; width: 36px; height: 36px; color: #ffffff; font-size: 17px; }
    .customer-pin { background: #059669; border: 2.5px solid #ffffff; width: 36px; height: 36px; color: #ffffff; font-size: 17px; }
    .rider-container { position: relative; width: 46px; height: 46px; display: flex; align-items: center; justify-content: center; }
    .rider-halo { position: absolute; width: 46px; height: 46px; border-radius: 50%; background: rgba(215, 15, 100, 0.28); animation: pulse 1.8s infinite ease-out; }
    .rider-pin { width: 36px; height: 36px; border-radius: 50%; background: #1F1F1F; border: 2.5px solid #D70F64; display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 18px; box-shadow: 0 4px 14px rgba(215,15,100,0.45); }
    @keyframes pulse { 0% { transform: scale(0.65); opacity: 0.9; } 100% { transform: scale(1.4); opacity: 0; } }
    .leaflet-popup-content-wrapper { border-radius: 12px; font-weight: 700; font-size: 12px; box-shadow: 0 6px 16px rgba(0,0,0,0.18); }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false, attributionControl: false });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(map);

    var restIcon = L.divIcon({
      className: '',
      html: '<div class="custom-pin restaurant-pin">🏪</div>',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18]
    });

    var riderIcon = L.divIcon({
      className: '',
      html: '<div class="rider-container"><div class="rider-halo"></div><div id="rider-bike" class="rider-pin" style="transform: rotate(${riderHeading}deg);">🛵</div></div>',
      iconSize: [46, 46],
      iconAnchor: [23, 23],
      popupAnchor: [0, -23]
    });

    var custIcon = L.divIcon({
      className: '',
      html: '<div class="custom-pin customer-pin">🏠</div>',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18]
    });

    L.marker([${restLat}, ${restLng}], { icon: restIcon }).addTo(map).bindPopup('<b>${(restaurantLocation?.name || "Kitchen").replace(/['"\\]/g, "")}</b><br/>Pickup Location');
    var riderMarker = L.marker([${riderLat}, ${riderLng}], { icon: riderIcon }).addTo(map).bindPopup('<b>Foodpanda Rider</b><br/>Live GPS Connected');
    L.marker([${custLat}, ${custLng}], { icon: custIcon }).addTo(map).bindPopup('<b>Delivery Address</b><br/>${(customerLocation?.address || "Customer").replace(/['"\\]/g, "")}');

    L.polyline([
      [${restLat}, ${restLng}],
      [${riderLat}, ${riderLng}],
      [${custLat}, ${custLng}]
    ], {
      color: 'rgba(215, 15, 100, 0.25)',
      weight: 8
    }).addTo(map);

    var routeLine = L.polyline([
      [${restLat}, ${restLng}],
      [${riderLat}, ${riderLng}],
      [${custLat}, ${custLng}]
    ], {
      color: '#D70F64',
      weight: 4.5,
      opacity: 0.95
    }).addTo(map);

    map.fitBounds([
      [${restLat}, ${restLng}],
      [${riderLat}, ${riderLng}],
      [${custLat}, ${custLng}]
    ], { padding: [35, 35] });

    window.addEventListener('message', function(e) {
      if (!e.data || e.data.type !== 'UPDATE_RIDER_COORDS') return;
      var newLat = e.data.lat;
      var newLng = e.data.lng;
      var newHeading = e.data.heading || 0;
      if (newLat && newLng) {
        riderMarker.setLatLng([newLat, newLng]);
        var bikeEl = document.getElementById('rider-bike');
        if (bikeEl) bikeEl.style.transform = 'rotate(' + newHeading + 'deg)';
        routeLine.setLatLngs([
          [${restLat}, ${restLng}],
          [newLat, newLng],
          [${custLat}, ${custLng}]
        ]);
        if (e.data.recenter) {
          map.panTo([newLat, newLng], { animate: true, duration: 0.6 });
        }
      }
    });
  </script>
</body>
</html>`;

  return (
    <View
      style={[{ height, borderRadius: 24, overflow: "hidden" }]}
      className="border border-[#E2E8F0] relative bg-[#f8f9fa]"
    >
      <iframe
        srcDoc={leafletHtml}
        style={{
          width: "100%",
          height: "100%",
          border: 0,
          display: "block",
        }}
        title="Foodpanda Live Interactive Map"
      />

      {/* Floating Status & ETA Badge */}
      <View className="absolute top-3 left-3 bg-white/95 px-3 py-1.5 rounded-full border border-[#E2E8F0] shadow-sm flex-row items-center">
        <View className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2" />
        <Text className="text-[#1F1F1F] text-xs font-black">
          Live Tracking • {eta}
        </Text>
      </View>

      {/* Re-center Button */}
      <TouchableOpacity
        onPress={handleRecenter}
        activeOpacity={0.85}
        className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 items-center justify-center border border-[#E2E8F0] shadow-md"
      >
        <Ionicons name="locate" size={18} color="#D70F64" />
      </TouchableOpacity>

      {/* External Google Maps Button */}
      <TouchableOpacity
        onPress={openExternalGoogleMaps}
        activeOpacity={0.85}
        className="absolute bottom-3 left-3 bg-white/95 px-3 py-1.5 rounded-full border border-[#E2E8F0] shadow-sm flex-row items-center"
      >
        <FontAwesome5 name="google" size={11} color="#D70F64" style={{ marginRight: 5 }} />
        <Text className="text-[#D70F64] text-xs font-black">Google Maps</Text>
      </TouchableOpacity>

      {/* Live Coordinates Pill */}
      <View className="absolute bottom-3 right-3 bg-white/90 px-2.5 py-1 rounded-full border border-[#E2E8F0] shadow-sm">
        <Text className="text-[#707070] text-[10px] font-bold">
          {riderLat.toFixed(4)}, {riderLng.toFixed(4)}
        </Text>
      </View>
    </View>
  );
}
