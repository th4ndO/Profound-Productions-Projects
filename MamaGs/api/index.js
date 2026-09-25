// index.js
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

mongoose.connect("<YOUR_MONGO_URI>", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const User = require("./models/user");

app.post("/addresses", async (req, res) => {
  try {
    const { userId, address } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.addresses.push(address);
    await user.save();
    res.status(200).json({ message: "Address added successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error adding address" });
  }
});

app.get("/addresses/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ addresses: user.addresses });
  } catch (error) {
    res.status(500).json({ message: "Error fetching addresses" });
  }
});

app.listen(8000, () => console.log("Server running on port 8000"));
