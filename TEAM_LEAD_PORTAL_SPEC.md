# FibreGems CRM — Team Lead & Supervisor Portal Specification
> **Target Audience:** Lovable / Bolt / Frontend Development Team  
> **Backend Integration:** FastAPI (`FibreGemsAPI` @ `http://127.0.0.1:8000/api/v1`) & PostgreSQL  
> **Telephony Engine:** Asterisk PBX / VICIdial (100% Headless via REST API)  
> **Design Theme:** Premium Dark Mode (`#111111` / `#1a1a1a`), Accent Gold (`#F5B021`), Accent Coral (`#D44B2E`), Accent Emerald (`#22C55E`), Tailwind CSS + Lucide Icons + Shadcn UI.

---

## 1. Executive Summary & Objective

The objective is to introduce a dedicated **Team Lead (Supervisor) Portal** inside the FibreGems React CRM (`c:\Users\User\Downloads\Fibre_gems_crm`). 

**Core Requirement:** Team leads and supervisors must **never** access or log into the legacy VICIdial admin screen (`/vicidial/realtime_report.php` or `/vicidial/admin.php`). All supervisory capabilities—including real-time agent monitoring, audio ChanSpy (Listen, Whisper, Barge), call recording quality assurance (QA), and callback reassignments—must be rendered natively and seamlessly inside the FibreGems CRM.

---

## 2. User Roles & Access Control

### Role Structure
* `agent`: Daily sales/support workspace (Kanban pipeline, click-to-dial, personal callbacks).
* `team_lead`: Floor supervisor workspace (Live Agent Grid, Audio Spying/Coaching, QA Review, Callback Manager).
* `admin`: Executive/IT workspace (Campaign settings, List uploading, Carrier SIP trunk provisioning).

### Navigation & View Switcher
When a user with `role === "team_lead"` or `role === "admin"` logs in:
* Top header displays a View Switcher or segmented control:
  `[ 👤 Agent View ]` `[ 🛡️ Team Lead Floor ]` `[ ⚙️ System Admin (if admin) ]`
* Team leads can switch to Agent View if they need to handle calls themselves, but default to the **Team Lead Floor**.

---

## 3. Team Lead Portal Architecture & Modules

The Team Lead Portal consists of 4 primary views accessible via tab navigation:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  FibreGems CRM — SUPERVISOR COMMAND CENTRE                                   │
│  [ 📡 Live Floor Monitor ]  [ 🎙️ Call Recordings & QA ]  [ 📋 Callback Pool ]│
├──────────────────────────────────────────────────────────────────────────────┤
│  Top Metrics: Active Agents: 8 | In Call: 5 | Paused: 2 | Waiting: 1        │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

### Module 1: Live Floor Monitor (`/team-lead/floor`)

Real-time grid showing every agent currently logged into the shift.

#### Top Metric Summary Bar:
* **Total Logged-In Agents:** (e.g. `12`)
* **Live In Call:** `6` (Emerald Badge)
* **Waiting / Ready:** `4` (Blue Badge)
* **On Pause / Break:** `2` (Amber Badge)
* **Total Calls Handled Today:** `142`
* **Sales Today:** `28`

#### Agent Live Card Grid:
Each agent card displays:
1. **Agent Header:**
   - Avatar / initials, Full Name (e.g. "Mukona T."), Extension (`102`).
   - Live Status Badge:
     - `INCALL` (Green pulse badge: `#22C55E`)
     - `READY` (Cyan badge: `#06B6D4`)
     - `PAUSED` (Amber badge: `#F5B021`, displaying reason e.g. "Lunch" or "Tea")
     - `DEAD` (Red badge: `#EF4444`, customer hung up, agent finalizing dispo)
2. **State Timer:**
   - Real-time elapsed duration counter (`04:32`).
   - Visual Alert: If in `PAUSED` for > 15 minutes or `INCALL` > 25 minutes, the timer pulses red with a warning icon.
3. **Active Call Context (when `INCALL`):**
   - Customer Full Name & Masked Phone (e.g. `Thabo M. · 084 284 ****`).
   - Campaign Name: `Fibre Outbound 1001`.
