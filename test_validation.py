import requests
import time
import json
from datetime import datetime, timezone

API_BASE_URL = 'https://whale-app-6npb9.ondigitalocean.app/api/v1'

source_id = "32b4d296-3a59-45ce-ba49-381c046d2039"
dest_id = "4fb26c29-1b61-4152-8f00-cddbfb9d2eba"
timestamp = int(time.time())
reference = f"DO-DEPLOY-TEST-{timestamp}"

payload = {
    "transactions": [
        {
            "source_entity_id": source_id,
            "destination_entity_id": dest_id,
            "amount": 50000.0,
            "currency": "NGN",
            "reference": reference,
            "occurred_at": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
        }
    ]
}

print(f"Ingesting transaction: {reference}")
response = requests.post(f"{API_BASE_URL}/transactions/ingest", json=payload)
if response.status_code != 202:
    print(f"Failed to ingest: {response.status_code} {response.text}")
    exit(1)

job_id = response.json().get('job_id')
print(f"Job ID: {job_id}")

for i in range(12):
    time.sleep(2)
    job_resp = requests.get(f"{API_BASE_URL}/jobs/{job_id}")
    if job_resp.status_code == 200:
        data = job_resp.json()
        status = data.get('status')
        print(f"Poll {i+1}: status={status}")
        if status in ['completed', 'failed']:
            print(f"Final Job State: {json.dumps(data, indent=2)}")
            break
    else:
        print(f"Poll {i+1}: Failed {job_resp.status_code}")

ent_resp = requests.get(f"{API_BASE_URL}/entities?limit=5")
if ent_resp.status_code == 200:
    entities = ent_resp.json()
    print(f"Entities (limit 5): {len(entities)}")
    print(f"Total entities (header): {ent_resp.headers.get('X-Total-Count', 'N/A')}")
else:
    print(f"Entities fetch failed: {ent_resp.status_code}")

alert_resp = requests.get(f"{API_BASE_URL}/alerts?limit=5")
if alert_resp.status_code == 200:
    alerts = alert_resp.json()
    count = len(alerts)
    print(f"Alerts (limit 5): {count}")
    print(f"Total alerts (header): {alert_resp.headers.get('X-Total-Count', 'N/A')}")
else:
    print(f"Alerts fetch failed: {alert_resp.status_code}")
