# Bitespeed Backend Task: Identity Reconciliation

This repository contains the backend service for the Bitespeed Identity Reconciliation task. The service exposes a single API endpoint, `/identify`, designed to consolidate customer contact information from various orders into a single, unified identity. This helps businesses like FluxKart.com maintain a clear view of their customer base, even when customers use different contact details over time.

**Live API Endpoint:** 

## Table of Contents
- [Tech Stack](#tech-stack)
- [Core Logic & Edge Cases](#core-logic--edge-cases)
- [API Documentation](#api-documentation)

## Tech Stack
- **Backend:** Node.js with Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL
- **Database Client:** `pg` (node-postgres) for direct SQL interaction without an ORM.
- **Environment Management:** `dotenv`

## Core Logic & Edge Cases
The service logic is designed to handle several key scenarios:

1.  **New Identity Creation:** If an incoming request contains an `email` or `phoneNumber` that does not exist in the database, a new `Contact` is created with `linkPrecedence` set to `"primary"`.

2.  **Secondary Contact Creation:** If a request shares one piece of information (e.g., `phoneNumber`) with an existing contact but introduces a new piece of information (e.g., a new `email`), a new `Contact` is created with `linkPrecedence` set to `"secondary"` and its `linkedId` points to the primary contact of that identity group.

3.  **Identity Merging:** This is the most complex case. If a request contains an `email` that belongs to one primary contact and a `phoneNumber` that belongs to a *different* primary contact, the service merges these two identities. The older of the two contacts remains `"primary"`, and the newer primary contact is updated to become `"secondary"`, linking to the older one. All associated secondary contacts are correctly re-associated under the single remaining primary contact.

4.  **No Redundant Data:** The service will not create a new contact if the exact combination of `email` and `phoneNumber` in the request already exists within an identity group.

## API Documentation

### `POST /identify`
Identifies a customer and returns a consolidated contact profile.

**Request Body:**
The request body must be a JSON object with at least one of the following keys.

```json
{
	"email"?: "string",
	"phoneNumber"?: "string"
}
```
**Headers:**
- `Content-Type`: `application/json`

**Success Response (200 OK):**
The response contains a consolidated view of the customer's identity. Note that `primaryContatctId` contains a typo as specified in the task requirements.

```json
{
    "contact": {
        "primaryContatctId": 1,
        "emails": ["primary@example.com", "secondary@example.com"],
        "phoneNumbers": ["1234567890", "0987654321"],
        "secondaryContactIds": [2, 3, 4]
    }
}
```

**Error Responses:**
- **400 Bad Request:** If the request body is empty or does not contain an `email` or `phoneNumber`.
  ```json
  {
      "error": "Either email or phoneNumber must be provided."
  }
  ```
- **500 Internal Server Error:** If a server-side error occurs (e.g., database connection issue).
