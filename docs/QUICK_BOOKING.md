# Quick Booking Feature - Developer Documentation

## Overview

The Quick Booking feature enables users to go from describing their symptoms to having a confirmed appointment in **under 2 minutes**. This streamlined flow combines AI-powered symptom analysis, intelligent provider matching, and instant slot selection into a single, seamless experience.

---

## Quick Reference

### Key Files

**Backend:**
- `api/app/controllers/quick_booking_controller.rb` - Main controller with 2 endpoints

**Frontend:**
- `base/app/(protected)/quick-booking/page.tsx` - Multi-step wizard page
- `base/lib/api.ts` - API functions (added)
- `base/components/patient-sidebar.tsx` - Navigation (modified)
- `base/components/hero.tsx` - Landing page CTA (modified)

**Routes:**
- `POST /quick-booking/analyze` - Analyze symptoms and get providers
- `POST /quick-booking/book` - Book appointment

---

## User Flow

### Complete Journey (60-120 seconds)

```
Landing Page → Click "⚡ Book in Under 2 Minutes"
    ↓
Step 1: Symptoms (15-30s)
    ↓ Enter symptoms (min 10 chars)
    ↓ Click "Analyze & Find Providers"
    ↓
Step 2: Providers (15-30s)
    ← AI Analysis displayed
    ← Top 5 providers shown with next slots
    ↓ Click on a provider card
    ↓
Step 3: Slots (15-30s)
    ← Next 3 available slots shown
    ↓ Click on a time slot
    ↓
Step 4: Confirm (10-15s)
    ← Review all details
    ↓ Click "Confirm Booking"
    ↓
Step 5: Success (5s)
    ← Confirmation displayed
    ← Email sent
    ↓ View Appointments or Book Another
```

### Visual Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│                   LANDING PAGE                      │
│  [⚡ Book in Under 2 Minutes]  [Browse Providers]  │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│         QUICK BOOKING - STEP 1: SYMPTOMS           │
│  Progress: [●]──[○]──[○]──[○]                      │
│                                                     │
│  Describe Your Symptoms:                           │
│  ┌───────────────────────────────────────┐        │
│  │ I've had a persistent headache for    │        │
│  │ 3 days, feel dizzy...                 │        │
│  └───────────────────────────────────────┘        │
│  45 characters (minimum 10) ✓                      │
│           [Analyze & Find Providers →]             │
└────────────────────┬────────────────────────────────┘
                     │ AI Processing (5-10s)
                     ▼
┌─────────────────────────────────────────────────────┐
│       QUICK BOOKING - STEP 2: PROVIDERS            │
│  Progress: [✓]──[●]──[○]──[○]                      │
│                                                     │
│  AI Analysis:                                      │
│  ┌───────────────────────────────────────┐        │
│  │ Recommended: Neurologist              │        │
│  │ Urgency: 🟠 Urgent (24-48 hours)     │        │
│  └───────────────────────────────────────┘        │
│                                                     │
│  ┌─────────────────────────────────────┐          │
│  │ [Dr] Dr. Sarah Johnson              │          │
│  │      Neurology          $200/hr     │          │
│  │      ⭐ 4.9  📍 New York, NY        │          │
│  │      Next: Mon, Nov 18              │          │
│  └─────────────────────────────────────┘          │
└────────────────────┬────────────────────────────────┘
                     │ Click Provider
                     ▼
┌─────────────────────────────────────────────────────┐
│       QUICK BOOKING - STEP 3: TIME SLOTS           │
│  Progress: [✓]──[✓]──[●]──[○]                      │
│                                                     │
│  ← Back to Providers                               │
│                                                     │
│  ┌──────────────────┐  ┌──────────────────┐       │
│  │ 📅 Mon, Nov 18   │  │ 📅 Tue, Nov 19   │       │
│  │ 🕐 9:00-10:00 AM │  │ 🕐 2:00-3:00 PM  │       │
│  └──────────────────┘  └──────────────────┘       │
└────────────────────┬────────────────────────────────┘
                     │ Click Slot
                     ▼
┌─────────────────────────────────────────────────────┐
│      QUICK BOOKING - STEP 4: CONFIRMATION          │
│  Progress: [✓]──[✓]──[✓]──[●]                      │
│                                                     │
│  Confirm Your Appointment:                         │
│  Provider: Dr. Sarah Johnson (Neurology)           │
│  Date: Monday, November 18, 2025                   │
│  Time: 9:00 AM - 10:00 AM                          │
│  Symptoms: [your description]                      │
│                                                     │
│       [Back]         [Confirm Booking ✓]           │
└────────────────────┬────────────────────────────────┘
                     │ API Call (1-2s)
                     ▼
