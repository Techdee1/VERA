# VERA Frontend Integration Summary

## Backend URL Updated

**Production Backend:** `https://vera-c5ccs.ondigitalocean.app/api/v1`

### Environment Files Created
- `.env` - Production backend URL
- `.env.example` - Local development template

---

## New API Modules Added

### 1. Jobs API (`src/api/jobs.js`)
```javascript
jobsApi.getById(jobId)
```
- Track ingestion job status
- Auto-polling for queued/processing jobs

### 2. Responsible AI API (`src/api/responsibleAi.js`)
```javascript
responsibleAiApi.getMetrics()
```
- Get AI model transparency metrics
- False positive rates
- Model features and contamination

### 3. API Index (`src/api/index.js`)
- Centralized exports for all API modules

---

## Updated API Modules

### STR API (`src/api/str.js`)
**Updated methods:**
- `generate()` - Added `reporting_period_start` and `reporting_period_end` parameters
- `updateDecision()` - Changed from PATCH to POST, added `reviewer_notes`
- `file()` - New method to file approved STRs with Squad

**New signature:**
```javascript
strApi.generate(alertId, reportingPeriodStart, reportingPeriodEnd, reviewerNotes)
strApi.updateDecision(id, decision, reviewerNotes)
strApi.file(id) // Triggers Squad payment
```

---

## New React Hooks

### 1. `useResponsibleAi.js`
```javascript
const { data: metrics } = useResponsibleAiMetrics()
```
- Fetches AI transparency metrics
- 5-minute cache
- Returns: false_positive_rate, alerts_raised_total, model_feature_list, etc.

### 2. `useJobs.js`
```javascript
const { data: job } = useJob(jobId)
```
- Tracks job status with auto-polling
- Polls every 2 seconds while processing
- Stops polling when completed/failed

---

## New Components

### 1. ResponsibleAiMetrics (`src/components/ai/ResponsibleAiMetrics.jsx`)
**Features:**
- Displays false positive rate
- Shows alerts raised/reviewed
- Model contamination progress bar
- Model feature badges
- Training data size

**Usage:**
```jsx
import { ResponsibleAiMetrics } from '../components/ai/ResponsibleAiMetrics'

<ResponsibleAiMetrics />
```

### 2. JobStatus (`src/components/jobs/JobStatus.jsx`)
**Features:**
- Real-time job status tracking
- Progress bar for processing jobs
- Status icons (queued, processing, completed, failed)
- Error message display

**Usage:**
```jsx
import { JobStatus } from '../components/jobs/JobStatus'

<JobStatus jobId={jobId} />
```

---

## Integration Points for Frontend Dev

### 1. Dashboard Page
Add Responsible AI metrics card:
```jsx
import { ResponsibleAiMetrics } from '../components/ai/ResponsibleAiMetrics'

// In Dashboard.jsx
<ResponsibleAiMetrics />
```

### 2. Transaction Ingestion
Show job status after ingestion:
```jsx
import { JobStatus } from '../components/jobs/JobStatus'

// After transaction ingestion
const response = await transactionsApi.ingest(data)
<JobStatus jobId={response.job_id} />
```

### 3. STR Generation
Update to include reporting period:
```jsx
const str = await strApi.generate(
  alertId,
  '2024-01-01',  // reporting_period_start
  '2024-12-31',  // reporting_period_end
  reviewerNotes
)
```

### 4. STR Filing (Squad Integration)
Add file button for approved STRs:
```jsx
const handleFile = async (strId) => {
  try {
    const result = await strApi.file(strId)
    // result contains squad_transaction_ref
    toast.success('STR filed successfully')
  } catch (error) {
    toast.error('Failed to file STR')
  }
}
```

### 5. Settings/Admin Page
Add AI metrics section:
```jsx
import { ResponsibleAiMetrics } from '../components/ai/ResponsibleAiMetrics'

// In Settings.jsx or new AI Metrics page
<section>
  <h2>AI Model Transparency</h2>
  <ResponsibleAiMetrics />
</section>
```

---

## Backend Endpoints Available

### New Endpoints
- `GET /api/v1/jobs/{job_id}` - Job status
- `GET /api/v1/responsible-ai/metrics` - AI metrics
- `POST /api/v1/str/{id}/file` - File STR with Squad
- `POST /api/v1/webhooks/squad` - Squad webhook (backend only)

### Updated Endpoints
- `POST /api/v1/str/generate` - Now accepts reporting_period_start/end
- `POST /api/v1/str/{id}/decision` - Changed from PATCH to POST

---

## Testing the Integration

### 1. Test Backend Connection
```bash
# In vera-frontend directory
npm run dev

# Should connect to https://vera-c5ccs.ondigitalocean.app/api/v1
```

### 2. Test API Calls
```javascript
// In browser console
import { responsibleAiApi } from './api'

const metrics = await responsibleAiApi.getMetrics()
console.log(metrics)
```

### 3. Test Components
```jsx
// Add to any page temporarily
import { ResponsibleAiMetrics } from '../components/ai/ResponsibleAiMetrics'

<ResponsibleAiMetrics />
```

---

## Environment Variables

### Development
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### Production (Current)
```env
VITE_API_BASE_URL=https://vera-c5ccs.ondigitalocean.app/api/v1
```

---

## Next Steps for Frontend Dev

1. **Add ResponsibleAiMetrics to Dashboard**
   - Place in a new card on the dashboard
   - Shows AI transparency to compliance officers

2. **Update STR Generation Form**
   - Add date pickers for reporting period
   - Update API call to include dates

3. **Add STR Filing Button**
   - Show "File with Squad" button for approved STRs
   - Disable if not approved
   - Show success message with transaction reference

4. **Add Job Status to Transaction Ingestion**
   - Show progress after bulk upload
   - Display completion status

5. **Create AI Metrics Page (Optional)**
   - Dedicated page for model transparency
   - Historical metrics charts
   - Feature importance visualization

6. **Update STR Decision Flow**
   - Change from PATCH to POST
   - Add reviewer notes field

---

## Files Modified/Created

### Created
- `vera-frontend/.env`
- `vera-frontend/.env.example`
- `vera-frontend/src/api/jobs.js`
- `vera-frontend/src/api/responsibleAi.js`
- `vera-frontend/src/api/index.js`
- `vera-frontend/src/hooks/useResponsibleAi.js`
- `vera-frontend/src/hooks/useJobs.js`
- `vera-frontend/src/components/ai/ResponsibleAiMetrics.jsx`
- `vera-frontend/src/components/jobs/JobStatus.jsx`

### Modified
- `vera-frontend/src/api/str.js` - Updated methods and signatures

---

## Notes for Frontend Dev

- All API modules use React Query for caching and auto-refetch
- Job status component auto-polls while processing
- ResponsibleAiMetrics component is fully styled and ready to use
- STR filing requires Squad credentials to be configured (pending)
- All components use existing UI components (Card, Badge, Spinner, etc.)
- No breaking changes to existing API calls
- Backend is live and seeded with 500 entities, 2000 transactions, 3 alerts

---

## Support

Backend API Documentation: https://vera-c5ccs.ondigitalocean.app/docs

For questions about:
- API endpoints → Check Swagger docs
- Component usage → See component files for props
- Integration issues → Test with curl first to isolate frontend vs backend
