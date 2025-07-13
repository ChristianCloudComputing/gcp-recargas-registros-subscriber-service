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
  const recarga = req.body;
  try {
    console.log(`GCP Recarga Service: Report ${recarga.id} trying...`);
    await saveRegistro(recarga);
    console.log(`GCP Recarga Service: Report ${recarga.id} success :-)`);
    res.status(204).send();
  }
  catch (ex) {
    console.log(`GCP Recarga Service: Report ${recarga?.id || 'unknown'} failure: ${ex}`);
    console.error('Full error details:', ex);
    
    // Check for authentication errors
    if (ex.message && (ex.message.includes('PERMISSION_DENIED') || ex.message.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT'))) {
      console.error('Authentication/Scope Error: The service account lacks proper Firestore access scopes.');
      console.error('Required OAuth scopes: https://www.googleapis.com/auth/datastore or https://www.googleapis.com/auth/cloud-platform');
      console.error('For Cloud Run: Make sure the service account has Cloud Datastore User role');
      console.error('For local development: Run "gcloud auth application-default login --scopes=https://www.googleapis.com/auth/cloud-platform"');
    }
    
    res.status(500).send({ error: 'Internal server error', message: ex.message });
  }
})

async function saveRegistro(recarga) {
  try {
      console.log(`Call write to Firestore`);
      console.log(`Recarga data received:`, JSON.stringify(recarga, null, 2));
      
      // Validate required fields
      if (!recarga || typeof recarga !== 'object') {
        throw new Error('Invalid recarga data: must be an object');
      }
      
      if (!recarga.telefono || typeof recarga.telefono !== 'string' || recarga.telefono.trim() === '') {
        throw new Error(`Invalid telefono: ${recarga.telefono}. Must be a non-empty string.`);
      }
      
      if (!recarga.monto) {
        throw new Error(`Invalid monto: ${recarga.monto}. Must be provided.`);
      }
      
      await writeToFirestore(recarga);
      console.log(`Wrote ${recarga} record`);
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
    console.log(`Document ID (telefono):`, recarga.telefono);
    console.log(`Document ID type:`, typeof recarga.telefono);
    console.log(`Document ID length:`, recarga.telefono ? recarga.telefono.length : 'N/A');
    
    // Use the global db instance instead of creating a new one each time
    // Additional validation before creating document reference
    if (!recarga.telefono || typeof recarga.telefono !== 'string' || recarga.telefono.trim() === '') {
        throw new Error(`Invalid document ID: '${recarga.telefono}'. Document ID must be a non-empty string.`);
    }
    
    const docRef = db.collection("registros").doc(recarga.telefono);
    const data = {
        telefono: recarga.telefono,
        monto: recarga.monto
    };

    console.log(`Data to be saved:`, JSON.stringify(data, null, 2));

    try {
        await docRef.set(data, { merge: true });
        console.log('Recarga Registro saved');
    } catch (err) {
        console.log(`Error saving registro: ${err}`);
        throw err; // Re-throw to be handled by the calling function
    }
}
