import warnings
warnings.filterwarnings("ignore")
import torch
from transformers import T5ForConditionalGeneration, T5Tokenizer
from sense2vec import Sense2Vec
from sentence_transformers import SentenceTransformer
import random
import numpy as np
import nltk
from nltk.corpus import wordnet as wn
from nltk.tokenize import sent_tokenize
from nltk.corpus import stopwords
import string
import pke
import traceback
from flashtext import KeywordProcessor
from collections import OrderedDict, Counter
from sklearn.metrics.pairwise import cosine_similarity
import pickle
import os
import sys
import subprocess
from strsimpy.normalized_levenshtein import NormalizedLevenshtein
import spacy
import pdfplumber
import re
from typing import List, Dict, Optional

# Global variables for models
s2v = None
summary_model = None
summary_tokenizer = None
question_model = None
question_tokenizer = None
answer_model = None
answer_tokenizer = None
sentence_transformer_model = None

# Check for GPU availability
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Initialize spaCy
try:
    nlp = spacy.load("en_core_web_sm")
except:
    if not os.path.exists("en_core_web_sm"):
        subprocess.check_call([sys.executable, "-m", "spacy", "download", "en_core_web_sm"])
    nlp = spacy.load("en_core_web_sm")

# Download NLTK resources
nltk.download('punkt', quiet=True)
nltk.download('wordnet', quiet=True)
nltk.download('stopwords', quiet=True)
nltk.download('omw-1.4', quiet=True)

# Helper functions
def set_seed(seed):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)

def postprocesstext(content):
    final = ""
    for sent in sent_tokenize(content):
        sent = sent.capitalize()
        final = final + " " + sent
    return final

def summarizer(text, model, tokenizer):
    text = text.strip().replace("\n", " ")
    text = "summarize: " + text
    max_len = 512
    encoding = tokenizer.encode_plus(text, max_length=max_len, pad_to_max_length=False, 
                                    truncation=True, return_tensors="pt").to(device)
    input_ids, attention_mask = encoding["input_ids"], encoding["attention_mask"]
    outs = model.generate(input_ids=input_ids,
                         attention_mask=attention_mask,
                         early_stopping=True,
                         num_beams=3,
                         num_return_sequences=1,
                         no_repeat_ngram_size=2,
                         min_length=75,
                         max_length=300)
    dec = [tokenizer.decode(ids, skip_special_tokens=True) for ids in outs]
    summary = dec[0]
    summary = postprocesstext(summary)
    summary = summary.strip()
    return summary

def get_nouns_multipartite(content):
    out = []
    try:
        extractor = pke.unsupervised.MultipartiteRank()
        extractor.load_document(input=content, language='en')
        pos = {'PROPN', 'NOUN', 'ADJ', 'VERB', 'ADP', 'ADV', 'DET', 'CONJ', 'NUM', 'PRON', 'X'}
        stoplist = list(string.punctuation)
        stoplist += ['-lrb-', '-rrb-', '-lcb-', '-rcb-', '-lsb-', '-rsb-']
        stoplist += stopwords.words('english')
        extractor.candidate_selection(pos=pos)
        extractor.candidate_weighting(alpha=1.1, threshold=0.75, method='average')
        keyphrases = extractor.get_n_best(n=30)
        for val in keyphrases:
            out.append(val[0])
    except:
        out = []
    return out

def get_keywords(originaltext):
    keywords = get_nouns_multipartite(originaltext)
    return keywords

