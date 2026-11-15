
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// Prices are in Ghana cedis (GH₵).
const PRODUCTS = {
  "Netflix": {
    "Standard": 45,
    "Premium": 60
  },
  "Spotify Premium": {
    "Individual": 30,
    "Duo": 45,
    "Family": 60
  },
  "YouTube Premium": {
    "Individual": 40,
    "Family": 65
  },
  "Apple Music": {
    "Individual": 30,
    "Family": 50
  },
  "Disney+": {
    "Standard": 55,
    "Premium": 70
  },
  "Amazon Prime Video": {
    "Monthly access": 45
  },
  "Boomplay Premium": {
    "Monthly": 25
  },
  "Audiomack Premium": {
    "Monthly": 20
  },
  "MovieBox": {
    "Access": 35
  },
  "TikTok Services": {
    "Profile setup": 25,
    "Content plan": 45
  },
  "Telegram Premium": {
    "Monthly": 45
  },
  "Snapchat+": {
    "Monthly": 30
  },
  "X Premium": {
    "Monthly": 50
  },
  "Instagram Services": {
    "Profile setup": 25,
    "Content plan": 45
  },
  "Facebook Services": {
    "Page setup": 25,
    "Content plan": 45
  },
  "CapCut Pro": {
    "Monthly": 35
  },
  "Canva Pro": {
    "Pro access": 35
  },
  "ChatGPT Plus": {
    "Monthly": 100
  },
  "Gemini Advanced": {
    "Monthly": 80
  },
  "Microsoft 365": {
    "Personal": 75,
    "Family": 110
  },
  "Google One": {
    "100 GB": 20,
    "200 GB": 30,
    "2 TB": 55
  }
};

function findPrice(product, selectedPackage) {
  const productKey = Object.keys(PRODUCTS).find(
    key => key.toLowerCase() === String(product || "").trim().toLowerCase()
  );

  if (!productKey) return null;

  const packages = PRODUCTS[productKey];
  const packageKey = Object.keys(packages).find(
    key => key.toLowerCase() === String(selectedPackage || "").trim().toLowerCase()
  );

  // Allow an omitted package only when the product has one option.
  if (!packageKey && Object.keys(packages).length === 1) {
    const onlyPackage = Object.keys(packages)[0];
    return {
      product: productKey,
      selectedPackage: onlyPackage,
      amount: packages[onlyPackage]
    };
  }

  if (!packageKey) return null;

  return {
    product: productKey,
    selectedPackage: packageKey,
    amount: packages[packageKey]
  };
}

app.get("/", (req, res) => {
  res.send("BHADEX PLUGS payment server is running.");
});

// Initialize Paystack payment
app.post("/initialize", async (req, res) => {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      return res.status(500).json({
        error: "Payment server is not configured."
      });
    }

    const { email, product, package: selectedPackage } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        error: "Please provide a valid email address."
      });
    }

    const order = findPrice(product, selectedPackage);

    if (!order) {
      return res.status(400).json({
        error: "Invalid product or package."
      });
    }

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: email,
        amount: Math.round(order.amount * 100),
        currency: "GHS",
        channels: ["card", "mobile_money"],
        metadata: {
          product: order.product,
          package: order.selectedPackage
        }
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return res.json(response.data);

  } catch (error) {
    console.error(
      "Payment initialization failed:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      error: "Could not initialize payment. Please try again."
    });
  }
});

// Verify payment with Paystack
app.get("/verify/:reference", async (req, res) => {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      return res.status(500).json({
        error: "Payment server is not configured."
      });
    }

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(req.params.reference)}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
        }
      }
    );

    const data = response.data.data;
    const metadata = data.metadata || {};

    const order = findPrice(metadata.product, metadata.package);

    const verified =
      data.status === "success" &&
      data.currency === "GHS" &&
      order !== null &&
      Number(data.amount) === Math.round(order.amount * 100);

    return res.json({
      verified,
      status: data.status,
      amount: data.amount,
      currency: data.currency,
      reference: data.reference,
      product: metadata.product,
      package: metadata.package
    });

  } catch (error) {
    console.error(
      "Payment verification failed:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      error: "Could not verify payment."
    });
  }
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`BHADEX PLUGS server running on port ${PORT}`);
});
    
