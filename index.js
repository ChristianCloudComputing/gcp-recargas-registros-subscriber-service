const express = require('express');
const { Firestore } = require("@google-cloud/firestore");
const { Logging } = require('@google-cloud/logging');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
const logName = "gcp-recargas-registros-log";

// Creates a Logging client
const logging = new Logging();
const log = logging.log(logName);

// Initialize Firestore once at startup with proper scopes
const db = new Firestore({
    projectId: "my-project-1571074190064",
    // Explicitly specify scopes if needed
    // This ensures the client has the right permissions
});

const resource = {
    type: "global",
};

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log('Listening on port', port);
});

app.post('/', async (req, res) => {
  console.log(`Received request body:`, JSON.stringify(req.body, null, 2));
  const recarga = decodeBase64Json(req.body.message.data);
  try {
    console.log(`GCP Recarga Service: Report ${recarga.telefono} trying...`);
    await saveRegistro(recarga);
    console.log(`GCP Recarga Service: Report ${recarga.telefono} success :-)`);
    res.status(204).send();
  }
  catch (ex) {
    console.log(`GCP Recarga Service: Report ${recarga?.telefono || 'unknown'} failure: ${ex}`);
    console.error('Full error details:', ex);
    
    res.status(500).send({ error: 'Internal server error', message: ex.message });
  }
})

async function saveRegistro(recarga) {
  try {
      console.log(`Recarga data received:`, JSON.stringify(recarga, null, 2));
      
      // Validate required fields
      if (!recarga || typeof recarga !== 'object') {
        throw new Error('Invalid recarga data: must be an object');
      }
      
      if (!recarga.telefono || recarga.telefono.trim() === '') {
        throw new Error(`Invalid telefono: ${recarga.telefono}. Must be non-empty.`);
      }
      
      if (!recarga.monto) {
        throw new Error(`Invalid monto: ${recarga.monto}. Must be provided.`);
      }
      
      await writeToFirestore(recarga);
      // A text log entry
      const success_message = `Success: Recarga - Wrote ${recarga} record`;
      const entry = log.entry(
        { resource: resource },
        { message: `${success_message}` }
      );
      log.write([entry]);
    } catch (e) {
      console.error(e);
      throw e; // Re-throw to be handled by the calling function
    }
}

async function writeToFirestore(recarga) {
    console.log(`writeToFirestore called with:`, JSON.stringify(recarga, null, 2));
    
    const docRef = db.collection("registros").doc(recarga.telefono);
    const data = {
        telefono: recarga.telefono,
        monto: recarga.monto
    };

    try {
        await docRef.set(data, { merge: true });
        console.log('Recarga Registro saved');
    } catch (err) {
        console.log(`Error saving registro: ${err}`);
        throw err; // Re-throw to be handled by the calling function
    }
}

function decodeBase64Json(data) {
  return JSON.parse(Buffer.from(data, 'base64').toString());
}
