from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Depends, Header
import os
from dotenv import load_dotenv
from supabase import create_client, Client
from pydantic import BaseModel

security = HTTPBearer()

# Load environment variables
load_dotenv()

app = FastAPI(title="CareerGPS API", version="0.1.0")

# CORS (for Next.js frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase credentials
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

# Admin / service role client (bypasses RLS)
supabase_admin = create_client(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
)

# User / anon client (respects RLS + auth.uid())
supabase = create_client(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
)


# Models (request bodies)

class SignupRequest(BaseModel):
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class ProfileUpdate(BaseModel):
    full_name: str | None = None
    major: str | None = None
    interests: list[str] | None = None

# Routes


def get_postgrest_for_user(token: str):
    return supabase.postgrest.auth(token)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    token = credentials.credentials

    try:
        user_response = supabase.auth.get_user(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    if not user_response or not user_response.user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return user_response.user


@app.get("/health")
def health():
    return {"status": "ok", "message": "Backend is running 🚀"}

@app.post("/signup")
def signup(user: SignupRequest):
    try:
        response = supabase_admin.auth.admin.sign_up({
            "email": user.email,
            "password": user.password,
            "email_confirm": True
        })

        # supabase-py v2 returns user here
        if response.user is None:
            raise HTTPException(status_code=400, detail="User creation failed")


        supabase_admin.table("profiles").insert({
            "user_id": response.user.id
        }).execute()

        return {
            "success": True,
            "user_id": response.user.id,
            "email": response.user.email,
        }

    except Exception as e:
        # THIS is the correct error handling
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/login")
def login(user: LoginRequest):
    try:
        response = supabase_admin.auth.sign_in_with_password({
            "email": user.email,
            "password": user.password
        })

        if not response.user:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        return {
            "success": True,
            "user_id": response.user.id,
            "email": response.user.email,
            "access_token": response.session.access_token
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/me")
def get_me(current_user = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "created_at": current_user.created_at,
    }

@app.get("/profile")
def get_profile(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user = Depends(get_current_user),
):
    pg = supabase.postgrest.auth(credentials.credentials)

    response = (
        pg
        .from_("profiles")
        .select("*")
        .eq("user_id", current_user.id)
        .maybe_single()
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Profile not found")

    return response.data


@app.patch("/profile")
def update_profile(
    payload: ProfileUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user = Depends(get_current_user),
):
    pg = supabase.postgrest.auth(credentials.credentials)

    response = (
        pg
        .from_("profiles")
        .upsert(
            {
                "user_id": current_user.id,
                **payload.model_dump(exclude_unset=True),
            },
            on_conflict="user_id",
        )
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=400, detail="Profile update failed")

    return response.data[0]












