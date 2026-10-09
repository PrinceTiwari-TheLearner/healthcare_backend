# Healthcare Backend

Node.js/Express implementation of the healthcare assignment using PostgreSQL through Sequelize.

## Setup

1. Create a PostgreSQL database named `healthcare`.
2. Copy `.env.example` to `.env` and set `DATABASE_URL` and a strong `JWT_SECRET`.
3. Install and run:

```bash
npm install
npm run dev
```

The API listens on `http://localhost:3000` by default. Tables are created with Sequelize on startup.

## Authentication

Register or log in at `/api/auth/register` and `/api/auth/login`. Send the returned token on protected requests:

```text
Authorization: Bearer <token>
```

## Endpoints

- `POST /api/auth/register`, `POST /api/auth/login`
- `GET|POST /api/patients`, `GET|PUT|DELETE /api/patients/:id`
- `GET|POST /api/doctors`, `GET|PUT|DELETE /api/doctors/:id`
- `POST /api/mappings`, `GET /api/mappings`, `GET /api/mappings/:patientId`, `DELETE /api/mappings/:id`

All patient, doctor, and mapping routes require JWT authentication. Patient records are scoped to their creator. Doctor listing is shared, while doctor updates and deletes are restricted to the doctor creator.