def get_improved_question(context, answer, model, tokenizer, max_attempts=3):
    problem_patterns = [
        r"generate a specific question for",
        r"specific question for",
        r"question for this answer",
        r"what question",
        r"which question"
    ]
    prompt_templates = [
        f"context: {context} answer: {answer} Generate a question for this answer.",
        f"Based on this context: {context} Create a question whose answer is: {answer}",
        f"From the text: {context} Generate a question that has the answer: {answer}",
    ]
    for attempt in range(max_attempts):
        text = prompt_templates[attempt % len(prompt_templates)]
        encoding = tokenizer.encode_plus(text, max_length=512, pad_to_max_length=False, 
                                        truncation=True, return_tensors="pt").to(device)
        input_ids, attention_mask = encoding["input_ids"], encoding["attention_mask"]
        outs = model.generate(input_ids=input_ids,
                             attention_mask=attention_mask,
                             early_stopping=True,
                             num_beams=8,
                             num_return_sequences=5,
                             no_repeat_ngram_size=3,
                             max_length=100)
        questions = [tokenizer.decode(ids, skip_special_tokens=True) for ids in outs]
        filtered_questions = []
        for q in questions:
            q = q.replace("question:", "").strip()
            q = q.replace("Question:", "").strip()
            has_problem = False
            for pattern in problem_patterns:
                if re.search(pattern, q, re.IGNORECASE):
                    has_problem = True
                    break
            if not has_problem and len(q) > 10:
                filtered_questions.append(q)
        if filtered_questions:
            best_question = max(filtered_questions, key=lambda q: len(q.split()))
            if not best_question.endswith("?"):
                best_question += "?"
            best_question = best_question[0].upper() + best_question[1:]
            if "?" in best_question and len(best_question.split()) > 3:
                return best_question
    answer_doc = nlp(answer)
    if any(ent.label_ == "PERSON" for ent in answer_doc.ents):
        fallback = f"Who is {answer}?"
    elif answer.endswith('s') and not answer.endswith('ss'):
        fallback = f"What are {answer}?"
    else:
        fallback = f"What is {answer}?"
    return fallback

def filter_same_sense_words(original, wordlist):
    filtered_words = []
    try:
        base_sense = original.split('|')[1]
        for eachword in wordlist:
            if eachword[0].split('|')[1] == base_sense:
                filtered_words.append(eachword[0].split('|')[0].replace("_", " ").title().strip())
    except:
        for eachword in wordlist:
            try:
                word = eachword[0].split('|')[0].replace("_", " ").title().strip()
                filtered_words.append(word)
            except:
                continue
    return filtered_words

def get_highest_similarity_score(wordlist, wrd):
    normalized_levenshtein = NormalizedLevenshtein()
    score = []
    for each in wordlist:
        try:
            score.append(normalized_levenshtein.similarity(each.lower(), wrd.lower()))
        except:
            score.append(0)
    return max(score) if score else 0

def sense2vec_get_words(word, s2v, topn, question):
    output = []
    try:
        sense = s2v.get_best_sense(word, senses=["NOUN", "PERSON", "PRODUCT", "LOC", "ORG", 
                                                "EVENT", "NORP", "WORK OF ART", "FAC", "GPE", "NUM", "FACILITY"])
        most_similar = s2v.most_similar(sense, n=topn)
        output = filter_same_sense_words(sense, most_similar)
    except:
        output = []
    threshold = 0.6
    final = [word]
    checklist = question.split()
    for x in output:
        if get_highest_similarity_score(final, x) < threshold and x not in final and x not in checklist:
            final.append(x)
    return final[1:]

def mmr(doc_embedding, word_embeddings, words, top_n, lambda_param):
    word_doc_similarity = cosine_similarity(word_embeddings, doc_embedding)
    word_similarity = cosine_similarity(word_embeddings)
    keywords_idx = [np.argmax(word_doc_similarity)]
    candidates_idx = [i for i in range(len(words)) if i != keywords_idx[0]]
    for _ in range(top_n - 1):
        candidate_similarities = word_doc_similarity[candidates_idx, :]
        target_similarities = np.max(word_similarity[candidates_idx][:, keywords_idx], axis=1)
        mmr = (lambda_param) * candidate_similarities - (1-lambda_param) * target_similarities.reshape(-1, 1)
        mmr_idx = candidates_idx[np.argmax(mmr)]
        keywords_idx.append(mmr_idx)
        candidates_idx.remove(mmr_idx)
    return [words[idx] for idx in keywords_idx]

