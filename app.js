const express = require("express");
const app = express();
const port = 3000;

require("dotenv").config();

const { MongoClient } = require("mongodb");
const client = new MongoClient(process.env.CONNECTION_URI);

async function main() {
  // Create MongoDB connection
  await client.connect();
  console.log("Connected successfully to MongoDB");
  const db = client.db(process.env.DB_NAME);
  // Connect to the countries collection
  const collection = db.collection("countries");

  // Countries endpoint
  app.get("/countries", async (req, res) => {
    // If the region parameter is not sent, return all countries
    if (req.query.region == null) {
      const allCountries = await collection
        .find({})
        // _id is suppressed here since the example in the document did not have _id field
        .project({ _id: 0 })
        .toArray();
      res.send(allCountries);
    }
    // Filter using the region parameter
    else {
      region = req.query.region;
      const filteredCountries = await collection
        .find({ region: region })
        // _id is suppressed here since the example in the document did not have _id field
        .project({ _id: 0 })
        .toArray();
      res.send(filteredCountries);
    }
  });

  app.listen(port, () => {
    console.log(`Application listening on port ${port}`);
  });
}

main().then().catch(console.error);
