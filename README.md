# PDF Data Extractor

A full-stack application for extracting structured data from PDF documents using AI.

## Tech Stack

### Frontend

- **Next.js 15** with TypeScript
- **Tailwind CSS** for styling
- **shadcn/ui** component library
- **React** for UI components

### Backend

- **NestJS** with TypeScript
- **PostgreSQL** for data storage
- **TypeORM** for database management
- **OpenAI API** for PDF data extraction
- **pdf-parse** for PDF text extraction

## Prerequisites

- Node.js v22.17.1 (use `nvm use` to switch)
- Yarn 1.22.22
- PostgreSQL database

## Getting Started

### 1. Clone the repository

```bash
git clone git@github.com:krupalpatel92/pdf-data-extractor-ai.git
cd pdf-data-extractor-ai
```

### 2. Set up the Backend

```bash
cd backend
cp .env.example .env
# Edit .env and add your OpenAI API key and database credentials
yarn install
```

### 3. Set up the Frontend

```bash
cd ../frontend
cp .env.example .env
# Edit .env if needed (default should work)
yarn install
```

### 4. Set up PostgreSQL Database

Create a PostgreSQL database named `pdf_extractor`:

```bash
psql -U postgres
CREATE DATABASE pdf_extractor;
\q
```

Or update the database credentials in `backend/.env` to match your setup.

### 5. Run the Application

**Backend (Terminal 1):**

```bash
cd backend
yarn start:dev
```

**Frontend (Terminal 2):**

```bash
cd frontend
yarn dev
```

The application will be available at:

- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## Features

- ✅ PDF file upload with drag-and-drop support
- ✅ AI-powered data extraction using OpenAI GPT-4o-mini
- ✅ Structured JSON output
- ✅ Data persistence in PostgreSQL
- ✅ Modern UI with shadcn/ui components
- ✅ Real-time feedback and toast notifications

## Environment Variables

### Backend (`backend/.env`)

- `DB_HOST` - PostgreSQL host (default: localhost)
- `DB_PORT` - PostgreSQL port (default: 5432)
- `DB_USERNAME` - Database username
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name
- `OPENAI_API_KEY` - Your OpenAI API key
- `PORT` - Backend port (default: 3001)

### Frontend (`frontend/.env`)

- `NEXT_PUBLIC_API_URL` - Backend API URL (default: http://localhost:3001)

## API Endpoints

### POST `/api/pdf/extract`

Upload and extract data from a PDF file.

**Request:**

- Method: POST
- Content-Type: multipart/form-data
- Body: file (PDF file)

**Response:**

```json
{
  "id": "uuid",
  "fileName": "document.pdf",
  "extractedContent": { ... },
  "createdAt": "2025-10-15T12:00:00.000Z"
}
```

### GET `/api/pdf/all`

Get all extracted data records.

### GET `/api/pdf/:id`

Get a specific extracted data record by ID.

## License

MIT
