from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "VERA Backend"
    app_version: str = "0.1.0"

    postgres_url: str = "postgresql+psycopg://vera:vera@postgres:5432/vera"
    redis_url: str = "redis://redis:6379/0"

    neo4j_uri: str = "bolt://neo4j:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "vera_password"

    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    # --- MULTI-TENANT SQUAD CONFIGURATION ---
    # Secret keys for each merchant account in the Kano Ring demo
    squad_secret_key_1: str = "" # Alpha Remit Ltd
    squad_secret_key_2: str = "" # Quick Cash Services
    squad_secret_key_3: str = "" # Shell Co Alpha Ltd
    squad_secret_key_4: str = "" # Musa Lawal
    
    # Merchant IDs for each fraud ring entity (from Squad dashboard)
    squad_merchant_id_1: str = ""  # Alpha Remit Ltd
    squad_merchant_id_2: str = ""  # Quick Cash Services
    squad_merchant_id_3: str = ""  # Shell Co Alpha Ltd
    squad_merchant_id_4: str = ""  # Musa Lawal

    squad_webhook_secret: str = ""  # Fallback / shared secret
    squad_merchant_id: str = ""     # Legacy single-merchant field
    squad_api_base_url: str = "https://sandbox-api-d.squadco.com"
    squad_webhook_url: str = "https://vera-c5ccs.ondigitalocean.app/api/v1/webhooks/squad"
    squad_ussd_endpoint: str = "/transaction/initiate/process-payment"
    squad_transfer_endpoint: str = "/payout/transfer"
    squad_quarantine_account: str = ""

settings = Settings()