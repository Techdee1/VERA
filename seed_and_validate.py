import requests
import time
import sys
from datetime import datetime

API_BASE_URL = 'https://whale-app-6npb9.ondigitalocean.app/api/v1'

def run():
    # 1. Seed two entities
    entity_ids = []
    for name in ["Sender Entity", "Receiver Entity"]:
        print(f"Creating entity: {name}...")
        try:
            resp = requests.post(f"{API_BASE_URL}/entities", json={"name": name, "type": "individual"})
            resp.raise_for_status()
            entity_ids.append(resp.json()['id'])
        except Exception as e:
            print(f"Failed to create entity: {e}")
            return

    print(f"Created entity IDs: {entity_ids}")

    # 2. Ingest transaction
    reference = f"DO-DEPLOY-TEST-{int(time.time())}"
    payload = {
        "transactions": [
            {
                "sender_id": entity_ids[0],
                "receiver_id": entity_ids[1],
                "amount": 1200000.00,
                "currency": "NGN",
                "occurred_at": datetime.utcnow().isoformat() + "Z",
                "reference": reference,
                "channel": "transfer"
            }
        ]
    }
    print(f"Ingesting transaction with reference {reference}...")
    try:
        resp = requests.post(f"{API_BASE_URL}/transactions/ingest", json=payload)
        resp.raise_for_status()
        job_id = resp.json().get('job_id')
        print(f"Job ID: {job_id}")
    except Exception as e:
        print(f"Failed to ingest: {e}")
        return

    # 3. Poll job
    status = "pending"
    for i in range(12):
        resp = requests.get(f"{API_BASE_URL}/jobs/{job_id}").json()
        status = resp.get('status')
        print(f"Attempt {i+1}: Status = {status}")
        if status in ['completed', 'failed']:
            break
        time.sleep(2)
    print(f"Final Job Status: {status}")

    # 4. Get alerts
    print("Fetching alerts...")
    resp = requests.get(f"{API_BASE_URL}/alerts?limit=5").json()
    items = resp if isinstance(resp, list) else resp.get('items', [])
    total = len(items) if isinstance(resp, list) else resp.get('total', len(items))
    print(f"Total alerts: {total}")
    if items:
        print(f"First alert ID: {items[0].get('id')}")

if __name__ == "__main__":
    run()
