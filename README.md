# URL Shortener Platform

A full-stack URL Shortener application built using **React, Flask, and MongoDB** that converts long URLs into short, shareable links. The system supports custom aliases, fast redirection, and basic analytics, and is designed with scalability and real-world backend considerations.

---

## Problem Statement

Long URLs are difficult to share and manage. This project solves the problem by providing a reliable service to generate short URLs that redirect efficiently while tracking usage data.

---

## Features

- Generate short URLs from long links
- Support for user-defined custom aliases
- Fast redirection to original URLs
- Click count tracking for basic analytics
- Collision handling during short code generation
- Modular backend architecture

---

## Tech Stack

### Frontend
- React
- HTML, CSS, JavaScript

### Backend
- Flask (Python)
- RESTful API design

### Database
- MongoDB (Atlas / Local)

### Tools & Utilities
- Git & GitHub
- Postman (API testing)
- Docker (optional, future-ready)

---

## System Architecture

- The React frontend sends API requests to the Flask backend.
- The backend generates a unique short code and stores the mapping in MongoDB.
- On accessing a short URL, the backend resolves it and redirects the user.
- Click counts are updated atomically to ensure accurate analytics.
- In-memory caching is used to reduce repeated database reads.

---

## API Endpoints

### Create Short URL

**Description**  
Creates a shortened URL from a long URL.

Request Body Example
{
  "url": "https://example.com",
  "custom_alias": "myalias"
}

Response Example
{
  "short_code": "myalias",
  "short_url": "http://localhost:5000/myalias",
  "original_url": "https://example.com"
}

How to Run the Project
Backend Setup (Flask)
Prerequisites

Python 3.9 or higher

MongoDB (local or via MongoDB Atlas)

Steps

Navigate to the backend directory:

cd backend


Create a virtual environment:

python -m venv venv


Activate the virtual environment:

Windows

venv\Scripts\activate


macOS / Linux

source venv/bin/activate


Install dependencies:

pip install -r requirements.txt


Start the Flask server:

python app.py

Frontend Setup (React)

Navigate to the frontend directory:

cd frontend


Install dependencies:

npm install


Start the React development server:

npm start


