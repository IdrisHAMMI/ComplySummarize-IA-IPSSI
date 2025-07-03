# ai-service/app.py
from flask import Flask, request, jsonify
from transformers import pipeline
import os
import logging
import re

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Charger le modèle DistilBART
model_name = os.getenv('MODEL_NAME', 'sshleifer/distilbart-cnn-12-6')
logger.info(f"Chargement du modèle: {model_name}")

try:
    summarizer = pipeline('summarization', model=model_name)
    logger.info("Modèle chargé avec succès")
except Exception as e:
    logger.error(f"Erreur lors du chargement du modèle: {e}")
    raise

# Patterns de détection PII pour l'anonymisation post-traitement
PII_PATTERNS = {
    # Emails
    'email': (r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[EMAIL]'),
    
    # Numéros de téléphone français
    'phone_fr': (r'(?:\+33|0)\s?[1-9](?:\s?\d{2}){4}', '[TELEPHONE]'),
    'phone_generic': (r'\b\d{2,4}[-.\s]?\d{2,4}[-.\s]?\d{2,4}[-.\s]?\d{2,4}\b', '[TELEPHONE]'),
    
    # Numéros de sécurité sociale français
    'ssn_fr': (r'\b[12]\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{3}(?:\s?\d{2})?\b', '[NSS]'),
    
    # Cartes bancaires
    'credit_card': (r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b', '[CARTE]'),
    
    # IBAN
    'iban': (r'\b[A-Z]{2}\d{2}[\s]?[A-Z0-9]{4,30}\b', '[IBAN]'),
    
    # Adresses IP
    'ip_address': (r'\b(?:\d{1,3}\.){3}\d{1,3}\b', '[IP]'),
    
    # Dates format français (DD/MM/YYYY)
    'date_fr': (r'\b(0[1-9]|[12][0-9]|3[01])[\/\-\.](0[1-9]|1[012])[\/\-\.](19|20)\d\d\b', '[DATE]'),
    
    # Codes postaux français
    'postal_code': (r'\b((?:0[1-9])|(?:[1-8][0-9])|(?:9[0-8]))[0-9]{3}\b', '[CODE_POSTAL]'),
}

# Listes de noms communs pour la détection
COMMON_FIRST_NAMES = {
    'fr': ['Jean', 'Marie', 'Pierre', 'Michel', 'André', 'Philippe', 'Alain', 'Jacques',
           'Bernard', 'Claude', 'Françoise', 'Monique', 'Nicole', 'Nathalie', 'Isabelle',
           'Sylvie', 'Catherine', 'Christine', 'Martine', 'Anne', 'Sophie', 'Julie',
           'Paul', 'Lucas', 'Louis', 'Gabriel', 'Raphaël', 'Jules', 'Adam', 'Léo',
           'Emma', 'Jade', 'Louise', 'Alice', 'Chloé', 'Lina', 'Rose', 'Léa', 'Idris', 'IDRIS', 'idris'],
    'en': ['John', 'James', 'Robert', 'Michael', 'William', 'David', 'Richard',
           'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Idris', 'IDRIS', 'idris']
}

COMMON_LAST_NAMES = {
    'fr': ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit',
           'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel',
           'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel', "HAMMI", "Hammi", "hammi"],
    'en': ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis',
           'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', "HAMMI", "Hammi", "hammi"]
}

def detect_language(text):
    """Détection simple de la langue basée sur des mots-clés"""
    french_indicators = ['le', 'la', 'les', 'de', 'des', 'un', 'une', 'et', 'est', 'pour', 'avec', 'dans', 'sur']
    english_indicators = ['the', 'is', 'are', 'and', 'or', 'with', 'for', 'in', 'on', 'at', 'to', 'of']
    
    text_lower = text.lower()
    words = text_lower.split()[:100]  # Analyser seulement les 100 premiers mots
    
    french_count = sum(1 for word in words if word in french_indicators)
    english_count = sum(1 for word in words if word in english_indicators)
    
    return 'fr' if french_count > english_count else 'en'

def anonymize_text(text, language='fr'):
    """Anonymise le texte en remplaçant les PII détectées"""
    anonymized_text = text
    anonymization_log = []
    
    # Appliquer tous les patterns regex
    for pii_type, (pattern, replacement) in PII_PATTERNS.items():
        matches = list(re.finditer(pattern, anonymized_text, re.IGNORECASE))
        for match in reversed(matches):  # Parcourir en sens inverse pour préserver les positions
            original = match.group()
            start, end = match.span()
            
            # Vérifications contextuelles pour certains patterns
            if pii_type == 'postal_code':
                # Vérifier le contexte pour éviter les faux positifs
                context_start = max(0, start - 30)
                context = anonymized_text[context_start:end + 30].lower()
                if not any(word in context for word in ['adresse', 'rue', 'avenue', 'boulevard', 'habite', 'domicile']):
                    continue
            
            anonymized_text = anonymized_text[:start] + replacement + anonymized_text[end:]
            anonymization_log.append({
                'type': pii_type,
                'original': original,
                'replacement': replacement
            })
    
    # Détecter et remplacer les noms propres
    first_names = COMMON_FIRST_NAMES.get(language, COMMON_FIRST_NAMES['fr'])
    last_names = COMMON_LAST_NAMES.get(language, COMMON_LAST_NAMES['fr'])
    
    # Pattern pour les noms complets
    for first in first_names:
        for last in last_names:
            full_name_pattern = rf'\b{first}\s+{last}\b'
            matches = list(re.finditer(full_name_pattern, anonymized_text, re.IGNORECASE))
            for match in reversed(matches):
                anonymized_text = anonymized_text[:match.start()] + '[PERSONNE]' + anonymized_text[match.end():]
                anonymization_log.append({
                    'type': 'full_name',
                    'original': match.group(),
                    'replacement': '[PERSONNE]'
                })
    
    # Pattern pour les adresses (rue, avenue, etc.)
    address_pattern = r'\b\d{1,4}\s+(?:rue|avenue|boulevard|allée|place|chemin|impasse)\s+[A-Za-zÀ-ÿ\s\-\']+'
    matches = list(re.finditer(address_pattern, anonymized_text, re.IGNORECASE))
    for match in reversed(matches):
        anonymized_text = anonymized_text[:match.start()] + '[ADRESSE]' + anonymized_text[match.end():]
        anonymization_log.append({
            'type': 'address',
            'original': match.group(),
            'replacement': '[ADRESSE]'
        })
    
    return anonymized_text, anonymization_log

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'model': model_name,
        'service': 'DistilBART Summarization with PII Protection',
        'version': '2.1.0',
        'features': {
            'summarization': True,
            'pii_anonymization': True,
            'language_detection': True,
            'post_processing': True
        }
    })

