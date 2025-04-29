# QMaster

QMaster is a web-based platform designed to streamline the creation, management, and evaluation of educational assessments. It empowers teachers to generate question papers quickly using AI and enables students to access and complete tests securely and efficiently.

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [How It Works](#how-it-works)
- [Installation](#installation)
- [Project Structure](#project-structure)
- [Screenshots](#screenshots)
- [License](#license)

## Features
- **AI-Powered Question Generation:** Automatically generate multiple-choice and descriptive questions from uploaded text or PDFs.
- **Customizable Tests:** Teachers can select question difficulties, generate question papers, and assign unique test tokens (UUIDs).
- **Secure Student Access:** Students can join tests using a unique token and attempt dynamically generated question papers.
- **Automated Evaluation:** Instant grading for MCQs and AI-assisted evaluation for descriptive answers.
- **Leaderboards and Analytics:** Teachers can track student performance and view leaderboards.
- **Role-Based Access Control:** Separate dashboards and functionalities for teachers and students.

## Tech Stack
- **Frontend:** React.js
- **Backend:** Flask (Python)
- **Database:** MongoDB
- **AI Models Used:** T5, SpaCy (for question generation and evaluation)

## How It Works
1. **Teachers:**
   - Register and log in.
   - Upload text/PDF content to generate questions.
   - Create and customize tests.
   - View student submissions and performance.
2. **Students:**
   - Register and log in.
   - Join tests using a UUID.
   - Attempt the test and upload responses.
   - View results after evaluation.

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/qmaster.git
   ```
2. Navigate to the project directory:
   ```bash
   cd qmaster
   ```
3. Set up the frontend:
   ```bash
   cd frontend
   npm install
   npm start
   ```
4. Set up the backend:
   ```bash
   cd backend
   pip install -r requirements.txt
   python app.py
   ```

## Project Structure
```
qmaster/
│
├── frontend/             # React frontend
│   ├── src/
│   └── package.json
│
├── backend/              # Flask backend
│   ├── app.py
│   └── requirements.txt
│
└── README.md
```

## Screenshots
- **Home Page:** Landing page with Sign Up and Sign In options.
  
  ![Screenshot 2025-03-18 122534](https://github.com/user-attachments/assets/605edc51-141c-4b54-a3bc-25b000e753eb)

- **Teacher Dashboard:** Upload PDFs or text content, create questions, generate tests.

![Screenshot 2025-03-18 122806](https://github.com/user-attachments/assets/af114e10-1805-4373-ad6d-0fc98eb7a6a3)

- **Student Dashboard:** Enter token to access and attempt tests.

  ![Screenshot 2025-03-18 124426](https://github.com/user-attachments/assets/00959500-ccf1-4835-b314-56ed8160de0b)


## License
This project is open source and available under the [MIT License](LICENSE).
