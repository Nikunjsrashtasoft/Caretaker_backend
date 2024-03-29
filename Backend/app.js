import express from "express";
import { createConnection ,DataSource} from "typeorm";
import bodyParser from "body-parser";
import router from "./Route/routes.js";
import fs from "fs/promises";
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(bodyParser.json()); 
// Middleware to parse JSON bodies

app.use(cors());

app.use("/", router); // Use the routes
var ormconfig;
async function readJson() {
  ormconfig = JSON.parse(await fs.readFile("./ormconfig.json"));
}

const CreateConnection = async () => {
  try {
    await readJson();
    const connection =  await createConnection({...ormconfig});
    // const connection =  new DataSource({...ormconfig});
    // await connection.initialize();
    app.listen(PORT || 3001, () => {
        console.log(`Server running on port ${PORT}`);
    });
    // console.log("connection.......", connection);
    console.log("Data Source has been initialized!");
  } catch (error) {
    console.log("Error:", error);
  }
};

CreateConnection();