4. **Supervisory Action Toolbar (Audio Supervision & Remote Controls):**
   * **🎧 Listen (Silent ChanSpy):**
     - Team lead's softphone silently dials into the agent's channel. Neither agent nor customer hears the supervisor.
   * **🗣️ Whisper (Coach):**
     - Team lead's voice is injected *only* into the agent's ear. Customer cannot hear supervisor.
   * **🤝 Barge (3-Way Conference):**
     - Supervisor joins as a full speaker. All 3 parties hear each other to assist closing a deal or de-escalating.
   * **⏸️ Force Pause:**
     - Supervisor remotely pauses an agent who walked away.
   * **⏹️ Force Hangup:**
     - Terminate a stuck call channel.

---

### Module 2: Call Recordings & Quality Assurance (QA) (`/team-lead/recordings`)

A dedicated audio review center replacing VICIdial user stats and raw audio FTP directories.

#### Features:
1. **Search & Filter Controls:**
   - Date range (Today, Yesterday, Last 7 Days, Custom Date Picker).
   - Agent dropdown selector.
   - Outcome/Disposition filter (Sale, Callback, Not Interested, DNC).
   - Min/Max call duration (e.g. filter out calls < 30 seconds).
2. **Recordings Table:**
   - Columns: Date/Time, Agent Name, Customer Name, Phone, Duration, Disposition, Audio Player, QA Status (`Pending` | `Graded`), Actions.
3. **In-Browser Audio Player Component:**
   - Waveform progress bar with scrubber.
   - Play / Pause, Skip +/- 10 seconds.
   - Playback Speed Toggle: `1x`, `1.25x`, `1.5x`, `2x`.
   - Download MP3 button.
4. **QA Evaluation Drawer (Side Sheet):**
   When clicking "Grade Call", opens a slide-over panel:
   - **Rubric Criteria (1 to 5 Stars or Yes/No):**
     - Professional Greeting & Verification (Yes/No)
     - Product Knowledge & Speed Pitch (1-5 Stars)
     - Objection Handling & Tone (1-5 Stars)
     - Compliance & Disclosures Read (Yes/No)
     - Closing / Clear Next Steps (1-5 Stars)
   - **Supervisor Notes & Feedback:** Rich text or textarea.
   - **Overall Score:** Automatically calculated percentage (e.g. `92%`).
   - **Button:** `[ Submit Evaluation ]` (saves to Postgres and notifies agent).

---

### Module 3: Team Callback Redistribution Pool (`/team-lead/callbacks`)

Allows team leads to view all scheduled callbacks across the entire sales floor and reassign overdue callbacks.

#### Features:
* Tabs: `Overdue Callbacks`, `Due Today`, `Upcoming`.
* Table showing Customer Name, Contact Number, Suburb, Original Agent, Scheduled Date/Time, Notes.
* **Bulk Reassign Modal:**
  - Select 1 or multiple callbacks &rarr; Click **"Reassign Selected"** &rarr; Select target active agent &rarr; Confirm.
  - Instantly updates customer owner in PostgreSQL and moves the callback into the new agent's daily worklist.

---

## 4. API Endpoints Contract (FastAPI REMI Backend)

The backend (`FibreGemsAPI`) exposes these endpoints for the Team Lead Portal. Lovable/Bolt should integrate with these exact paths:

### 1. Live Floor Monitoring
* `GET /api/v1/supervisor/agents/live`
  - **Auth:** Bearer Token (Role: `team_lead` or `admin`)
  - **Response:**
    ```json
    {
      "summary": {
        "total_logged_in": 8,
        "in_call": 4,
        "ready": 2,
        "paused": 2
      },
      "agents": [
        {
          "agent_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
          "agent_code": "Mukona_T",
          "full_name": "Mukona Tshifhiwa",
          "extension": "gs102",
          "session_id": "8600051",
          "status": "INCALL",
          "sub_status": "LIVE",
          "seconds_in_state": 184,
          "pause_code": null,
          "campaign_id": "1001",
          "active_customer": {
            "customer_id": "e3b0c442-98fc-1c14-9af0-2b0d7b3dcb6d",
            "full_name": "Sipho Khumalo",
            "phone": "0842840069",
            "suburb": "Soweto"
          }
        }
      ]
    }
    ```

