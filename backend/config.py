from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    solana_rpc_url: str = "https://api.devnet.solana.com"
    program_id: str = ""
    backend_port: int = 8002
    sns_proxy_url: str = "https://sdk-proxy.sns.id"

    model_config = {"env_file": "../.env"}


settings = Settings()