def get_distractors_wordnet(word):
    distractors = []
    try:
        syn = wn.synsets(word, 'n')[0]
        word = word.lower()
        orig_word = word
        if len(word.split()) > 0:
            word = word.replace(" ", "_")
        hypernym = syn.hypernyms()
        if len(hypernym) == 0: 
            return distractors
        for item in hypernym[0].hyponyms():
            name = item.lemmas()[0].name()
            if name == orig_word:
                continue
            name = name.replace("_", " ")
            name = " ".join(w.capitalize() for w in name.split())
            if name is not None and name not in distractors:
                distractors.append(name)
    except:
        pass
    return distractors

def get_improved_distractors(word, origsentence, sense2vecmodel, sentencemodel, top_n=40, lambdaval=0.2):
    distractors_s2v = sense2vec_get_words(word, sense2vecmodel, top_n, origsentence)
    distractors_wordnet = get_distractors_wordnet(word)
    all_distractors = list(set(distractors_s2v + distractors_wordnet))
    if len(all_distractors) < 3:
        try:
            doc = nlp(origsentence)
            word_doc = nlp(word)
            word_ents = [e.label_ for e in word_doc.ents]
            context_entities = []
            for ent in doc.ents:
                if ent.text.lower() != word.lower() and ent.label_ in word_ents:
                    context_entities.append(ent.text)
            all_distractors.extend(context_entities)
            if len(all_distractors) < 3:
                nouns = [token.text for token in doc if token.pos_ == "NOUN" and token.text.lower() != word.lower()]
                all_distractors.extend(nouns)
        except:
            pass
    all_distractors = list(set([d for d in all_distractors if d.lower() != word.lower()]))
    if len(all_distractors) == 0:
        return []
    try:
        embedding_sentence = origsentence + " " + word.capitalize()
        keyword_embedding = sentencemodel.encode([embedding_sentence])
        if all_distractors:
            distractor_embeddings = sentencemodel.encode(all_distractors)
            max_distractors = min(len(all_distractors), 5)
            filtered_distractors = mmr(keyword_embedding, distractor_embeddings, all_distractors, max_distractors, lambdaval)
            final_distractors = []
            for d in filtered_distractors:
                if isinstance(d, str):
                    final_distractors.append(d.capitalize())
            return final_distractors
    except:
        return all_distractors[:3]
    return all_distractors[:3]

def assess_question_difficulty(answer, distractors, sentencemodel):
    try:
        answer_embedding = sentencemodel.encode([answer])[0].reshape(1, -1)
        distractor_embeddings = sentencemodel.encode(distractors)
        similarities = cosine_similarity(answer_embedding, distractor_embeddings)[0]
        max_similarity = max(similarities) if len(similarities) > 0 else 0
        if max_similarity > 0.9:
            return "Difficult", max_similarity
        elif max_similarity > 0.7:
            return "Medium", max_similarity
        else:
            return "Easy", max_similarity
    except:
        return "Medium", 0.8

def preprocess_context(text):
    sentences = sent_tokenize(text)
    sentences = [s for s in sentences if len(s.split()) > 4]
    chunks = []
    current_chunk = ""
    for sentence in sentences:
        if len(current_chunk.split()) + len(sentence.split()) <= 200:
            current_chunk += " " + sentence
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = sentence
    if current_chunk:
        chunks.append(current_chunk.strip())
    return chunks

