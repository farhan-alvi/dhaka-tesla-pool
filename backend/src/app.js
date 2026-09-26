const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { errorHandler } = require("./middleware/error.middleware");

const authRoutes = require("./routes/auth.routes");
const zonesRoutes = require("./routes/zones.routes");
const ridesRoutes = require("./routes/rides.routes");
const driverRoutes = require("./routes/driver.routes");

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));

  app.get("/health", (req, res) => res.json({ status: "ok" }));

  app.use("/api/auth", authRoutes);
  app.use("/api/zones", zonesRoutes);
  app.use("/api/rides", ridesRoutes);
  app.use("/api/driver", driverRoutes);

  app.use((req, res) => res.status(404).json({ error: "Not found" }));
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
