from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "GRACE Backend"
    app_version: str = "0.1.0"

    postgres_url: str = "postgresql+psycopg://grace:grace@postgres:5432/grace"
    redis_url: str = "redis://redis:6379/0"

    neo4j_uri: str = "bolt://neo4j:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "grace_password"

    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    lua_transaction_intake_webhook_url: str = ""
    lua_transaction_intake_key: str = ""
    lua_transaction_intake_bearer_token: str = ""
    lua_transaction_intake_timeout_seconds: float = 30.0


settings = Settings()