def extract_key_segments(text, keywords, num_segments=100, min_length=40, max_length=250):
    sentences = sent_tokenize(text)
    sentence_embeddings = sentence_transformer_model.encode(sentences)
    sentence_scores = []
    for i, sentence in enumerate(sentences):
        score = 0
        for keyword in keywords:
            if keyword.lower() in sentence.lower():
                score += 1
        keyword_embeddings = sentence_transformer_model.encode([" ".join(keywords)])
        semantic_score = cosine_similarity([sentence_embeddings[i]], keyword_embeddings)[0][0]
        combined_score = score + (semantic_score * 3)
        sentence_scores.append((sentence, combined_score, i))
    sentence_scores.sort(key=lambda x: (x[1], -x[2]), reverse=True)
    segments = []
    used_indices = set()
    for sentence, score, idx in sentence_scores:
        if len(segments) >= num_segments:
            break
        if idx in used_indices:
            continue
        context_size = random.randint(1, 3)
        start_idx = max(0, idx - context_size)
        end_idx = min(len(sentences), idx + context_size + 1)
        overlap_count = sum(1 for i in range(start_idx, end_idx) if i in used_indices)
        if overlap_count > context_size // 2:
            continue
        segment = " ".join(sentences[start_idx:end_idx])
        if min_length <= len(segment.split()) <= max_length:
            segments.append(segment)
            for i in range(start_idx, end_idx):
                used_indices.add(i)
    if len(segments) < num_segments // 2:
        for i in range(0, len(sentences), 2):
            if len(segments) >= num_segments:
                break
            if i + 3 <= len(sentences):
                segment = " ".join(sentences[i:i+3])
                if min_length <= len(segment.split()) <= max_length:
                    segments.append(segment)
    return segments

def generate_descriptive_question(context, model, tokenizer):
    prompt_templates = [
        f"generate an educational question based on this text: {context}",
        f"create a factual question that tests knowledge from this text: {context}",
        f"form a clear question about an important concept in this text: {context}",
        f"ask a question that would help someone understand this material: {context}",
        f"generate a question that assesses understanding of this content: {context}"
    ]
    prompt = random.choice(prompt_templates)
    encoding = tokenizer.encode_plus(prompt, max_length=512, pad_to_max_length=False, 
                                    truncation=True, return_tensors="pt").to(device)
    input_ids, attention_mask = encoding["input_ids"], encoding["attention_mask"]
    outs = model.generate(input_ids=input_ids,
                         attention_mask=attention_mask,
                         early_stopping=True,
                         num_beams=5,
                         num_return_sequences=5,
                         no_repeat_ngram_size=2,
                         max_length=100)
    questions = [tokenizer.decode(ids, skip_special_tokens=True) for ids in outs]
    filtered_questions = []
    for q in questions:
        q = q.strip()
        if not q.endswith("?"):
            q += "?"
        q = q[0].upper() + q[1:]
        if len(q.split()) > 3 and "?" in q:
            q = re.sub(r"^(generate|create|form|ask|write|make).*?:", "", q, flags=re.IGNORECASE).strip()
            filtered_questions.append(q)
    if not filtered_questions:
        doc = nlp(context)
        subjects = [token.text for token in doc if token.dep_ == "nsubj"]
        if subjects:
            subject = subjects[0]
            fallback = f"What is the significance of {subject} in this context?"
        else:
            entities = [ent.text for ent in doc.ents]
            if entities:
                entity = entities[0]
                fallback = f"What is {entity} and why is it important?"
            else:
                fallback = "What is the main concept discussed in this context?"
        return fallback
    return max(filtered_questions, key=lambda q: len(q.split()))

def is_duplicate(new_question, existing_questions, threshold=0.85):
    if not existing_questions:
        return False
    normalized_levenshtein = NormalizedLevenshtein()
    existing_texts = [q["question"] for q in existing_questions]
    for existing in existing_texts:
        similarity = normalized_levenshtein.similarity(new_question.lower(), existing.lower())
        if similarity > threshold:
            return True
    new_embedding = sentence_transformer_model.encode([new_question])
    existing_embeddings = sentence_transformer_model.encode(existing_texts)
    similarities = cosine_similarity(new_embedding, existing_embeddings)[0]
    if max(similarities) > threshold:
        return True
    return False

