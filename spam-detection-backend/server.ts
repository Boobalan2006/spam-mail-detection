import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import spamRoutes from "./routes/spamRoutes";
import { initializeModel } from "./controllers/spamController";

const app = express();
const PORT = 4000; // Changed from 3000 to avoid conflict with Next.js dev server

app.use(cors({
  origin: 'http://localhost:3000', // Allow requests from Next.js frontend
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(bodyParser.json());

app.use("/api/spam", spamRoutes);

// Add a simple health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

initializeModel().then(() => {
  console.log("Model initialized and server running...");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});