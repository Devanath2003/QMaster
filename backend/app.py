from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError
from jwt import decode, encode, ExpiredSignatureError
from bcrypt import hashpw, gensalt, checkpw
from dotenv import load_dotenv
from uuid import uuid4
import os
import pdfplumber
from datetime import datetime, timedelta
import logging
import smtplib
from email.mime.text import MIMEText
import random
import spacy
import time
from bson.objectid import ObjectId
# from ai.test import generate_mcqs, generate_descriptive_questions
from ai.question_generator import generate_mcqs,generate_descriptive_questions
import threading

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173"], "supports_credentials": True}})

# MongoDB Connection
try:
    client = MongoClient(os.getenv('MONGO_URI', 'mongodb://localhost:27017/qmaster'), 
                         maxPoolSize=10, serverSelectionTimeoutMS=5000)
    db = client['qmaster']
    logger.info("MongoDB Connected")
except ServerSelectionTimeoutError as e:
    logger.error(f"MongoDB connection error: {e}")
    exit(1)

# Collections
notes = db.notes
submissions = db.submissions
users = db.users
questions = db.questions
tests = db.tests
token_requests = db.token_requests  # New collection for tracking token generation

# OTP Store
otps = {}

# JWT Configuration
JWT_SECRET = os.getenv('JWT_SECRET', 'your-secure-secret-key')
JWT_EXPIRATION = timedelta(hours=24)

# Email Configuration
EMAIL_USER = os.getenv('EMAIL_USER')
EMAIL_PASS = os.getenv('EMAIL_PASS')

# spaCy for similarity comparison
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    logger.error("spaCy model 'en_core_web_sm' not found. Please install it using: python -m spacy download en_core_web_sm")
    exit(1)

def send_otp_email(to_email, otp, otp_type="registration"):
    try:
        msg = MIMEText(f"Your OTP for QMaster {otp_type} is: {otp}\nIt expires in 10 minutes.")
        msg['Subject'] = f'QMaster {otp_type.replace("_", " ").title()} OTP'
        msg['From'] = EMAIL_USER
        msg['To'] = to_email
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(EMAIL_USER, EMAIL_PASS)
            server.sendmail(EMAIL_USER, to_email, msg.as_string())
        logger.info(f"OTP email sent to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send OTP email: {e}")
        raise

def authenticate(token):
    try:
        payload = decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except ExpiredSignatureError:
        logger.error("JWT expired")
        return None
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        return None

def mongo_to_json(obj):
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")

# Background processing function
def process_content(request_id, input_type, subject, text_content, pdf_content, num_mcqs, num_descriptive, mcq_marks, descriptive_marks):
    try:
        token_id = str(uuid4())
        mcqs = []
        descriptive = []

        content_to_process = pdf_content if input_type == 'pdf' else text_content
        if not content_to_process.strip():
            token_requests.update_one(
                {"request_id": request_id},
                {"$set": {"status": "failed", "error": "No valid content to process for question generation"}}
            )
            return

        logger.info(f"Generating {num_mcqs} MCQs for request_id {request_id}")
        mcqs = generate_mcqs(content_to_process, num_mcqs)
        logger.info(f"Generating {num_descriptive} descriptive questions for request_id {request_id}")
        descriptive = generate_descriptive_questions(content_to_process, num_descriptive)

        if not mcqs and not descriptive:
            token_requests.update_one(
                {"request_id": request_id},
                {"$set": {"status": "failed", "error": "Failed to generate any questions"}}
            )
            return

        questions_to_insert = []
        for mcq in mcqs:
            questions_to_insert.append({
                "token": token_id,
                "type": "mcq",
                "question": mcq['question'],
                "options": mcq['options'],
                "correctAnswer": mcq['correct'],
                "correctIndex": mcq.get('correct_index', 0),
                "marks": mcq_marks,
                "context": mcq['context'],
                "difficulty": mcq['difficulty'],
                "subject": subject
            })
        for desc in descriptive:
            questions_to_insert.append({
                "token": token_id,
                "type": "descriptive",
                "question": desc['question'],
                "correctAnswer": desc['answer'],
                "marks": descriptive_marks,
                "pdfContent": pdf_content if input_type == 'pdf' else None,
                "context": desc['context'],
                "difficulty": desc['difficulty'],
                "subject": subject
            })

        if questions_to_insert:
            questions.insert_many(questions_to_insert)
            logger.info(f"Inserted {len(questions_to_insert)} questions for token {token_id}")
        content_to_store = content_to_process
        notes.insert_one({"token": token_id, "content": content_to_store, "createdAt": datetime.now(), "inputType": input_type, "subject": subject})
        logger.info(f"Inserted note with token: {token_id}")

        token_requests.update_one(
            {"request_id": request_id},
            {"$set": {"status": "completed", "token": token_id, "mcqs": mcqs, "descriptiveQuestions": descriptive}}
        )
    except Exception as e:
        logger.error(f"Background processing failed for request_id {request_id}: {e}", exc_info=True)
        token_requests.update_one(
            {"request_id": request_id},
            {"$set": {"status": "failed", "error": str(e)}}
        )

