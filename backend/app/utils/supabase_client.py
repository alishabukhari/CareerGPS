from supabase import create_client, Client
from dotenv import load_dotenv
import os

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
SUPABASE_ANON_KEY = os.environ["SUPABASE_ANON_KEY"]

_admin: Client | None = None
_anon: Client | None = None

def get_supabase_admin() -> Client:
    global _admin
    if _admin is None:
        _admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    return _admin

def get_supabase_anon() -> Client:
    global _anon
    if _anon is None:
        _anon = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    return _anon
