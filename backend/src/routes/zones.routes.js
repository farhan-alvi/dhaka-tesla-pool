const express = require("express");
const { ZONES } = require("../config/zones");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({ zones: ZONES });
});

module.exports = router;
