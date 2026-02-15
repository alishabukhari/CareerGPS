from fastapi import APIRouter, Depends, HTTPException
from app.auth.deps import get_current_user
from app.utils.supabase_client import get_supabase_admin
from pydantic import BaseModel
from datetime import datetime
import json

class CompleteTaskRequest(BaseModel):
    title: str

router = APIRouter(prefix="/roadmap", tags=["roadmap"])
supabase = get_supabase_admin()

TARGET_ROLE = "Junior Frontend Developer"

# ======================
# Helpers
# ======================

def _get_saved_roadmap(user_id: str):
    return (
        supabase.table("user_roadmap")
        .select("roadmap_json")
        .eq("user_id", user_id)
        .eq("target_role", TARGET_ROLE)
        .limit(1)
        .execute()
    )

def _save_roadmap(user_id: str, roadmap_dict: dict):
    payload = {
        "user_id": user_id,
        "target_role": TARGET_ROLE,
        "roadmap_json": roadmap_dict,
        "updated_at": datetime.utcnow().isoformat(),
    }

    return (
        supabase.table("user_roadmap")
        .upsert(payload, on_conflict="user_id,target_role")
        .execute()
    )

def generate_ai_explanation(title: str):
    return f"This is an AI-generated explanation for {title}. You will replace this with OpenAI later."

def _generate_roadmap():
    return {
        "target_role": TARGET_ROLE,
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

    saved = _get_saved_roadmap(user_id)

    if saved.data:
        roadmap_data = saved.data[0]["roadmap_json"]
        if isinstance(roadmap_data, str):
            roadmap_data = json.loads(roadmap_data)
    else:
        roadmap_data = _generate_roadmap()
        _save_roadmap(user_id, roadmap_data)

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


@router.get("/stats")
def get_stats(current_user=Depends(get_current_user)):
    user_id = current_user["id"]

    try:
        saved = _get_saved_roadmap(user_id)
        if not saved.data:
            return {"total": 0, "completed": 0, "percent": 0}

        roadmap = saved.data[0]["roadmap_json"]
        if isinstance(roadmap, str):
            roadmap = json.loads(roadmap)

        all_items = [item["title"] for phase in roadmap["phases"] for item in phase["items"]]
        total = len(all_items)

        rows = (
            supabase.table("roadmap_progress")
            .select("task_title")
            .eq("user_id", user_id)
            .execute()
        )

        completed_titles = [r["task_title"] for r in rows.data]
        completed_count = len(set(completed_titles) & set(all_items))

        percent = int((completed_count / total) * 100) if total > 0 else 0

        return {"total": total, "completed": completed_count, "percent": percent}

    except Exception as e:
        print("❌ Stats error:", e)
        return {"total": 0, "completed": 0, "percent": 0}


@router.get("/today")
def get_today_focus(current_user=Depends(get_current_user)):
    user_id = current_user["id"]

    try:
        saved = _get_saved_roadmap(user_id)
        if not saved.data:
            return {"task": None}

        roadmap = saved.data[0]["roadmap_json"]
        if isinstance(roadmap, str):
            roadmap = json.loads(roadmap)

        rows = (
            supabase.table("roadmap_progress")
            .select("task_title")
            .eq("user_id", user_id)
            .execute()
        )

        completed_titles = set([r["task_title"] for r in rows.data])

        for phase in roadmap["phases"]:
            for item in phase["items"]:
                if item["title"] not in completed_titles:
                    return {
                        "title": item["title"],
                        "phase": phase["phase"],
                        "why": item["why"],
                        "type": item["type"],
                        "estimated_weeks": item["estimated_weeks"],
                    }

        return {"task": None}

    except Exception as e:
        print("❌ Today focus error:", e)
        return {"task": None}


@router.get("/topic")
def get_topic_detail(title: str, current_user=Depends(get_current_user)):
    user_id = current_user["id"]
    clean_title = title.strip().lower()

    saved = _get_saved_roadmap(user_id)
    if not saved.data:
        raise HTTPException(status_code=404, detail="Roadmap not found")

    roadmap = saved.data[0]["roadmap_json"]
    if isinstance(roadmap, str):
        roadmap = json.loads(roadmap)

    for phase in roadmap["phases"]:
        for item in phase["items"]:
            if item["title"].strip().lower() == clean_title:
                return {
                    "title": item["title"],
                    "phase": phase["phase"],
                    "why": item.get("why", ""),
                    "estimated_weeks": item["estimated_weeks"],
                    "explanation": generate_ai_explanation(item["title"]),
                    "checklist": [
                        f"Read about {item['title']}",
                        f"Build a small demo using {item['title']}",
                        f"Write notes on {item['title']}",
                    ],
                }

    raise HTTPException(status_code=404, detail="Topic not found")


@router.get("/topic/next")
def get_next_topic(title: str, current_user=Depends(get_current_user)):
    user_id = current_user["id"]

    saved = _get_saved_roadmap(user_id)
    if not saved.data:
        raise HTTPException(status_code=404, detail="Roadmap not found")

    roadmap = saved.data[0]["roadmap_json"]
    if isinstance(roadmap, str):
        roadmap = json.loads(roadmap)

    flat = [{"title": item["title"], "phase": phase["phase"]} for phase in roadmap["phases"] for item in phase["items"]]

    titles = [t["title"].lower() for t in flat]
    current = title.lower()

    if current not in titles:
        raise HTTPException(status_code=404, detail="Current topic not found")

    idx = titles.index(current)

    if idx + 1 >= len(flat):
        return {"next": None}

    return {"next": flat[idx + 1]}


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
        supabase.table("roadmap_progress").delete().eq("user_id", user_id).eq("task_title", title).execute()
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