@app.route('/summarize', methods=['POST'])
def summarize():
    try:
        data = request.json
        
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
            
        text = data.get('inputs', '')
        parameters = data.get('parameters', {})
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        # Récupérer les paramètres
        max_length = min(parameters.get('max_length', 200), 512)
        min_length = max(parameters.get('min_length', 50), 10)
        do_sample = parameters.get('do_sample', False)
        enable_anonymization = parameters.get('enable_anonymization', True)
        language = parameters.get('language', None)
        
        # Détecter la langue si non spécifiée
        if language is None:
            language = detect_language(text)
        
        logger.info(f"Summarization request - Length: {len(text)}, Language: {language}, Anonymization: {enable_anonymization}")
        
        # Vérifier la longueur du texte
        words = text.split()
        if len(words) > 1024:
            logger.warning(f"Text trop long: {len(words)} mots. Troncature à 1024 mots.")
            text = ' '.join(words[:1024])
        
        # Générer le résumé SANS les instructions d'anonymisation
        try:
            result = summarizer(
                text,  # Texte original sans modification
                max_length=max_length,
                min_length=min_length,
                do_sample=do_sample,
                truncation=True
            )
        except Exception as e:
            logger.error(f"Erreur lors de la génération du résumé: {e}")
            # En cas d'erreur, essayer avec un texte plus court
            shorter_text = ' '.join(text.split()[:500])
            result = summarizer(
                shorter_text,
                max_length=max_length,
                min_length=min_length,
                do_sample=do_sample,
                truncation=True
            )
        
        # Anonymiser le résumé APRÈS génération si demandé
        if enable_anonymization and result and len(result) > 0:
            original_summary = result[0]['summary_text']
            anonymized_summary, anonymization_log = anonymize_text(original_summary, language)
            
            result[0]['summary_text'] = anonymized_summary
            result[0]['anonymized'] = True
            result[0]['pii_detected'] = len(anonymization_log) > 0
            result[0]['pii_count'] = len(anonymization_log)
            
            # Log pour debug
            if anonymization_log:
                logger.info(f"PII détectées et anonymisées: {len(anonymization_log)}")
                for item in anonymization_log[:5]:  # Log les 5 premières
                    logger.debug(f"  - {item['type']}: {item['original'][:20]}... -> {item['replacement']}")
        
        logger.info(f"Résumé généré avec succès. Longueur: {len(result[0]['summary_text'])}")
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Erreur lors du résumé: {str(e)}")
        return jsonify({
            'error': f'Erreur lors de la génération du résumé: {str(e)}',
            'details': 'Vérifiez que le texte n\'est pas trop long ou mal formaté'
        }), 500

@app.route('/test', methods=['GET'])
def test():
    """Route de test pour vérifier l'anonymisation"""
    test_text = """Jean Martin, directeur chez TechCorp, peut être contacté au 06.12.34.56.78 
    ou par email à jean.martin@techcorp.fr. Son numéro de sécurité sociale est 1 85 05 75 234 567 89.
    Il habite au 123 rue de la République, 75001 Paris. 
    Le projet vise à améliorer l'efficacité des processus de l'entreprise en automatisant 
    les tâches répétitives et en optimisant les flux de travail."""
    
    try:
        # Générer le résumé normal
        result = summarizer(test_text, max_length=100, min_length=30)
        original_summary = result[0]['summary_text']
        
        # Anonymiser le résumé
        anonymized_summary, anonymization_log = anonymize_text(original_summary, 'fr')
        
        return jsonify({
            'test_text': test_text[:100] + '...',
            'original_summary': original_summary,
            'anonymized_summary': anonymized_summary,
            'pii_found': len(anonymization_log),
            'pii_types': list(set(item['type'] for item in anonymization_log))
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/anonymize', methods=['POST'])
def anonymize_only():
    """Route pour tester uniquement l'anonymisation sans résumé"""
    try:
        data = request.json
        if not data or 'text' not in data:
            return jsonify({'error': 'No text provided'}), 400
        
        text = data.get('text', '')
        language = data.get('language', None)
        
        if language is None:
            language = detect_language(text)
        
        anonymized_text, anonymization_log = anonymize_text(text, language)
        
        return jsonify({
            'original_length': len(text),
            'anonymized_text': anonymized_text,
            'pii_found': len(anonymization_log),
            'pii_details': anonymization_log[:10],  # Limiter à 10 pour éviter une réponse trop longue
            'language_detected': language
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=False)