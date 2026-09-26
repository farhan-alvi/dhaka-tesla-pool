require("dotenv").config();
const { createApp } = require("./app");

const app = createApp();
const port = process.env.PORT || 4000;

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Dhaka Tesla Pool API listening on :${port}`);
});