def select_relevant_sentences(question, context, num_sentences=8):
    sentences = sent_tokenize(context)
    if len(sentences) <= num_sentences:
        return context
    question_embedding = sentence_transformer_model.encode([question])
    sentence_embeddings = sentence_transformer_model.encode(sentences)
    similarities = cosine_similarity(question_embedding, sentence_embeddings)[0]
    top_indices = similarities.argsort()[-num_sentences:][::-1]
    top_indices = sorted(top_indices)
    extended_indices = set()
    for idx in top_indices:
        extended_indices.add(idx)
        if idx > 0:
            extended_indices.add(idx - 1)
        if idx < len(sentences) - 1:
            extended_indices.add(idx + 1)
    extended_indices = sorted(list(extended_indices))
    if len(extended_indices) > num_sentences + 4:
        sorted_extended = sorted(extended_indices, key=lambda i: similarities[i], reverse=True)
        extended_indices = sorted(sorted_extended[:num_sentences + 4])
    selected_context = " ".join([sentences[i] for i in extended_indices])
    return selected_context

def generate_descriptive_answer(question, context, model, tokenizer):
    selected_context = select_relevant_sentences(question, context, num_sentences=8)
    prompt_templates = [
        f"Answer this question in detail based on the given information. Question: {question} Context: {selected_context} Answer:",
        f"Using only the provided context, answer this question thoroughly. Question: {question} Context: {selected_context} Answer:",
        f"Based on the following information, provide a comprehensive answer to this question. Question: {question} Context: {selected_context} Answer:"
    ]
    prompt = random.choice(prompt_templates)
    encoding = tokenizer.encode_plus(prompt, max_length=768, pad_to_max_length=False, 
                                    truncation=True, return_tensors="pt").to(device)
    input_ids, attention_mask = encoding["input_ids"], encoding["attention_mask"]
    outs = model.generate(input_ids=input_ids,
                         attention_mask=attention_mask,
                         early_stopping=True,
                         num_beams=5,
                         length_penalty=1.5,
                         no_repeat_ngram_size=3,
                         min_length=50,
                         max_length=250)
    answer = tokenizer.decode(outs[0], skip_special_tokens=True)
    answer = postprocesstext(answer)
    answer = re.sub(r"^(The answer is|Answer:|Based on the context|According to the context)", "", answer).strip()
    answer = re.sub(r'([a-z])([A-Z])', r'\1 \2', answer)
    answer = re.sub(r'\.([a-zA-Z])', r'. \1', answer)
    return answer

def assess_question_quality(question, answer, context):
    if len(question.split()) < 3:
        return False, "Question too short"
    if len(answer.split()) < 8:
        return False, "Answer too short"
    question_embedding = sentence_transformer_model.encode([question])
    answer_embedding = sentence_transformer_model.encode([answer])
    context_embedding = sentence_transformer_model.encode([context])
    q_a_similarity = cosine_similarity(question_embedding, answer_embedding)[0][0]
    a_c_similarity = cosine_similarity(answer_embedding, context_embedding)[0][0]
    if q_a_similarity < 0.15:
        return False, "Answer not relevant to question"
    if a_c_similarity < 0.25:
        return False, "Answer not based on context"
    word_freq = Counter(answer.lower().split())
    most_common = word_freq.most_common(1)
    if most_common and most_common[0][1] > 10 and most_common[0][0] not in stopwords.words('english'):
        return False, "Answer too repetitive"
    if re.search(r'[a-z][A-Z]', answer) and len(re.findall(r'[a-z][A-Z]', answer)) > 3:
        return False, "Formatting issues detected"
    sentences = sent_tokenize(answer)
    if len(sentences) >= 3:
        sentence_embeddings = sentence_transformer_model.encode(sentences)
        avg_similarity = 0
        comparisons = 0
        for i in range(len(sentences)):
            for j in range(i+1, len(sentences)):
                avg_similarity += cosine_similarity([sentence_embeddings[i]], [sentence_embeddings[j]])[0][0]
                comparisons += 1
        if comparisons > 0:
            avg_similarity /= comparisons
            if avg_similarity < 0.2:
                return False, "Answer lacks coherence between sentences"
    return True, "Good quality"

