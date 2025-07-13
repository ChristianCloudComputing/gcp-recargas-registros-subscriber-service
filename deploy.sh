gcloud builds submit \
  --tag gcr.io/$GOOGLE_CLOUD_PROJECT/gcp-registros-subscriber-service

gcloud run deploy gcp-registros-subscriber-service \
  --image gcr.io/$GOOGLE_CLOUD_PROJECT/gcp-registros-subscriber-service \
  --platform managed \
  --region "us-central" \
  --no-allow-unauthenticated \
  --max-instances=1