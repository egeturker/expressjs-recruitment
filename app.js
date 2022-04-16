const express = require("express");
const axios = require("axios");
const app = express();
const port = 3000;

// The number of countries each represeantive can have
const repQuotaMax = 7;
const repQuotaMin = 3;

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

  //Salesrep endpoint
  app.get("/salesrep", async (req, res) => {
    // GET request on countries endpoint
    axios
      .get("http://localhost:3000/countries")
      .then((response) => {
        const allCountries = response.data;
        const regions = [];

        // extract all of the regions from countries
        for (let country of allCountries) {
          if (
            !regions.some(
              (region) => region.regionName === country.region.toLowerCase()
            )
          ) {
            regions.push({
              regionName: country.region.toLowerCase(),
              numberOfCountries: 0,
              minSalesReq: 0,
              maxSalesReq: 0,
            });
          }
        }

        // count the number of countries in each region
        for (let country of allCountries) {
          for (let region of regions) {
            if (
              region.regionName.toLowerCase() === country.region.toLowerCase()
            )
              region.numberOfCountries++;
          }
        }

        // distribute representatives to the regions
        for (let region of regions) {
          var minReps = ~~(region.numberOfCountries / repQuotaMax);
          var maxReps = ~~(region.numberOfCountries / repQuotaMin);
          if (region.numberOfCountries % repQuotaMin > 0) maxReps += 1;
          if (region.numberOfCountries % repQuotaMax > 0) minReps += 1;
          region.minSalesReq = minReps;
          region.maxSalesReq = maxReps;
          delete region.numberOfCountries;
        }
        res.send(regions);
      })
      .catch((error) => {
        console.error(error);
      });
  });

  app.listen(port, () => {
    console.log(`Application listening on port ${port}`);
  });
}

main().then().catch(console.error);