def download_and_load_models():
    global s2v, summary_model, summary_tokenizer, question_model, question_tokenizer, answer_model, answer_tokenizer, sentence_transformer_model
    print("Loading sentence transformer model...")
    if os.path.exists("sentence_transformer_model.pkl"):
        with open("sentence_transformer_model.pkl", 'rb') as f:
            sentence_transformer_model = pickle.load(f)
    else:
        sentence_transformer_model = SentenceTransformer("sentence-transformers/msmarco-distilbert-base-v2")
        with open("sentence_transformer_model.pkl", 'wb') as f:
            pickle.dump(sentence_transformer_model, f)
    print("Loading sense2vec model...")
    if os.path.exists('s2v_old') and os.path.isdir('s2v_old'):
        try:
            s2v = Sense2Vec().from_disk('s2v_old')
            print("Successfully loaded existing sense2vec model from s2v_old")
        except Exception as e:
            print(f"Error loading existing model: {e}")
            print("Will download and extract the model again")
            if os.path.exists('s2v_old'):
                import shutil
                if os.path.exists('s2v_old_backup'):
                    shutil.rmtree('s2v_old_backup')
                os.rename('s2v_old', 's2v_old_backup')
            import gdown
            import tarfile
            url = 'https://github.com/explosion/sense2vec/releases/download/v1.0.0/s2v_reddit_2015_md.tar.gz'
            gdown.download(url, 's2v_reddit_2015_md.tar.gz', quiet=False)
            with tarfile.open('s2v_reddit_2015_md.tar.gz', "r:gz") as tar:
                tar.extractall(path="./")
            extracted_files = os.listdir("./")
            s2v_dir = None
            for item in extracted_files:
                if os.path.isdir(item) and (item.startswith("s2v_") and item != 's2v_old'):
                    s2v_dir = item
                    break
            if s2v_dir:
                if os.path.exists('s2v_old'):
                    import shutil
                    shutil.rmtree('s2v_old')
                os.rename(s2v_dir, 's2v_old')
            s2v = Sense2Vec().from_disk('s2v_old')
    else:
        import gdown
        import tarfile
        url = 'https://github.com/explosion/sense2vec/releases/download/v1.0.0/s2v_reddit_2015_md.tar.gz'
        gdown.download(url, 's2v_reddit_2015_md.tar.gz', quiet=False)
        with tarfile.open('s2v_reddit_2015_md.tar.gz', "r:gz") as tar:
            tar.extractall(path="./")
        extracted_files = os.listdir("./")
        s2v_dir = None
        for item in extracted_files:
            if os.path.isdir(item) and (item.startswith("s2v_") and item != 's2v_old'):
                s2v_dir = item
                break
        if s2v_dir:
            if os.path.exists('s2v_old'):
                import shutil
                shutil.rmtree('s2v_old')
            os.rename(s2v_dir, 's2v_old')
        s2v = Sense2Vec().from_disk('s2v_old')
    print("Loading summary model...")
    if os.path.exists("t5_summary_model.pkl"):
        with open('t5_summary_model.pkl', 'rb') as f:
            summary_model = pickle.load(f)
    else:
        summary_model = T5ForConditionalGeneration.from_pretrained('t5-base')
        with open("t5_summary_model.pkl", 'wb') as f:
            pickle.dump(summary_model, f)
    print("Loading summary tokenizer...")
    if os.path.exists("t5_summary_tokenizer.pkl"):
        with open('t5_summary_tokenizer.pkl', 'rb') as f:
            summary_tokenizer = pickle.load(f)
    else:
        summary_tokenizer = T5Tokenizer.from_pretrained('t5-base')
        with open("t5_summary_tokenizer.pkl", 'wb') as f:
            pickle.dump(summary_tokenizer, f)
    print("Loading question model...")
    if os.path.exists("t5_question_model.pkl"):
        with open('t5_question_model.pkl', 'rb') as f:
            question_model = pickle.load(f)
    else:
        question_model = T5ForConditionalGeneration.from_pretrained('ramsrigouthamg/t5_squad_v1')
        with open("t5_question_model.pkl", 'wb') as f:
            pickle.dump(question_model, f)
    print("Loading question tokenizer...")
    if os.path.exists("t5_question_tokenizer.pkl"):
        with open('t5_question_tokenizer.pkl', 'rb') as f:
            question_tokenizer = pickle.load(f)
    else:
        question_tokenizer = T5Tokenizer.from_pretrained('ramsrigouthamg/t5_squad_v1')
        with open("t5_question_tokenizer.pkl", 'wb') as f:
            pickle.dump(question_tokenizer, f)
    print("Loading answer model...")
    if os.path.exists("t5_answer_model.pkl"):
        with open('t5_answer_model.pkl', 'rb') as f:
            answer_model = pickle.load(f)
    else:
        answer_model = T5ForConditionalGeneration.from_pretrained('google/flan-t5-large')
        with open("t5_answer_model.pkl", 'wb') as f:
            pickle.dump(answer_model, f)
    print("Loading answer tokenizer...")
    if os.path.exists("t5_answer_tokenizer.pkl"):
        with open('t5_answer_tokenizer.pkl', 'rb') as f:
            answer_tokenizer = pickle.load(f)
    else:
        answer_tokenizer = T5Tokenizer.from_pretrained('google/flan-t5-large')
        with open("t5_answer_tokenizer.pkl", 'wb') as f:
            pickle.dump(answer_tokenizer, f)
    summary_model = summary_model.to(device)
    question_model = question_model.to(device)
    answer_model = answer_model.to(device)
    print("All models loaded successfully!")