┌─────────────────────────────────────────────────────┐
│       QUICK BOOKING - STEP 5: SUCCESS              │
│  Progress: [✓]──[✓]──[✓]──[✓]                      │
│                                                     │
│              ✓ Appointment Booked! 🎉              │
│                                                     │
│  [View Appointments]  [Book Another Appointment]   │
└─────────────────────────────────────────────────────┘
```

---

## Technical Architecture

### Data Flow

```
User Input (Symptoms)
    ↓
[Frontend Validation]
    ↓
API: POST /quick-booking/analyze
    ↓
[Backend Processing]
    ├─ SymptomAnalyzerService (OpenAI)
    ├─ Provider.where(specialty: ...)
    └─ SlotGeneratorService
    ↓
Response: { analysis, providers, slots }
    ↓
[Frontend Display]
    ├─ Show AI analysis
    ├─ Show provider cards
    └─ Show available slots
    ↓
User Selection (Provider + Slot)
    ↓
API: POST /quick-booking/book
    ↓
[Backend Processing]
    ├─ Validate availability
    ├─ Create appointment
    └─ Send notifications
    ↓
Response: { success, appointment }
    ↓
[Frontend Display: Success]
```

### State Machine

```
┌──────────┐
│ Symptoms │ ← Initial State
└────┬─────┘
     │ validate & analyze
     ├─ error → stay
     └─ success ↓
     
┌──────────┐
│Providers │
└────┬─────┘
     │ select provider
     ├─ back → Symptoms
     └─ success ↓
     
┌──────────┐
│  Slots   │
└────┬─────┘
     │ select slot
     ├─ back → Providers
     └─ success ↓
     
┌──────────┐
│ Confirm  │
└────┬─────┘
     │ confirm booking
     ├─ back → Slots
     ├─ error → stay
     └─ success ↓
     
┌──────────┐
│ Success  │ ← Terminal State
└────┬─────┘
     │
     ├─ view appointments → /appointments
     └─ book another → reset to Symptoms
```

---

## API Documentation

### POST `/quick-booking/analyze`

**Purpose:** Analyze symptoms and return matched providers with available slots

**Authentication:** Not required (public endpoint for marketing)

**Request Body:**
```json
{
  "description": "I've had a persistent headache for 3 days and feel dizzy"
}
```

**Validation:**
- `description` must be at least 10 characters

**Response (200 OK):**
```json
{
  "analysis": {
    "specialty": "primary_care",
    "specialty_name": "Primary Care",
    "urgency": "routine",
    "urgency_details": {
      "priority": 1,
      "color": "green",
      "message": "Schedule within 1-2 weeks"
    },
    "reasoning": "Based on your symptoms...",
    "keywords": ["headache", "dizziness"],
    "red_flags": []
  },
  "providers": [
    {
      "id": 1,
      "name": "Dr. Sarah Johnson",
      "specialty": "Primary Care",
      "avatar_url": "https://...",
      "rating": 4.8,
      "location": "New York, NY",
      "hourly_rate": 150,
      "next_available_slots": [
        {
          "start_time": "2025-11-18T09:00:00Z",
          "end_time": "2025-11-18T10:00:00Z",
          "date": "2025-11-18",
          "time": "9:00 AM"
        }
      ]
    }
  ],
  "total_providers": 5
}
```

**Error Responses:**
```json
// 422 Unprocessable Entity
{
  "error": "Description must be at least 10 characters"
}

// 500 Internal Server Error
{
  "error": "Failed to analyze symptoms"
}
```

### POST `/quick-booking/book`

**Purpose:** Book an appointment

**Authentication:** Required (JWT token)

**Request Body:**
```json
{
  "provider_id": 1,
  "start_time": "2025-11-18T09:00:00Z",
  "end_time": "2025-11-18T10:00:00Z",
  "notes": "I've had a persistent headache for 3 days..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Appointment booked successfully!",
  "appointment": {
    "id": 123,
    "patient_id": 456,
    "provider_id": 1,
    "start_time": "2025-11-18T09:00:00Z",
    "end_time": "2025-11-18T10:00:00Z",
    "status": "confirmed",
    "notes": "...",
    "provider": {
      "id": 1,
      "name": "Dr. Sarah Johnson",
      "specialty": "Primary Care",
      "avatar_url": "...",
      "location": "New York, NY",
      "hourly_rate": 150
    }
  }
}
```

**Error Responses:**
```json
// 401 Unauthorized
{
  "error": "Authentication required"
}

