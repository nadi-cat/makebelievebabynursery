import express from "express";
import cors from "cors";
import fs from "fs";
import Stripe from "stripe";

const app = express();
const stripe = new Stripe("STRIPE_SECRET_KEY"); // replace later

app.use(cors());
app.use(express.json());

const DOLLS_FILE = "./dolls.json";

// Read dolls from JSON
function getDolls() {
  return JSON.parse(fs.readFileSync(DOLLS_FILE, "utf-8"));
}

// Save dolls to JSON
function saveDolls(data) {
  fs.writeFileSync(DOLLS_FILE, JSON.stringify(data, null, 2));
}

// EXISTING: Get a single doll by ID
app.get("/api/dolls/:id", (req, res) => {
  const dolls = getDolls();
  const doll = dolls[req.params.id];

  if (!doll) return res.status(404).json({ error: "Not found" });

  res.json(doll);
});

// NEW: Get all dolls
app.get("/api/dolls", (req, res) => {
  const dolls = getDolls();
  res.json(dolls);
});

// NEW: Mark a doll as sold
app.post("/api/dolls/:id/sold", (req, res) => {
  const dolls = getDolls();
  const doll = dolls[req.params.id];

  if (!doll) return res.status(404).json({ error: "Not found" });

  doll.stock = 0;
  saveDolls(dolls);

  res.json({ message: `${doll.name} marked as sold` });
});

// NEW: Stripe checkout session
app.post("/api/create-checkout-session", async (req, res) => {
  const { dollId } = req.body;
  const dolls = getDolls();
  const doll = dolls[dollId];

  if (!doll || doll.stock === 0)
    return res.status(400).json({ error: "Doll not available" });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: doll.name },
          unit_amount: doll.price * 100, // Stripe uses cents
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: "https://yourdomain.com/success.html",
    cancel_url: "https://yourdomain.com/cancel.html",
  });

  res.json({ url: session.url });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