def get_mcq_questions(context, max_questions=10) -> List[Dict]:
    global s2v, summary_model, summary_tokenizer, question_model, question_tokenizer, sentence_transformer_model
    if s2v is None or summary_model is None:
        download_and_load_models()
    chunks = preprocess_context(context)
    summarized_text = summarizer(context, summary_model, summary_tokenizer)
    imp_keywords = get_keywords(context)
    entities = []
    doc = nlp(context)
    for ent in doc.ents:
        if ent.label_ in ["PERSON", "ORG", "GPE", "LOC", "PRODUCT", "EVENT", "DATE"]:
            entities.append(ent.text)
    all_answers = list(set(imp_keywords + entities))
    random.shuffle(all_answers)
    qualified_questions = []
    for answer in all_answers:
        if len(qualified_questions) >= max_questions:
            break
        if len(answer) < 2 or all(c in string.punctuation for c in answer):
            continue
        relevant_context = ""
        for chunk in chunks:
            if answer.lower() in chunk.lower():
                relevant_context = chunk
                break
        if not relevant_context:
            relevant_context = summarized_text
        question = get_improved_question(relevant_context, answer, question_model, question_tokenizer)
        if not question or len(question.split()) < 4 or question.lower().startswith("what question"):
            continue
        distractors = get_improved_distractors(answer, relevant_context, s2v, sentence_transformer_model)
        if len(distractors) < 3:
            continue
        distractors = distractors[:3]
        difficulty, similarity_score = assess_question_difficulty(answer, distractors, sentence_transformer_model)
        question_data = {
            "question": question,
            "options": [answer] + distractors,
            "correct": answer,
            "correct_index": 0,
            "context": relevant_context,
            "difficulty": difficulty
        }
        random.shuffle(question_data["options"])
        question_data["correct_index"] = question_data["options"].index(answer)
        qualified_questions.append(question_data)
    return qualified_questions

