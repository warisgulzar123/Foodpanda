import React, { useEffect, useRef, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking } from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";

export default function LiveMapView({
  riderLocation = { lat: 24.8145, lng: 67.0325, heading: 45 },
  restaurantLocation = { lat: 24.8145, lng: 67.0325, name: "KFC - Clifton" },
  customerLocation = { lat: 24.822, lng: 67.039, address: "Clifton Block 2" },
  status = "On the Way",
  eta = "12-18 min",
  height = 260,
}) {
  const iframeRef = useRef(null);

  const restLat = Number(restaurantLocation?.lat) || 24.8145;
  const restLng = Number(restaurantLocation?.lng) || 67.0325;
  const restName = (restaurantLocation?.name || "Restaurant").replace(/['"\\]/g, "");

  const riderLat = Number(riderLocation?.lat) || 24.818;
  const riderLng = Number(riderLocation?.lng) || 67.035;
  const riderHeading = Number(riderLocation?.heading) || 0;

  const custLat = Number(customerLocation?.lat) || 24.822;
  const custLng = Number(customerLocation?.lng) || 67.039;
  const custAddress = (customerLocation?.address || "Customer Address").replace(/['"\\]/g, "");

  // Send real-time updates to Leaflet map iframe without reloading
  useEffect(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: "UPDATE_RIDER_COORDS",
          lat: riderLat,
          lng: riderLng,
          heading: riderHeading,
        },
        "*"
      );
    }
  }, [riderLat, riderLng, riderHeading]);

  const handleRecenter = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: "UPDATE_RIDER_COORDS",
          lat: riderLat,
          lng: riderLng,
          heading: riderHeading,
          recenter: true,
        },
        "*"
      );
    }
  };

  const openExternalGoogleMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${restLat},${restLng}&destination=${custLat},${custLng}&travelmode=driving`;
    Linking.openURL(url).catch((err) =>
      console.warn("Could not open Google Maps link:", err.message)
    );
  };

  // Generate self-contained Leaflet HTML with CartoDB Positron / OSM tiles
  const leafletHtml = useMemo(() => {
    return `<!DOCTYPE html>
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
    .rider-pin { width: 36px; height: 36px; border-radius: 50%; background: #1F1F1F; border: 2.5px solid #D70F64; display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 18px; box-shadow: 0 4px 14px rgba(215,15,100,0.45); transition: transform 0.25s ease; }
    @keyframes pulse { 0% { transform: scale(0.65); opacity: 0.9; } 100% { transform: scale(1.4); opacity: 0; } }
    .leaflet-popup-content-wrapper { border-radius: 12px; font-weight: 700; font-size: 12px; box-shadow: 0 6px 16px rgba(0,0,0,0.18); }
    .leaflet-popup-content { margin: 10px 14px; line-height: 1.4; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false, attributionControl: false });

    // Authentic Clean Cartography tiles (CartoDB Positron - matches Foodpanda / Google Maps clean UI)
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

    var restMarker = L.marker([${restLat}, ${restLng}], { icon: restIcon }).addTo(map).bindPopup('<b>${restName}</b><br/><span style="color:#707070; font-size:10px;">Pickup Location</span>');
    var riderMarker = L.marker([${riderLat}, ${riderLng}], { icon: riderIcon }).addTo(map).bindPopup('<b>Foodpanda Rider</b><br/><span style="color:#059669; font-size:10px;">● Live GPS Streaming</span>');
    var custMarker = L.marker([${custLat}, ${custLng}], { icon: custIcon }).addTo(map).bindPopup('<b>Delivery Destination</b><br/><span style="color:#707070; font-size:10px;">${custAddress}</span>');

    // Route Outline (glow)
    var routeOutline = L.polyline([
      [${restLat}, ${restLng}],
      [${riderLat}, ${riderLng}],
      [${custLat}, ${custLng}]
    ], {
      color: 'rgba(215, 15, 100, 0.25)',
      weight: 8,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    // Primary Foodpanda Pink route
    var routeLine = L.polyline([
      [${restLat}, ${restLng}],
      [${riderLat}, ${riderLng}],
      [${custLat}, ${custLng}]
    ], {
      color: '#D70F64',
      weight: 4.5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    map.fitBounds([
      [${restLat}, ${restLng}],
      [${riderLat}, ${riderLng}],
      [${custLat}, ${custLng}]
    ], { padding: [35, 35] });

    // Live coordinate receiver
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
        routeOutline.setLatLngs([
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
  }, [restLat, restLng, restName, custLat, custLng, custAddress]);

  return (
    <View
      style={[{ height, borderRadius: 24, overflow: "hidden" }]}
      className="border border-[#E2E8F0] relative bg-[#f8f9fa]"
    >
      {/* Live Interactive Leaflet Map iframe */}
      <iframe
        ref={iframeRef}
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
