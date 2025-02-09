import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { Controller } from "react-hook-form";
import * as Location from "expo-location";
import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";

const LocationInput = ({ control }: { control: any }) => {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );

  useEffect(() => {
    async function getCurrentLocation() {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    }

    getCurrentLocation();
  }, []);

  const query = {
    key: "AIzaSyC1LKk6V5h4J_AxLq9vwbZcS__BJ-fcoH8",
    language: "en",
    types: "restaurant|cafe|bar",
    location: location
      ? `${location.coords.latitude},${location.coords.longitude}`
      : undefined,
    radius: location ? 5000 : undefined,
  };

  return (
    <Controller
      control={control}
      name="location"
      rules={{ required: true }}
      render={({ field: { onChange, value } }) => (
        <View style={styles.inputContainer}>
          <GooglePlacesAutocomplete
            placeholder="Search Restaurants, Cafes, or Bars"
            textInputProps={{
              placeholderTextColor: "#AAA",
              returnKeyType: "search",
            }}
            fetchDetails={true}
            minLength={2}
            onPress={(data, details = null) => {
              const locationData = {
                name: data.structured_formatting.main_text,
                address: data.description,
                coordinates: details
                  ? {
                      latitude: details.geometry.location.lat,
                      longitude: details.geometry.location.lng,
                    }
                  : null,
              };
              onChange(locationData);
            }}
            query={query}
            styles={{
              container: { flex: 0, zIndex: 1 },
              textInput: {
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                height: 44,
                borderRadius: 5,
                paddingVertical: 5,
                paddingHorizontal: 10,
                fontSize: 18,
                flex: 1,
                color: "#FFF",
              },
              row: {
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                paddingHorizontal: 10.5,
              },
              description: {
                color: "#FFF",
                fontSize: 14,
              },
              separator: {
                display: "none",
              },
              poweredContainer: {
                display: "none",
              },
            }}
          />
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    marginVertical: 20,
    width: "100%",
  },
});

export default LocationInput;
