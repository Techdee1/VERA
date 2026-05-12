import requests
import time
import sys
from datetime import datetime

API_BASE_URL = 'https://whale-app-6npb9.ondigitalocean.app/api/v1'

def validate():
    # 1. Get entities
    print(f"1) Fetching entities from {API_BASE_URL}/entities?limit=5...")
    try:
        resp = requests.get(f"{API_BASE_URL}/entities?limit=5")
        resp.raise_for_status()
        data = resp.json()
        entities = data if isinstance(data, list) else data.get('items', [])
        if len(entities) < 2:
            print(f"FAILURE: Not enough entities found. Found {len(entities)}. Total reported: {data.get('total')}")
            return
        entity_ids = [e['id'] for e in entities[:2]]
        print(f"Found entity IDs: {entity_ids}")
    except Exception as e:
        print(f"FAILURE: Failed to fetch entities: {e}")
        return

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
    print(f"2) POSTing /api/v1/transactions/ingest with reference {reference}...")
    try:
        resp = requests.post(f"{API_BASE_URL}/transactions/ingest", json=payload)
        resp.raise_for_status()
        job_id = resp.json().get('job_id')
        print(f"Job ID: {job_id}")
    except Exception as e:
        print(f"FAILURE: Failed to ingest transaction: {e}")
        return

    # 3. Poll job
    print(f"3) Polling /api/v1/jobs/{job_id}...")
    status = "pending"
    for i in range(12):
        try:
            resp = requests.get(f"{API_BASE_URL}/jobs/{job_id}")
            resp.raise_for_status()
            job_status_data = resp.json()
            status = job_status_data.get('status')
            print(f"Attempt {i+1}: Status = {status}")
            if status in ['completed', 'failed']:
                break
        except Exception as e:
            print(f"Error polling job: {e}")
        time.sleep(2)
    print(f"Final Job Status: {status}")

    # 4. Get alerts
    print(f"4) GETting /api/v1/alerts?limit=5...")
    try:
        resp = requests.get(f"{API_BASE_URL}/alerts?limit=5")
        resp.raise_for_status()
        alerts_data = resp.json()
        items = alerts_data if isinstance(alerts_data, list) else alerts_data.get('items', [])
        total = alerts_data.get('total', len(items)) if not isinstance(alerts_data, list) else len(items)
        print(f"Total alerts: {total}")
        if items:
            print(f"First alert ID: {items[0].get('id')}")
    except Exception as e:
        print(f"FAILURE: Failed to fetch alerts: {e}")

if __name__ == "__main__":
    validate()
