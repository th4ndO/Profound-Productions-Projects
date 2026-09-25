import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
} from "react-native";
import React, { useEffect, useContext, useState, useCallback } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { Entypo } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import axios from "axios";
import { UserType } from "../UserContext";

const AddAddressScreen = () => {
  const navigation = useNavigation();
  const [addresses, setAddresses] = useState([]);
  const { userId, setUserId } = useContext(UserType);
  console.log("userId", userId);

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const response = await axios.get(
        `http://localhost:8000/addresses/${userId}`
      );
      const { addresses } = response.data;

      setAddresses(addresses);
    } catch (error) {
      console.log("error", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAddresses();
    }, [])
  );

  console.log("addresses", addresses);

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Addresses</Text>
      </View>

      <View style={styles.container}>
        <Pressable
          onPress={() => navigation.navigate("Add")}
          style={styles.addNewAddress}
        >
          <Text style={{ color: "white" }}>Add a new Address</Text>
          <MaterialIcons name="keyboard-arrow-right" size={24} color="white" />
        </Pressable>

        <Pressable>
          {addresses?.map((item, index) => (
            <Pressable key={index} style={styles.addressContainer}>
              <View style={styles.addressHeader}>
                <Text style={styles.nameText}>{item?.name}</Text>
                <Entypo name="location-pin" size={24} color="yellow" />
              </View>

              <Text style={styles.addressText}>{item?.houseNo}, {item?.landmark}</Text>
              <Text style={styles.addressText}>{item?.street}</Text>
              <Text style={styles.addressText}>India, Bangalore</Text>
              <Text style={styles.addressText}>phone No : {item?.mobileNo}</Text>
              <Text style={styles.addressText}>pin code : {item?.postalCode}</Text>

              <View style={styles.buttonContainer}>
                <Pressable style={styles.actionButton}>
                  <Text>Edit</Text>
                </Pressable>

                <Pressable style={styles.actionButton}>
                  <Text>Remove</Text>
                </Pressable>

                <Pressable style={styles.actionButton}>
                  <Text>Set as Default</Text>
                </Pressable>
              </View>
            </Pressable>
          ))}
        </Pressable>
      </View>
    </ScrollView>
  );
};

export default AddAddressScreen;

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "black",
    flex: 1,
  },
  header: {
    backgroundColor: "yellow",
    padding: 15,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "black",
  },
  container: {
    padding: 10,
    backgroundColor: "black",
  },
  addNewAddress: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    borderBottomColor: "#D0D0D0",
    borderBottomWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 5,
  },
  addressContainer: {
    borderWidth: 1,
    borderColor: "#D0D0D0",
    padding: 10,
    backgroundColor: "#333",
    marginVertical: 10,
    borderRadius: 5,
  },
  addressHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  nameText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "white",
  },
  addressText: {
    fontSize: 15,
    color: "#F0F0F0",
  },
  buttonContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 10,
  },
  actionButton: {
    backgroundColor: "yellow",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "black",
  },
});
