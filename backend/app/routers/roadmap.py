from fastapi import APIRouter, Depends, HTTPException
from app.auth.deps import get_current_user
from app.utils.supabase_client import get_supabase_admin
from pydantic import BaseModel
from datetime import datetime

class CompleteTaskRequest(BaseModel):
    title: str

router = APIRouter(prefix="/roadmap", tags=["roadmap"])
supabase = get_supabase_admin()

# ======================
# Helpers for persistence (USING user_roadmap TABLE)
# ======================

def _get_saved_roadmap(supabase, user_id: str, target_role: str):
    return (
        supabase.table("user_roadmap")
        .select("roadmap_json")
        .eq("user_id", user_id)
        .eq("target_role", target_role)
        .limit(1)
        .execute()
    )

def _save_roadmap(supabase, user_id: str, target_role: str, roadmap_dict: dict):
    payload = {
        "user_id": user_id,
        "target_role": target_role,
        "roadmap_json": roadmap_dict,
        "updated_at": datetime.utcnow().isoformat(),
    }

    return (
        supabase.table("user_roadmap")
        .upsert(payload, on_conflict="user_id,target_role")
        .execute()
    )


# ======================
# Roadmap generator
# ======================

def _generate_roadmap():
    return {
        "target_role": "Junior Frontend Developer",
        "phases": [
            {
                "phase": "Phase 1: Foundations",
                "description": "Build strong fundamentals in web development.",
                "items": [
                    {
                        "title": "HTML & CSS Basics",
                        "type": "course",
                        "estimated_weeks": 2,
                        "why": "You need solid layout and styling skills."
                    },
                    {
                        "title": "JavaScript Fundamentals",
                        "type": "course",
                        "estimated_weeks": 3,
                        "why": "JS is core to frontend logic."
                    }
                ]
            },
            {
                "phase": "Phase 2: React",
                "description": "Learn modern frontend development with React.",
                "items": [
                    {
                        "title": "React Basics",
                        "type": "course",
                        "estimated_weeks": 3,
                        "why": "React is industry standard."
                    },
                    {
                        "title": "Build a small React app",
                        "type": "project",
                        "estimated_weeks": 2,
                        "why": "Projects prove your skills."
                    }
                ]
            }
        ]
    }


# ======================
# Routes
# ======================

@router.get("")
def get_roadmap(current_user=Depends(get_current_user)):
    user_id = current_user["id"]
    target_role = "Junior Frontend Developer"

    saved = _get_saved_roadmap(supabase, user_id, target_role)

    if saved.data and len(saved.data) > 0:
        roadmap_data = saved.data[0]["roadmap_json"]
    else:
        roadmap_data = _generate_roadmap()
        _save_roadmap(supabase, user_id, target_role, roadmap_data)

    return roadmap_data


@router.get("/completed")
def get_completed(current_user=Depends(get_current_user)):
    user_id = current_user["id"]

    rows = (
        supabase.table("roadmap_progress")
        .select("task_title")
        .eq("user_id", user_id)
        .execute()
    )

    return {"completed": [r["task_title"] for r in rows.data]}


@router.post("/generate")
def generate_roadmap(current_user=Depends(get_current_user)):
    return get_roadmap(current_user)


@router.post("/complete")
def complete_task(body: CompleteTaskRequest, current_user=Depends(get_current_user)):
    title = body.title
    user_id = current_user["id"]

    if not title:
        raise HTTPException(status_code=400, detail="Task title is required")

    existing = (
        supabase.table("roadmap_progress")
        .select("*")
        .eq("user_id", user_id)
        .eq("task_title", title)
        .execute()
    )

    if existing.data:
        (
            supabase.table("roadmap_progress")
            .delete()
            .eq("user_id", user_id)
            .eq("task_title", title)
            .execute()
        )
    else:
        supabase.table("roadmap_progress").insert({
            "user_id": user_id,
            "task_title": title,
            "completed": True
        }).execute()

    rows = (
        supabase.table("roadmap_progress")
        .select("task_title")
        .eq("user_id", user_id)
        .execute()
    )

    return {"completed": [r["task_title"] for r in rows.data]}
