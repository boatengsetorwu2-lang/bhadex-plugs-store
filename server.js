
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

const PRODUCTS = {
  "Canva Pro": 3500,
  "Spotify Premium": 3000,
  "Streaming Plan": 5000,
  "Other Premium": 2500
};

app.get("/", (req, res) => {
  res.send("Bhadex Plugs payment server is running.");
});

// Initialize payment
app.post("/initialize", async (req, res) => {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      return res.status(500).json({ error: "Payment server is not configured." });
    }

    const { email, product } = req.body;
    const amount = PRODUCTS[product];

    if (!email || !email.includes("@") || !amount) {
      return res.status(400).json({ error: "Invalid email or product." });
    }

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: amount * 100,
        currency: "GHS",
        channels: ["card", "mobile_money"],
        metadata: { product }
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Payment initialization failed:", error.message);
    res.status(500).json({ error: "Could not initialize payment." });
  }
});

// Verify payment
app.get("/verify/:reference", async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(req.params.reference)}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
        }
      }
    );

    const data = response.data.data;

    res.json({
      verified: data.status === "success" && data.currency === "GHS",
      status: data.status,
      amount: data.amount,
      currency: data.currency,
      reference: data.reference
    });
  } catch (error) {
    res.status(500).json({ error: "Could not verify payment." });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Bhadex Plugs server running on port ${PORT}`);
});
