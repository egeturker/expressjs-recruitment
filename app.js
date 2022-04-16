const express = require("express");
const axios = require("axios");
const app = express();
const port = 3000;

require("dotenv").config();

const { MongoClient } = require("mongodb");
const client = new MongoClient(process.env.CONNECTION_URI);

// The number of countries each represeantive can have
const repQuotaMax = 7;
const repQuotaMin = 3;

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
      regionPattern = req.query.region;
      const filteredCountries = await collection
        .find({ region: { $regex: `^${regionPattern}`, $options: "i" } }) //regex for case insensitivity
        // _id is suppressed here since the example in the document did not have _id field
        .project({ _id: 0 })
        .toArray();
      res.send(filteredCountries);
    }
  });

  // Salesrep endpoint
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

  // Optimal endpoint
  app.get("/optimal", async (req, res) => {
    var allReps = [];
    // Request to get minimum nunber of salesreps for each region
    axios
      .get("http://localhost:3000/salesrep")
      .then((response) => {
        regions = response.data;
        for (region of regions) {
          const regionReps = [];
          // Creation of salesrep objects
          for (var i = 0; i < region.minSalesReq; i++) {
            regionReps.push({
              region: region.region,
              countryList: [],
              countryCount: 0,
            });
          }
          // We have to wait for the requests for each region to finish. We collect the promises.
          promises = [];
          promises.push(
            // Request to get the region-specific country list.
            axios
              .get(
                `http://localhost:3000/countries?region=${region.regionName}`
              )
              .then((res) => {
                regionCountries = res.data;
                numberOfRegionCountries = regionCountries.length;
                index = 0;
                // Distributing countries one by one to get optimal distribution
                while (index < numberOfRegionCountries)
                  for (rep of regionReps) {
                    if (index < numberOfRegionCountries) {
                      rep.countryList.push(regionCountries[index].name);
                      rep.region = regionCountries[index].region;
                      rep.countryCount++;
                      index++;
                    }
                  }
                // Copying region-specific list to the general list
                allReps = [...allReps, ...regionReps];
              })
          );
        }
        // Waiting for all requests to resolve promises. Then send response.
        Promise.all(promises).then(() => res.send(allReps));
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