@app.route('/api/setup-user', methods=['POST'])
def setup_user():
    data = request.get_json()
    username = data.get('username', 'teacher1')
    password = data.get('password', 'password123')
    role = data.get('role', 'teacher')
    email = data.get('email', '')
    real_name = data.get('realName', username)
    if users.find_one({"username": {"$regex": f"^{username}$", "$options": "i"}}):
        return jsonify({"error": "Username taken"}), 400
    if users.find_one({"email": email}) and email:
        return jsonify({"error": "Email already in use"}), 400
    hashed = hashpw(password.encode('utf-8'), gensalt()).decode('utf-8')
    users.insert_one({
        "username": username,
        "password": hashed,
        "role": role,
        "email": email,
        "realName": real_name,
        "createdAt": datetime.now(),
        "conductedTests": [] if role == "teacher" else None,
        "attendedTests": [] if role == "student" else None
    })
    logger.info(f"User {username} created successfully with hashed password")
    return jsonify({"message": "User created successfully"}), 201

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'student')
    email = data.get('email')
    real_name = data.get('realName', username)
    if not all([username, password, email]) or users.find_one({"username": {"$regex": f"^{username}$", "$options": "i"}}):
        return jsonify({"error": "Username taken or invalid data"}), 400
    if users.find_one({"email": email}):
        return jsonify({"error": "Email already in use"}), 400
    otp = str(random.randint(100000, 999999))
    otps[username] = {"otp": otp, "expires": datetime.now() + timedelta(minutes=10), "email": email, "password": password, "role": role, "realName": real_name}
    try:
        send_otp_email(email, otp, otp_type="registration")
    except Exception as e:
        return jsonify({"error": f"Failed to send OTP email: {e}"}), 500
    return jsonify({"message": f"OTP sent to {email}"}), 200

