import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
} from "react-native";
import React, { useEffect, useState, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import jwt_decode from "jwt-decode";
import { UserType } from "../UserContext";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";

const AddressScreen = () => {
  const navigation = useNavigation();
  const [name, setName] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [houseNo, setHouseNo] = useState("");
  const [street, setStreet] = useState("");
  const [landmark, setLandmark] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const { userId, setUserId } = useContext(UserType);

  useEffect(() => {
    const fetchUser = async () => {
      const token = await AsyncStorage.getItem("authToken");
      const decodedToken = jwt_decode(token);
      const userId = decodedToken.userId;
      setUserId(userId);
    };
    fetchUser();
  }, []);

  const handleAddAddress = () => {
    const address = {
      name,
      mobileNo,
      houseNo,
      street,
      landmark,
      postalCode,
    };

    axios
      .post("http://localhost:8000/addresses", { userId, address })
      .then((response) => {
        Alert.alert("Success", "Address added successfully");
        setName("");
        setMobileNo("");
        setHouseNo("");
        setStreet("");
        setLandmark("");
        setPostalCode("");

        setTimeout(() => {
          navigation.goBack();
        }, 500);
      })
      .catch((error) => {
        Alert.alert("Error", "Failed to add address");
        console.log("error", error);
      });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header} />
      <View style={styles.content}>
        <Text style={styles.title}>Add a New Address</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Full Name (First and Last Name)</Text>
          <TextInput
            value={name}
            onChangeText={(text) => setName(text)}
            placeholder="Enter your name"
            placeholderTextColor="gray"
            style={styles.input}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Mobile Number</Text>
          <TextInput
            value={mobileNo}
            onChangeText={(text) => setMobileNo(text)}
            placeholder="Mobile No"
            placeholderTextColor="gray"
            style={styles.input}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Flat, House No, Building, Company</Text>
          <TextInput
            value={houseNo}
            onChangeText={(text) => setHouseNo(text)}
            placeholder="Enter house details"
            placeholderTextColor="gray"
            style={styles.input}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Area, Street, Sector, Village</Text>
          <TextInput
            value={street}
            onChangeText={(text) => setStreet(text)}
            placeholder="Enter street details"
            placeholderTextColor="gray"
            style={styles.input}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Landmark</Text>
          <TextInput
            value={landmark}
            onChangeText={(text) => setLandmark(text)}
            placeholder="Eg. Near Apollo Hospital"
            placeholderTextColor="gray"
            style={styles.input}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Postal Code</Text>
          <TextInput
            value={postalCode}
            onChangeText={(text) => setPostalCode(text)}
            placeholder="Enter postal code"
            placeholderTextColor="gray"
            style={styles.input}
          />
        </View>

        <Pressable onPress={handleAddAddress} style={styles.button}>
          <Text style={styles.buttonText}>Add Address</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

export default AddressScreen;

const styles = StyleSheet.create({
  container: {
    backgroundColor: "black",
  },
  header: {
    height: 50,
    backgroundColor: "yellow",
  },
  content: {
    padding: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: "bold",
    color: "white",
  },
  label: {
    fontSize: 15,
    fontWeight: "bold",
    color: "white",
    marginTop: 10,
  },
  input: {
    padding: 10,
    borderColor: "#D0D0D0",
    borderWidth: 1,
    borderRadius: 5,
    color: "white",
    marginTop: 10,
  },
  button: {
    backgroundColor: "yellow",
    padding: 19,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: {
    fontWeight: "bold",
    color: "black",
  },
});