def get_descriptive_questions(context, max_questions=10) -> List[Dict]:
    global s2v, summary_model, summary_tokenizer, question_model, question_tokenizer, answer_model, answer_tokenizer, sentence_transformer_model
    if summary_model is None or question_model is None or answer_model is None or sentence_transformer_model is None:
        download_and_load_models()
    chunks = preprocess_context(context)
    try:
        summarized_text = summarizer(context, summary_model, summary_tokenizer)
    except:
        summarized_text = " ".join(chunks[:2])
    try:
        keywords = get_keywords(context)
    except:
        words = context.lower().split()
        words = [w for w in words if w not in stopwords.words('english') and len(w) > 3]
        keywords = [word for word, _ in Counter(words).most_common(15)]
    try:
        key_segments = extract_key_segments(context, keywords)
    except:
        key_segments = chunks[:max_questions]
    if len(key_segments) < max_questions * 2:
        more_needed = max_questions * 2 - len(key_segments)
        for chunk in chunks:
            if chunk not in key_segments and more_needed > 0:
                key_segments.append(chunk)
                more_needed -= 1
    if len(key_segments) < max_questions * 2:
        sentences = sent_tokenize(context)
        for i in range(0, len(sentences), 3):
            if i + 3 <= len(sentences) and len(key_segments) < max_questions * 2:
                segment = " ".join(sentences[i:i+3])
                if segment not in key_segments and 40 <= len(segment.split()) <= 250:
                    key_segments.append(segment)
    random.shuffle(key_segments)
    qualified_questions = []
    for segment in key_segments:
        if len(qualified_questions) >= max_questions:
            break
        try:
            question = generate_descriptive_question(segment, question_model, question_tokenizer)
            if is_duplicate(question, qualified_questions):
                continue
            answer = generate_descriptive_answer(question, context, answer_model, answer_tokenizer)
            is_good, reason = assess_question_quality(question, answer, context)
            if is_good:
                doc = nlp(answer)
                num_sentences = len(list(doc.sents))
                avg_sentence_length = len(answer.split()) / max(1, num_sentences)
                complexity_score = min(100, (avg_sentence_length * 2) + (num_sentences * 3))
                question_data = {
                    "question": question,
                    "answer": answer,
                    "complexity": int(complexity_score),
                    "context": segment,
                    "difficulty": "Medium" if complexity_score < 60 else "Hard"
                }
                qualified_questions.append(question_data)
        except:
            continue
    if len(qualified_questions) < max_questions:
        for _ in range(min(5, max_questions - len(qualified_questions))):
            try:
                question = generate_descriptive_question(summarized_text, question_model, question_tokenizer)
                if is_duplicate(question, qualified_questions):
                    continue
                answer = generate_descriptive_answer(question, context, answer_model, answer_tokenizer)
                is_good, reason = assess_question_quality(question, answer, context)
                if is_good:
                    doc = nlp(answer)
                    num_sentences = len(list(doc.sents))
                    avg_sentence_length = len(answer.split()) / max(1, num_sentences)
                    complexity_score = min(100, (avg_sentence_length * 2) + (num_sentences * 3))
                    question_data = {
                        "question": question,
                        "answer": answer,
                        "complexity": int(complexity_score),
                        "context": summarized_text,
                        "difficulty": "Medium" if complexity_score < 60 else "Hard"
                    }
                    qualified_questions.append(question_data)
            except:
                continue
    return qualified_questions

def extract_text_from_pdf(pdf_path: str) -> str:
    try:
        text = ""
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    cleaned_text = re.sub(r'\s+', ' ', page_text).strip()
                    text += cleaned_text + " "
        text = text.replace('\n', ' ').strip()
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'•', '*', text)
        text = re.sub(r'[^\x00-\x7F]+', '', text)
        return text
    except Exception as e:
        print(f"Error reading PDF: {e}")
        return ""

def generate_mcqs(text: str, num_mcqs: int) -> List[Dict]:
    return get_mcq_questions(text, max_questions=num_mcqs)

def generate_descriptive_questions(text: str, num_descriptive: int) -> List[Dict]:
    return get_descriptive_questions(text, max_questions=num_descriptive)