@app.route('/api/verify-otp', methods=['POST'])
def verify_otp():
    data = request.get_json()
    username = data.get('username')
    otp = data.get('otp')
    stored = otps.get(username)
    if not stored or stored['otp'] != otp or stored['expires'] < datetime.now():
        return jsonify({"error": "Invalid or expired OTP"}), 400
    email = stored['email']
    password = stored['password']
    role = stored['role']
    real_name = stored['realName']
    hashed = hashpw(password.encode('utf-8'), gensalt()).decode('utf-8')
    users.insert_one({
        "username": username,
        "password": hashed,
        "role": role,
        "email": email,
        "realName": real_name,
        "createdAt": datetime.now(),
        "conductedTests": [] if role == "teacher" else None,
        "attendedTests": [] if role == "student" else None
    })
    del otps[username]
    logger.info(f"User {username} registered successfully")
    return jsonify({"message": "User registered"}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    identifier = data.get('username')  # This could be username or email
    password = data.get('password')
    logger.info(f"Attempting login for identifier: {identifier}")
    
    # Check if the identifier is an email or username
    user = None
    if '@' in identifier:  # Assuming identifier with '@' is an email
        user = users.find_one({"email": identifier})
    else:  # Treat as username
        user = users.find_one({"username": {"$regex": f"^{identifier}$", "$options": "i"}})
    
    if not user:
        logger.info(f"No user found for identifier: {identifier}")
        return jsonify({"error": "Invalid credentials"}), 401
    
    try:
        password_match = checkpw(password.encode('utf-8'), user['password'].encode('utf-8'))
    except Exception as e:
        logger.error(f"Error during password comparison: {e}")
        return jsonify({"error": "Password verification failed"}), 500
    
    if not password_match:
        logger.info(f"Password does not match for identifier: {identifier}")
        return jsonify({"error": "Invalid credentials"}), 401
    
    expiration_time = int(time.time() + JWT_EXPIRATION.total_seconds())
    payload = {
        "id": str(user['_id']),
        "role": user['role'],
        "username": user['username'],
        "exp": expiration_time
    }
    token = encode(payload, JWT_SECRET, algorithm="HS256")
    logger.info(f"Generated token: {token}, Expiration: {datetime.fromtimestamp(expiration_time)}")
    return jsonify({"token": token, "role": user['role']}), 200

@app.route('/api/profile', methods=['GET'])
def get_profile():
    auth_token = request.headers.get('Authorization')
    if not auth_token or not auth_token.startswith('Bearer '):
        return jsonify({"error": "No token provided"}), 401
    payload = authenticate(auth_token[7:])
    if not payload:
        return jsonify({"error": "Unauthorized"}), 403

    user = users.find_one({"_id": ObjectId(payload['id'])})
    if not user:
        return jsonify({"error": "User not found"}), 404

    latest_token = None
    if user['role'] == 'teacher' and user.get('conductedTests', []):
        latest_test = max(user['conductedTests'], key=lambda x: x['createdAt'], default=None)
        if latest_test:
            latest_token = latest_test['token']

    profile = {
        "username": user['username'],
        "email": user.get('email', 'Not registered'),
        "realName": user.get('realName', 'Not provided'),
        "role": user['role'],
        "conductedTests": user.get('conductedTests', []) if user['role'] == 'teacher' else [],
        "attendedTests": user.get('attendedTests', []) if user['role'] == 'student' else [],
        "latestToken": latest_token
    }
    for item in profile.get('conductedTests', []) + profile.get('attendedTests', []):
        if '_id' in item:
            item['_id'] = str(item['_id'])
    return jsonify(profile), 200
@app.route('/api/request-profile-otp', methods=['POST'])
def request_profile_otp():
    auth_token = request.headers.get('Authorization')
    if not auth_token or not auth_token.startswith('Bearer '):
        return jsonify({"error": "No token provided"}), 401
    payload = authenticate(auth_token[7:])
    if not payload:
        return jsonify({"error": "Unauthorized"}), 403

    user = users.find_one({"_id": ObjectId(payload['id'])})
    if not user or not user.get('email'):
        return jsonify({"error": "User not found or email not registered"}), 404

    otp = str(random.randint(100000, 999999))
    action = request.get_json().get('action')  # 'update' or 'delete'
    if action not in ['update', 'delete']:
        return jsonify({"error": "Invalid action specified"}), 400

    otps[payload['username']] = {
        "otp": otp,
        "expires": datetime.now() + timedelta(minutes=10),
        "email": user['email'],
        "otp_type": f"profile_{action}",
        "action": action
    }
    try:
        send_otp_email(user['email'], otp, otp_type=f"profile_{action}")
    except Exception as e:
        return jsonify({"error": f"Failed to send OTP email: {e}"}), 500
    return jsonify({"message": f"OTP sent to {user['email']} for profile {action}"}), 200

@app.route('/api/profile/update', methods=['PUT'])
def update_profile():
    auth_token = request.headers.get('Authorization')
    if not auth_token or not auth_token.startswith('Bearer '):
        return jsonify({"error": "No token provided"}), 401
    payload = authenticate(auth_token[7:])
    if not payload:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json()
    otp = data.get('otp')  # OTP provided by the user
    new_real_name = data.get('realName')
    new_email = data.get('email')
    new_password = data.get('password')

    # Verify OTP
    stored = otps.get(payload['username'])
    if not stored or stored['otp'] != otp or stored['expires'] < datetime.now() or stored['action'] != 'update':
        return jsonify({"error": "Invalid or expired OTP"}), 400

    user = users.find_one({"_id": ObjectId(payload['id'])})
    if not user:
        return jsonify({"error": "User not found"}), 404

    update_data = {}
    if new_real_name and new_real_name != user.get('realName'):
        update_data['realName'] = new_real_name
    if new_email and new_email != user.get('email'):
        if users.find_one({"email": new_email}):
            return jsonify({"error": "Email already in use"}), 400
        update_data['email'] = new_email
    if new_password:
        hashed = hashpw(new_password.encode('utf-8'), gensalt()).decode('utf-8')
        update_data['password'] = hashed

    if update_data:
        users.update_one({"_id": ObjectId(payload['id'])}, {"$set": update_data})
        logger.info(f"Profile updated for user {payload['username']}")
        # Clear the OTP after successful update
        del otps[payload['username']]
        return jsonify({"message": "Profile updated successfully"}), 200
    # Clear the OTP even if no changes were made
    del otps[payload['username']]
    return jsonify({"message": "No changes made"}), 200
   

@app.route('/api/profile/delete', methods=['DELETE'])
def delete_profile():
    auth_token = request.headers.get('Authorization')
    if not auth_token or not auth_token.startswith('Bearer '):
        return jsonify({"error": "No token provided"}), 401
    payload = authenticate(auth_token[7:])
    if not payload:
        return jsonify({"error": "Unauthorized"}), 403

    data = request.get_json() or {}
    otp = data.get('otp')  # OTP provided by the user

    # Verify OTP
    stored = otps.get(payload['username'])
    if not stored or stored['otp'] != otp or stored['expires'] < datetime.now() or stored['action'] != 'delete':
        return jsonify({"error": "Invalid or expired OTP"}), 400

    result = users.delete_one({"_id": ObjectId(payload['id'])})
    if result.deleted_count > 0:
        logger.info(f"Profile deleted for user {payload['username']}")
        # Clear the OTP after successful deletion
        del otps[payload['username']]
        return jsonify({"message": "Profile deleted successfully"}), 200
    return jsonify({"error": "User not found"}), 404

@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    username = data.get('username')
    user = users.find_one({"username": {"$regex": f"^{username}$", "$options": "i"}})
    if not user or not user.get('email'):
        return jsonify({"error": "User not found or email not registered"}), 404

    otp = str(random.randint(100000, 999999))
    otps[username] = {"otp": otp, "expires": datetime.now() + timedelta(minutes=10), "email": user['email'], "otp_type": "password_reset"}
    try:
        send_otp_email(user['email'], otp, otp_type="password_reset")
    except Exception as e:
        return jsonify({"error": f"Failed to send OTP email: {e}"}), 500
    return jsonify({"message": f"OTP sent to {user['email']} for password reset"}), 200

@app.route('/api/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    username = data.get('username')
    otp = data.get('otp')
    new_password = data.get('newPassword')
    confirm_password = data.get('confirmPassword')

    if new_password != confirm_password:
        return jsonify({"error": "Passwords do not match"}), 400

    stored = otps.get(username)
    if not stored or stored['otp'] != otp or stored['expires'] < datetime.now():
        return jsonify({"error": "Invalid or expired OTP"}), 400

    hashed = hashpw(new_password.encode('utf-8'), gensalt()).decode('utf-8')
    users.update_one({"username": {"$regex": f"^{username}$", "$options": "i"}}, {"$set": {"password": hashed}})
    del otps[username]
    logger.info(f"Password reset successfully for user {username}")
    return jsonify({"message": "Password reset successfully"}), 200

@app.route('/api/upload-content', methods=['POST'])
def upload_content():
    auth_token = request.headers.get('Authorization')
    if not auth_token or not auth_token.startswith('Bearer '):
        return jsonify({"error": "No token provided"}), 401
    payload = authenticate(auth_token[7:])
    if not payload or payload['role'] != 'teacher':
        return jsonify({"error": "Unauthorized"}), 403

    input_type = request.form.get('inputType')
    subject = request.form.get('subject', 'General')
    if not input_type or input_type not in ['text', 'pdf']:
        return jsonify({"error": "Invalid input type. Must be 'text' or 'pdf'"}), 400

    text_content = ""
    pdf_content = ""

    if input_type == 'pdf':
        if 'pdf' not in request.files:
            return jsonify({"error": "No PDF file provided"}), 400
        pdf_file = request.files['pdf']
        logger.info(f"Processing PDF file: {pdf_file.filename}")
        try:
            with pdfplumber.open(pdf_file) as pdf:
                pdf_content = ''.join(page.extract_text() or '' for page in pdf.pages)
            logger.info(f"Extracted PDF content length: {len(pdf_content)} characters")
            if not pdf_content.strip():
                return jsonify({"error": "No readable text found in the PDF"}), 400
        except Exception as e:
            logger.error(f"Failed to extract PDF content: {e}")
            return jsonify({"error": f"Failed to process PDF: {e}"}), 400
    else:
        text_content = request.form.get('textContent', '')
        if not text_content:
            return jsonify({"error": "No text content provided"}), 400
        if len(text_content.split()) > 3000:
            return jsonify({"error": "Text exceeds 3000 words limit"}), 400

    try:
        num_mcqs = int(request.form.get('numMCQs', 5))
        num_descriptive = int(request.form.get('numDescriptive', 3))
        mcq_marks = float(request.form.get('mcqMarks', 2))
        descriptive_marks = float(request.form.get('descriptiveMarks', 10))
        logger.info(f"Parameters: num_mcqs={num_mcqs}, num_descriptive={num_descriptive}, mcq_marks={mcq_marks}, descriptive_marks={descriptive_marks}")
    except ValueError as e:
        logger.error(f"Invalid numeric parameters: {e}")
        return jsonify({"error": "Invalid numeric parameters"}), 400

    request_id = str(uuid4())
    token_requests.insert_one({
        "request_id": request_id,
        "status": "pending",
        "createdAt": datetime.now()
    })

    thread = threading.Thread(
        target=process_content,
        args=(request_id, input_type, subject, text_content, pdf_content, num_mcqs, num_descriptive, mcq_marks, descriptive_marks)
    )
    thread.start()

    return jsonify({"request_id": request_id}), 202

@app.route('/api/token-status/<request_id>', methods=['GET'])
def token_status(request_id):
    auth_token = request.headers.get('Authorization')
    if not auth_token or not auth_token.startswith('Bearer '):
        return jsonify({"error": "No token provided"}), 401
    payload = authenticate(auth_token[7:])
    if not payload or payload['role'] != 'teacher':
        return jsonify({"error": "Unauthorized"}), 403

    request_data = token_requests.find_one({"request_id": request_id})
    if not request_data:
        return jsonify({"error": "Request not found"}), 404

    status = request_data.get("status")
    if status == "pending":
        return jsonify({"status": "pending"}), 200
    elif status == "completed":
        return jsonify({
            "status": "completed",
            "token": request_data.get("token"),
            "mcqs": request_data.get("mcqs", []),
            "descriptiveQuestions": request_data.get("descriptiveQuestions", [])
        }), 200
    elif status == "failed":
        return jsonify({"status": "failed", "error": request_data.get("error")}), 500

@app.route('/api/teacher/questions/<token>', methods=['GET'])
def get_questions(token):
    auth_token = request.headers.get('Authorization')
    if not auth_token or not auth_token.startswith('Bearer '):
        return jsonify({"error": "No token provided"}), 401
    payload = authenticate(auth_token[7:])
    if not payload or payload['role'] != 'teacher':
        return jsonify({"error": "Unauthorized"}), 403
    mcqs = list(questions.find({"token": token, "type": "mcq"}))
    descriptive = list(questions.find({"token": token, "type": "descriptive"}))
    valid_mcqs = []
    for mcq in mcqs:
        if (mcq.get('question') and not mcq['question'].startswith("Generate") and len(mcq['question']) > 10 and
            mcq['question'].endswith("?") and
            mcq.get('options') and len(mcq['options']) == 4 and all(len(opt) > 2 for opt in mcq['options']) and
            mcq.get('correctAnswer') and mcq['correctAnswer'] in mcq['options']):
            valid_mcqs.append(mcq)
        else:
            logger.warning(f"Filtered out invalid MCQ: {mcq.get('question', 'No question')}")
    valid_descriptive = []
    for desc in descriptive:
        if (desc.get('question') and not desc['question'].startswith("Generate") and len(desc['question']) > 10 and
            desc['question'].endswith("?") and desc.get('correctAnswer')):
            valid_descriptive.append(desc)
        else:
            logger.warning(f"Filtered out invalid Descriptive: {desc.get('question', 'No question')}")
    total_mcqs = len(valid_mcqs)
    total_descriptive = len(valid_descriptive)
    if total_mcqs == 0 and total_descriptive == 0:
        return jsonify({"error": "No valid questions found for this token"}), 404
    logger.info(f"Fetched MCQ IDs: {[str(mcq['_id']) for mcq in valid_mcqs]}")
    logger.info(f"Fetched Descriptive IDs: {[str(desc['_id']) for desc in valid_descriptive]}")
    for item in valid_mcqs + valid_descriptive:
        if '_id' in item:
            item['_id'] = str(item['_id'])
    return jsonify({
        "mcqs": valid_mcqs,
        "descriptive": valid_descriptive,
        "totalMCQs": total_mcqs,
        "totalDescriptive": total_descriptive,
        "subject": valid_mcqs[0]['subject'] if valid_mcqs else valid_descriptive[0]['subject'] if valid_descriptive else 'General'
    }), 200

@app.route('/api/teacher/question-history/<token>', methods=['GET'])
def get_question_history(token):
    auth_token = request.headers.get('Authorization')
    if not auth_token or not auth_token.startswith('Bearer '):
        return jsonify({"error": "No token provided"}), 401
    payload = authenticate(auth_token[7:])
    if not payload or payload['role'] != 'teacher':
        return jsonify({"error": "Unauthorized"}), 403

    questions_list = list(questions.find({"token": token}))
    submissions_list = list(submissions.find({"token": token}))

    history = []
    for question in questions_list:
        question_data = {
            "_id": str(question['_id']),
            "question": question['question'],
            "type": question['type'],
            "subject": question['subject'],
            "difficulty": question['difficulty'],
            "context": question['context'],
            "options": question.get('options', []),
            "correctAnswer": question.get('correctAnswer'),
            "marks": question['marks']
        }
        student_performance = []
        for submission in submissions_list:
            answers = submission.get('answers', {})
            if question['type'] == 'mcq':
                for answer in answers.get('mcq', []):
                    if str(answer['id']) == str(question['_id']):
                        student_performance.append({
                            "studentName": submission['studentName'],
                            "answer": answer['answer'],
                            "isCorrect": answer['answer'] == question['correctAnswer'],
                            "score": question['marks'] if answer['answer'] == question['correctAnswer'] else 0,
                            "submittedAt": submission['submittedAt'].isoformat()
                        })
            elif question['type'] == 'descriptive':
                for answer in answers.get('descriptive', []):
                    if str(answer['id']) == str(question['_id']):
                        student_answer = nlp(answer['answer'].lower() if answer['answer'] else "")
                        correct_answer = nlp(question['correctAnswer'].lower() if question['correctAnswer'] else "")
                        similarity = student_answer.similarity(correct_answer) if student_answer and correct_answer else 0
                        score = min(similarity * question['marks'], question['marks'])
                        student_performance.append({
                            "studentName": submission['studentName'],
                            "answer": answer['answer'],
                            "similarity": similarity,
                            "score": round(score, 2),
                            "submittedAt": submission['submittedAt'].isoformat()
                        })
        question_data['studentPerformance'] = student_performance
        history.append(question_data)

    return jsonify({"history": history}), 200

@app.route('/api/teacher/create-test', methods=['POST'])
def create_test():
    auth_token = request.headers.get('Authorization')
    if not auth_token or not auth_token.startswith('Bearer '):
        return jsonify({"error": "No token provided"}), 401
    payload = authenticate(auth_token[7:])
    if not payload or payload['role'] != 'teacher':
        return jsonify({"error": "Unauthorized"}), 403
    data = request.get_json()
    token = data.get('token')
    desired_mcqs = int(data.get('desiredMCQs', 0))
    desired_descriptive = int(data.get('desiredDescriptive', 0))
    logger.info(f"Create Test Request - Token: {token}, Desired MCQs: {desired_mcqs}, Desired Descriptive: {desired_descriptive}")

    mcqs = list(questions.find({"token": token, "type": "mcq"}))
    descriptive = list(questions.find({"token": token, "type": "descriptive"}))

    valid_mcqs = [
        mcq for mcq in mcqs
        if (mcq.get('question') and not mcq['question'].startswith("Generate") and len(mcq['question']) > 10 and
            mcq['question'].endswith("?") and
            mcq.get('options') and len(mcq['options']) == 4 and all(len(opt) > 2 for opt in mcq['options']) and
            mcq.get('correctAnswer') and mcq['correctAnswer'] in mcq['options'])
    ]
    valid_descriptive = [
        desc for desc in descriptive
        if (desc.get('question') and not desc['question'].startswith("Generate") and len(desc['question']) > 10 and
            desc['question'].endswith("?") and desc.get('correctAnswer'))
    ]

    if desired_mcqs > len(valid_mcqs):
        logger.warning(f"Adjusting desiredMCQs from {desired_mcqs} to {len(valid_mcqs)} due to insufficient questions")
        desired_mcqs = len(valid_mcqs)
    if desired_descriptive > len(valid_descriptive):
        logger.warning(f"Adjusting desiredDescriptive from {desired_descriptive} to {len(valid_descriptive)} due to insufficient questions")
        desired_descriptive = len(valid_descriptive)

    if desired_mcqs == 0 or desired_descriptive == 0:
        return jsonify({"error": "Desired MCQs and Descriptive questions must be greater than 0"}), 400

    note = notes.find_one({"token": token})
    subject = note.get('subject', 'General') if note else 'General'

    test_config = {
        "token": token,
        "desiredMCQs": desired_mcqs,
        "desiredDescriptive": desired_descriptive,
        "createdAt": datetime.now(),
        "subject": subject
    }
    tests.insert_one(test_config)
    users.update_one(
        {"_id": ObjectId(payload['id'])},
        {
            "$push": {
                "conductedTests": {
                    "token": token,
                    "createdAt": datetime.now(),
                    "numMCQs": desired_mcqs,
                    "numDescriptive": desired_descriptive,
                    "subject": subject
                }
            }
        }
    )
    logger.info(f"Updated conductedTests for teacher {payload['username']} with token {token}")
    return jsonify({"testToken": token, "message": f"Test created with {desired_mcqs} MCQs and {desired_descriptive} descriptive questions to be randomly selected from the pool"}), 201

@app.route('/api/student/join', methods=['POST'])
def join_test():
    auth_token = request.headers.get('Authorization')
    if not auth_token or not auth_token.startswith('Bearer '):
        return jsonify({"error": "No token provided"}), 401
    payload = authenticate(auth_token[7:])
    if not payload or payload['role'] != 'student':
        return jsonify({"error": "Unauthorized"}), 403
    data = request.get_json()
    token = data.get('token')
    test_config = tests.find_one({"token": token})
    if not test_config:
        return jsonify({"error": "Invalid token"}), 404
    desired_mcqs = test_config['desiredMCQs']
    desired_descriptive = test_config['desiredDescriptive']

    mcqs = list(questions.find({"token": token, "type": "mcq"}))
    descriptive = list(questions.find({"token": token, "type": "descriptive"}))

    valid_mcqs = [
        mcq for mcq in mcqs
        if (mcq.get('question') and not mcq['question'].startswith("Generate") and len(mcq['question']) > 10 and
            mcq['question'].endswith("?") and
            mcq.get('options') and len(mcq['options']) == 4 and all(len(opt) > 2 for opt in mcq['options']) and
            mcq.get('correctAnswer') and mcq['correctAnswer'] in mcq['options'])
    ]
    valid_descriptive = [
        desc for desc in descriptive
        if (desc.get('question') and not desc['question'].startswith("Generate") and len(desc['question']) > 10 and
            desc['question'].endswith("?") and desc.get('correctAnswer'))
    ]

    if len(valid_mcqs) < desired_mcqs or len(valid_descriptive) < desired_descriptive:
        return jsonify({"error": "Not enough valid questions available in the pool"}), 400

    selected_mcqs = random.sample(valid_mcqs, desired_mcqs)
    selected_descriptive = random.sample(valid_descriptive, desired_descriptive)

    for item in selected_mcqs + selected_descriptive:
        if '_id' in item:
            item['_id'] = str(item['_id'])
    return jsonify({
        "mcqs": selected_mcqs,
        "descriptive": selected_descriptive,
        "token": token
    }), 200

@app.route('/api/student/submit', methods=['POST'])
def submit_test():
    auth_token = request.headers.get('Authorization')
    if not auth_token or not auth_token.startswith('Bearer '):
        return jsonify({"error": "No token provided"}), 401
    payload = authenticate(auth_token[7:])
    if not payload or payload['role'] != 'student':
        return jsonify({"error": "Unauthorized"}), 403
    data = request.get_json()
    token = data.get('token')
    answers = data.get('answers', {})
    student_name = payload['username']
    total_score = 0
    total_marks = 0
    mcq_answers = answers.get('mcq', [])
    descriptive_answers = answers.get('descriptive', [])

    mcq_questions = list(questions.find({"_id": {"$in": [ObjectId(doc['id']) for doc in mcq_answers]}}))
    descriptive_questions = list(questions.find({"_id": {"$in": [ObjectId(doc['id']) for doc in descriptive_answers]}}))

    for answer in mcq_answers:
        question = next((q for q in mcq_questions if str(q['_id']) == answer['id']), None)
        if question and question['correctAnswer'] == answer['answer']:
            total_score += question['marks']
        if question:
            total_marks += question['marks']
    for answer in descriptive_answers:
        question = next((q for q in descriptive_questions if str(q['_id']) == answer['id']), None)
        if question:
            student_answer = nlp(answer['answer'].lower() if answer['answer'] else "")
            correct_answer = nlp(question['correctAnswer'].lower() if question['correctAnswer'] else "")
            similarity = student_answer.similarity(correct_answer) if student_answer and correct_answer else 0
            total_score += min(similarity * question['marks'], question['marks'])
            total_marks += question['marks']

    submission = {
        "token": token,
        "studentName": student_name,
        "answers": answers,
        "questions": {
            "mcq": [{key: question[key] for key in question if key != '_id'} | {"_id": str(question['_id'])} for question in mcq_questions],
            "descriptive": [{key: question[key] for key in question if key != '_id'} | {"_id": str(question['_id'])} for question in descriptive_questions]
        },
        "score": round(total_score, 2),
        "totalMarks": total_marks,
        "submittedAt": datetime.now()
    }
    submissions.insert_one(submission)
    users.update_one(
        {"_id": ObjectId(payload['id'])},
        {
            "$push": {
                "attendedTests": {
                    "token": token,
                    "submittedAt": datetime.now(),
                    "score": round(total_score, 2),
                    "totalMarks": total_marks
                }
            }
        }
    )
    logger.info(f"Updated attendedTests for student {student_name} with token {token}")
    return jsonify({"score": total_score, "total": total_marks}), 201

@app.route('/api/teacher/results/<token>', methods=['GET'])
def teacher_results(token):
    auth_token = request.headers.get('Authorization')
    if not auth_token or not auth_token.startswith('Bearer '):
        return jsonify({"error": "No token provided"}), 401
    payload = authenticate(auth_token[7:])
    if not payload or payload['role'] != 'teacher':
        return jsonify({"error": "Unauthorized"}), 403
    submissions_list = list(submissions.find({"token": token}))
    class_average = sum(sub['score'] for sub in submissions_list) / len(submissions_list) if submissions_list else 0
    for item in submissions_list:
        if '_id' in item:
            item['_id'] = str(item['_id'])
        item['answers'] = item.get('answers', {})
        item['questions'] = item.get('questions', {})
    return jsonify({"submissions": submissions_list, "classAverage": round(class_average, 2)}), 200

@app.route('/api/student/results', methods=['GET'])
def student_results():
    auth_token = request.headers.get('Authorization')
    if not auth_token or not auth_token.startswith('Bearer '):
        return jsonify({"error": "No token provided"}), 401
    payload = authenticate(auth_token[7:])
    if not payload or payload['role'] != 'student':
        return jsonify({"error": "Unauthorized"}), 403
    submissions_list = list(submissions.find({"studentName": payload['username']}))
    for item in submissions_list:
        if '_id' in item:
            item['_id'] = str(item['_id'])
    return jsonify(submissions_list), 200

@app.route('/api/leaderboard/<token>', methods=['GET'])
def leaderboard(token):
    auth_token = request.headers.get('Authorization')
    if not auth_token or not auth_token.startswith('Bearer '):
        return jsonify({"error": "No token provided"}), 401
    payload = authenticate(auth_token[7:])
    if not payload:
        return jsonify({"error": "Unauthorized"}), 403

    submissions_list = list(submissions.find({"token": token}).sort("score", -1))
    total_questions = questions.count_documents({"token": token})
    class_average = sum(sub['score'] for sub in submissions_list) / len(submissions_list) if submissions_list else 0
    leaderboard_data = []
    for i, sub in enumerate(submissions_list, 1):
        user =users.find_one({"username": sub['studentName']})
        real_name = user.get('realName', sub['studentName']) if user else sub['studentName']
        leaderboard_data.append({
            "_id": str(sub['_id']),
            "rank": i,
            "studentName": real_name,
            "score": sub['score'],
            "totalMarks": sub['totalMarks'],
            "submittedAt": sub['submittedAt'].isoformat()
        })
    return jsonify({
        "leaderboard": leaderboard_data,
        "classAverage": round(class_average, 2),
        "totalQuestions": total_questions
    }), 200

@app.route('/api/teacher/history', methods=['GET'])
def teacher_history():
    auth_token = request.headers.get('Authorization')
    if not auth_token or not auth_token.startswith('Bearer '):
        return jsonify({"error": "No token provided"}), 401
    payload = authenticate(auth_token[7:])
    if not payload or payload['role'] != 'teacher':
        return jsonify({"error": "Unauthorized"}), 403
    user = users.find_one({"_id": ObjectId(payload['id'])})
    conducted_tests = user.get('conductedTests', [])
    return jsonify({"conductedTests": conducted_tests}), 200

@app.route('/api/student/history', methods=['GET'])
def student_history():
    auth_token = request.headers.get('Authorization')
    if not auth_token or not auth_token.startswith('Bearer '):
        return jsonify({"error": "No token provided"}), 401
    payload = authenticate(auth_token[7:])
    if not payload or payload['role'] != 'student':
        return jsonify({"error": "Unauthorized"}), 403
    user = users.find_one({"_id": ObjectId(payload['id'])})
    attended_tests = user.get('attendedTests', [])
    return jsonify({"attendedTests": attended_tests}), 200

@app.route('/api/debug-password', methods=['POST'])
def debug_password():
    data = request.get_json()
    password = data.get('password')
    stored_hash = data.get('storedHash')
    if not password or not stored_hash:
        return jsonify({"error": "Missing password or stored hash"}), 400
    hashed = hashpw(password.encode('utf-8'), gensalt()).decode('utf-8')
    logger.info(f"Generated hash for {password}: {hashed}")
    try:
        match = checkpw(password.encode('utf-8'), stored_hash.encode('utf-8'))
        logger.info(f"Password match with stored hash: {match}")
    except Exception as e:
        logger.error(f"Error during password comparison: {e}")
        return jsonify({"error": f"Password comparison failed: {e}"}), 500
    return jsonify({"generatedHash": hashed, "match": match}), 200

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.json_encoder = mongo_to_json
    app.run(debug=True, host='0.0.0.0', port=port)