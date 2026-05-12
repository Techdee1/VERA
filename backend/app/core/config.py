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

    squad_secret_key: str = "" # Reverting to sandbox_sk for test
    squad_webhook_secret: str = ""
    squad_merchant_id: str = "" # Replace with your actual Squad Merchant ID from the dashboard
    squad_api_base_url: str = "https://sandbox-api-d.squadco.com"
    squad_ussd_endpoint: str = "/transaction/initiate/process-payment"
    squad_transfer_endpoint: str = "/payout/transfer"
    squad_webhook_url: str = ""
    squad_quarantine_account: str = ""
    lua_transaction_intake_webhook_url: str = ""
    lua_transaction_intake_key: str = ""
    lua_transaction_intake_bearer_token: str = ""
    lua_transaction_intake_timeout_seconds: float = 30.0


settings = Settings()
