const express = require('express');
const fs = require('fs');
const { Firestore } = require("@google-cloud/firestore");
const { Logging } = require('@google-cloud/logging');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
const logName = "gcp-recargas-registros-log";

// Creates a Logging client
const logging = new Logging();
const log = logging.log(logName);

const resource = {
    type: "global",
};

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log('Listening on port', port);
});

app.post('/', async (req, res) => {
  const recarga = decodeBase64Json(req.body.message.data);
  try {
    console.log(`GCP Recarga Service: Report ${recarga.id} trying...`);
    saveRegistro(recarga);
    console.log(`GCP Recarga Service: Report ${recarga.id} success :-)`);
    res.status(204).send();
  }
  catch (ex) {
    console.log(`GCP Recarga Service: Report ${recarga.id} failure: ${ex}`);
    res.status(500).send();
  }
})

function decodeBase64Json(data) {
  return JSON.parse(Buffer.from(data, 'base64').toString());
}

function saveRegistro(recarga) {
  try {
      console.log(`Call write to Firestore`);
      writeToFirestore(recarga);
      console.log(`Wrote ${recarga} record`);
      // A text log entry
      success_message = `Success: Recarga - Wrote ${recarga} record`;
      const entry = log.entry(
        { resource: resource },
        { message: `${success_message}` }
      );
      log.write([entry]);
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
}

async function writeToFirestore(recarga) {
    const db = new Firestore({
        projectId: "my-project-1571074190064"
    });

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
    }
}
