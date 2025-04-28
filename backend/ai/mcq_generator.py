from ai.question_generator import QuestionGenerator

def generate_mcqs(text, num_mcqs):
    qg = QuestionGenerator()
    return qg.generate_mcqs(text, num_mcqs)

def generate_descriptive_questions(pdf_content, num_descriptive):
    qg = QuestionGenerator()
    return qg.generate_descriptive_questions(pdf_content, num_descriptive)