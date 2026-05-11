from sqlalchemy import create_engine
import os
try:
    # Use psycopg (3) instead of psycopg2
    engine = create_engine(os.environ["POSTGRES_URL"], creator=lambda: __import__('psycopg').connect(os.environ["POSTGRES_URL"]))
    with engine.connect() as conn:
        print("Success connect")
except Exception as e:
    print(f"Error: {e}")