// 422 Unprocessable Entity
{
  "error": "Time slot no longer available"
}

// 500 Internal Server Error
{
  "error": "Failed to create appointment"
}
```

---

## Backend Implementation

### QuickBookingController

**Key Services:**
1. **SymptomAnalyzerService** - OpenAI GPT-4o-mini integration
   - Analyzes symptoms and recommends specialty
   - Determines urgency level
   - Caches results for 7 days

2. **SlotGeneratorService** - Generates available time slots
   - Based on provider availability
   - Excludes blocked slots and existing appointments
   - Configurable days ahead (default: 7 days)

3. **NotificationService** - Email notifications
   - Sends booking confirmations asynchronously

**Specialty Mapping:**
```ruby
SPECIALTY_MAPPINGS = {
  'primary_care' => 'Primary Care',
  'cardiology' => 'Cardiology',
  'dermatology' => 'Dermatology',
  'neurology' => 'Neurology',
  'orthopedics' => 'Orthopedics',
  'pediatrics' => 'Pediatrics',
  'psychiatry' => 'Psychiatry'
}
```

---

## Frontend Implementation

### Quick Booking Page (`/base/app/(protected)/quick-booking/page.tsx`)

**State Management:**
```typescript
// Navigation
currentStep: 'symptoms' | 'providers' | 'slots' | 'confirm' | 'success'

// Form Data
description: string              // Symptom description
analysis: SymptomAnalysis        // AI analysis result
providers: Provider[]            // Matched providers with slots
selectedProvider: Provider       // User's choice
selectedSlot: TimeSlot          // User's choice
appointmentId: number           // Result ID

// UI State
loading: boolean                // Loading indicator
error: string                  // Error message
```

**Component Structure:**
```
QuickBookingPage
├── Progress Stepper (4 visual steps)
├── Error Display
└── Step Content
    ├── Step 1: Symptoms
    │   ├── Textarea (min 10 chars)
    │   └── Analyze Button
    ├── Step 2: Providers
    │   ├── AI Analysis Summary
    │   └── Provider Cards (clickable)
    ├── Step 3: Slots
    │   └── Time Slot Cards (clickable)
    ├── Step 4: Confirm
    │   ├── Provider Info
    │   ├── Date/Time Info
    │   ├── Symptom Summary
    │   └── Confirm/Back Buttons
    └── Step 5: Success
        ├── Success Icon
        ├── Confirmation Message
        └── Action Buttons
```

### API Functions (`/base/lib/api.ts`)

```typescript
export async function quickBookingAnalyze(description: string) {
  const res = await fetch(`${API_URL}/quick-booking/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description })
  });
  return res.json();
}

export async function quickBookingBook(params: {
  provider_id: number;
  start_time: string;
  end_time: string;
  notes: string;
}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}/quick-booking/book`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(params)
  });
  return res.json();
}
```

---

## Navigation & Discovery

### Landing Page (Hero Section)
- Primary CTA: **"⚡ Book in Under 2 Minutes"**
- Gradient button (blue to indigo)
- Links to `/quick-booking`

### Patient Sidebar
- **Icon:** ⚡ (Zap)
- **Position:** 2nd item (after Home)
- **Label:** "⚡ Quick Booking"

### URL Route
- `/quick-booking` - Main page

---

## Performance

### Backend Optimizations
- ✅ Symptom analysis cached for 7 days
- ✅ Limited to 5 providers per query
- ✅ Only 3 slots pre-loaded per provider
- ✅ Notifications sent asynchronously
- ✅ Database indexes on specialty, rating

### Frontend Optimizations
- ✅ Single API call for analysis + providers + slots
- ✅ Next.js automatic code splitting
- ✅ Optimistic UI updates
- ✅ Error boundaries

### Expected Timing
| Operation | Time |
|-----------|------|
| AI Analysis | 5-10 seconds |
| Provider Loading | < 1 second |
| Booking Confirmation | 1-2 seconds |
| **Total User Time** | **60-120 seconds** |

---

## Error Handling

### Frontend Validation
- Symptom description < 10 characters → Error message
- Network failures → Retry option
- API errors → User-friendly messages

### Backend Validation
- Invalid description → 422 error
- No providers found → Empty array
- OpenAI failure → Fallback to Primary Care
- Booking conflicts → Validation error

### Error Recovery
- Automatic error clearing on retry
- Stay on current step on error
- Back navigation preserves state

---

## Security

- ✅ JWT authentication required for booking
- ✅ Input validation (min 10 characters)
- ✅ Parameterized database queries
- ✅ XSS protection via React escaping
- ✅ CORS configuration
- ✅ Symptoms stored as appointment notes
- ✅ No PII in logs

---

## Testing

### Manual Testing

**1. Test Symptom Analysis:**
```bash
curl -X POST http://localhost:3001/quick-booking/analyze \
  -H "Content-Type: application/json" \
  -d '{"description": "I have a headache and feel dizzy"}'