### 2. Audio Supervision (Listen / Whisper / Barge)
* `POST /api/v1/supervisor/monitor`
  - **Payload:**
    ```json
    {
      "target_agent_extension": "gs102",
      "supervisor_extension": "101",
      "mode": "LISTEN" // Options: "LISTEN" (ChanSpy silent) | "WHISPER" (ChanSpy coach) | "BARGE" (Conference join)
    }
    ```
  - **Response:**
    ```json
    {
      "success": true,
      "message": "Supervision channel dispatched to extension 101 in LISTEN mode",
      "target_agent": "gs102"
    }
    ```

### 3. Remote Agent Control
* `POST /api/v1/supervisor/agents/{agent_code}/pause`
  - **Payload:** `{"pause_code": "SUPERVISOR_BREAK"}`
* `POST /api/v1/supervisor/agents/{agent_code}/hangup`
  - **Payload:** `{"reason": "Supervisor terminated stuck call"}`

### 4. Call Recordings & QA
* `GET /api/v1/supervisor/recordings?agent_id=...&disposition=...&date_from=...&date_to=...`
  - **Response:**
    ```json
    {
      "total": 5,
      "recordings": [
        {
          "id": "c71a3964-6d9b-4e1a-85d0-9a4f652b1234",
          "agent_name": "Mukona Tshifhiwa",
          "customer_name": "Lerato Ndlovu",
          "customer_phone": "0823456789",
          "disposition": "SALE",
          "duration_seconds": 245,
          "recorded_at": "2026-11-12T10:15:00Z",
          "recording_url": "http://10.0.0.132/RECORDINGS/MP3/20261110-212526_842840069_fg_api-all.mp3",
          "qa_status": "pending",
          "qa_evaluation": null
        }
      ]
    }
    ```
* `POST /api/v1/supervisor/recordings/{recording_id}/evaluate`
  - **Payload:**
    ```json
    {
      "greeting_score": 5,
      "pitch_score": 4,
      "objection_handling_score": 5,
      "compliance_verified": true,
      "closing_score": 4,
      "feedback_notes": "Very confident delivery, good pace."
    }
    ```

### 5. Agent Leaderboard & Shift Performance Stats
* `GET /api/v1/supervisor/stats/agents?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD`
  - **Response:**
    ```json
    {
      "period": { "from": "2026-11-12", "to": "2026-11-12" },
      "agents_count": 2,
      "leaderboard": [
        {
          "agent_id": "cc2d8f72-6728-4289-a765-ab4f26943801",
          "agent_code": "AGT286",
          "full_name": "MUKONA",
          "total_dials": 21,
          "answers_count": 14,
          "sales_count": 3,
          "conversion_rate_pct": 14.3,
          "talk_time_seconds": 3840,
          "talk_time_formatted": "01:04:00",
          "avg_qa_score": 92.5
        }
      ]
    }
    ```

---

## 5. UI / UX Design & Component Guidelines

1. **Styling Tokens:**
   - Cards: `bg-[#121212]/95 border border-white/10 rounded-2xl backdrop-blur-xl`
   - In-Call Indicator: Emerald border and badge with `animate-pulse` or radar ping.
   - High Pause Warning: Amber glow `border-[#F5B021]/50 bg-[#F5B021]/10`.
2. **Real-Time Polling / TanStack Query:**
   - In `LiveFloorMonitor.tsx`:
     Set `refetchInterval: 2000` (poll every 2 seconds) for smooth, live floor movement without manual page refreshes.
3. **Empty States & Skeletons:**
   - Render pulsing skeleton cards while live floor data loads.
   - Clean empty state illustrations if no recordings match the filter.
4. **Toast Feedback (Sonner):**
   - When clicking **Listen**: *"🎧 Connecting silent monitor on your extension 101..."*
   - When clicking **Force Pause**: *"⏸️ Agent Mukona T. has been remotely paused."*

---

## 6. Directory Structure in Frontend

Please create the components under `src/components/team-lead/`:
```
src/components/team-lead/
├── TeamLeadWorkspace.tsx        # Main container with tab switcher
├── LiveFloorMonitor.tsx         # Real-time agent card grid
├── AgentStatusCard.tsx          # Single agent status card with Listen/Barge buttons
├── RecordingsQAView.tsx         # Recordings table with filter controls
├── AudioWaveformPlayer.tsx      # Audio player with speed controls & scrub
├── QAEvaluationDrawer.tsx       # Grading rubric slide-over
└── CallbackPoolView.tsx         # Callback pool & bulk reassign
```

