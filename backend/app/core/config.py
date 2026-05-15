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
    # These match the keys provided for Alpha Remit, Quick Cash, Shell Co, and Musa Lawal
    squad_secret_key_1: str = "" 
    squad_secret_key_2: str = ""
    squad_secret_key_3: str = ""
    squad_secret_key_4: str = ""
    
    # Legacy key for backward compatibility if needed
    squad_secret_key: str = "" 
    
    squad_webhook_secret: str = ""
    squad_merchant_id: str = "" 
    squad_api_base_url: str = "https://sandbox-api-d.squadco.com"
    squad_ussd_endpoint: str = "/transaction/initiate/process-payment"
    squad_transfer_endpoint: str = "/payout/transfer"
    squad_webhook_url: str = ""
    squad_quarantine_account: str = ""


settings = Settings()