```

**2. Test Quick Booking UI:**
- Visit `http://localhost:3000`
- Click "⚡ Book in Under 2 Minutes"
- Complete the wizard
- Verify email confirmation

**3. Test Error Cases:**
- Enter < 10 characters
- Try booking without auth
- Simulate network errors

### Recommended Automated Tests

```ruby
# RSpec tests for quick_booking_controller.rb

describe 'POST /quick-booking/analyze' do
  it 'returns analysis with providers' do
    post '/quick-booking/analyze', 
      params: { description: 'persistent headache for 3 days' }
    expect(response).to have_http_status(:success)
    expect(json['analysis']).to be_present
    expect(json['providers']).to be_an(Array)
  end

  it 'rejects short descriptions' do
    post '/quick-booking/analyze', params: { description: 'head' }
    expect(response).to have_http_status(:unprocessable_entity)
  end
end

describe 'POST /quick-booking/book' do
  it 'creates appointment when authenticated' do
    # Test implementation
  end

  it 'requires authentication' do
    post '/quick-booking/book', params: booking_params
    expect(response).to have_http_status(:unauthorized)
  end
end
```

---

## Deployment

### Prerequisites
1. Backend server running (`rails s`)
2. Frontend server running (`npm run dev`)
3. OpenAI API key configured
4. Providers seeded with availabilities

### Environment Variables
- `NEXT_PUBLIC_API_URL` - Backend API URL (frontend)
- `OPENAI_API_KEY` - OpenAI key (backend)

### Database
- No new migrations required
- Uses existing tables: `providers`, `appointments`, `availabilities`, `blocked_slots`

### Checklist
- [ ] OpenAI API key configured
- [ ] Seed providers with availabilities
- [ ] Test email notifications
- [ ] Configure production CORS
- [ ] Set up error monitoring (Sentry)
- [ ] Set up analytics
- [ ] Load testing completed

---

## Troubleshooting

### Common Issues

**"No providers available"**
- Solution: Seed providers with matching specialties
- Check: `Provider.count`, `Provider.where(specialty: 'Primary Care')`

**"No slots available"**
- Solution: Add availabilities for providers
- Check: `provider.availabilities`, `SlotGeneratorService.new(provider).generate_slots`

**OpenAI errors**
- Solution: Verify API key, check quota
- Fallback: Returns primary care recommendation

**Booking conflicts**
- Solution: Refresh available slots before booking
- Check: Existing appointments at that time

---

## Monitoring & Metrics

### Key Metrics to Track

**Conversion Funnel:**
- Symptom entries
- Analysis completions
- Provider selections
- Confirmed bookings
- Conversion rate %

**Performance:**
- Time to analyze (target: < 10s)
- Total booking time (target: < 2 min)
- API response times
- Error rate

**Business:**
- Most common symptoms
- Most booked specialties
- Peak booking times

---

## Future Enhancements

Potential improvements for v1.1:
- [ ] Insurance verification
- [ ] More filtering options (location, rating, price)
- [ ] Calendar integration
- [ ] SMS notifications
- [ ] Multi-language support
- [ ] Voice input for symptoms
- [ ] Telehealth option indicator
- [ ] Favorite providers
- [ ] Save symptom history

---

## Status

✅ **Feature Complete and Ready for Production**

**Version:** 1.0  
**Last Updated:** November 6, 2025

---

## Support

**For Users:** See `docs/QUICK_BOOKING_USER_GUIDE.md`

**For Developers:** This document

**Questions:** dev-team@nora-health.com

