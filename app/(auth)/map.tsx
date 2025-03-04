import { View, StyleSheet, Text, TouchableOpacity } from "react-native";
import { useEffect, useState, createRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { PROVIDER_GOOGLE, Region, Marker, Callout } from "react-native-maps";
import * as Location from "expo-location";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import { mapStyle } from "@/assets/mapStyle";
import { markers } from "@/assets/markers";
import MapView from "react-native-map-clustering";

const INITIAL_REGION = {
  latitude: 37.33,
  longitude: -122,
  latitudeDelta: 2,
  longitudeDelta: 2,
};

const Map = () => {
  const [currentLocation, setCurrentLocation] =
    useState<Location.LocationObjectCoords | null>(null);
  const [initialRegion, setInitialRegion] = useState<Region | null>(null);
  const mapRef = createRef<any>();
  const [region, setRegion] = useState(INITIAL_REGION);
  useEffect(() => {
    const getLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Permission to access location was denied");
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setCurrentLocation(location.coords);

      setInitialRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    };

    getLocation();
  }, []);

  const focusMap = async () => {
    const vancouverRegion = {
      latitude: 49.2827,
      longitude: -123.1207,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    };

    mapRef.current?.animateToRegion(vancouverRegion, 500);
  };

  const zoomIn = async () => {
    mapRef.current?.animateCamera({ zoom: 13 });
  };

  const onRegionChange = (region: Region) => {
    console.log(region);
  };

  const onMarkerSelected = (marker: {
    latitude: number;
    longitude: number;
  }) => {
    console.log(marker);
  };

  return (
    <View style={{ flex: 1 }}>
      <GooglePlacesAutocomplete
        placeholder="Search"
        fetchDetails
        query={{ key: "AIzaSyC1LKk6V5h4J_AxLq9vwbZcS__BJ-fcoH8" }}
        onFail={(error) => console.error(error)}
        onPress={(data, detail) => {
          const point = detail?.geometry.location;
          if (!point) return;
          setRegion({
            latitude: point.lat,
            longitude: point.lng,
            latitudeDelta: 0.2,
            longitudeDelta: 0.2,
          });
        }}
        styles={{
          container: {
            flex: 0,
          },
          textInput: {
            paddingLeft: 35,
          },
          textInputContainer: {
            padding: 4,
          },
        }}
        renderLeftButton={() => (
          <View
            style={{
              position: "absolute",
              left: 15,
              top: 14,
              zIndex: 2,
            }}
          >
            <Ionicons name="search-outline" size={24} />
          </View>
        )}
      />
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        mapType="standard"
        style={[StyleSheet.absoluteFill, { zIndex: -1 }]}
        showsUserLocation
        showsMyLocationButton
        rotateEnabled={false}
        region={region}
        onRegionChange={onRegionChange}
        customMapStyle={mapStyle}
      >
        {markers.map((marker, index) => (
          <Marker
            key={index}
            coordinate={marker}
            title={marker.name}
            onPress={() => onMarkerSelected(marker)}
          >
            <Callout>
              <Text style={{ fontSize: 24 }}>{marker.name}</Text>
            </Callout>
          </Marker>
        ))}
      </MapView>
      <View style={styles.btnContainer}>
        <TouchableOpacity style={styles.btn} onPress={focusMap}>
          <Ionicons name="location" size={24} color="black" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={zoomIn}>
          <Ionicons name="earth" size={24} color="black" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  btnContainer: {
    position: "absolute",
    top: 60,
    right: 20,
    gap: 10,
    zIndex: -1,
  },
  btn: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: {
      width: 1,
      height: 10,
    },
  },
});
export default Map;
