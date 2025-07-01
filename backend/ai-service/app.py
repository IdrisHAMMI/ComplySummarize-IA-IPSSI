from flask import Flask, request, jsonify
from transformers import pipeline
import os
import logging

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

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'model': model_name,
        'service': 'DistilBART Summarization',
        'version': '1.0.0'
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
        
        # Paramètres avec valeurs par défaut
        max_length = min(parameters.get('max_length', 150), 512)
        min_length = max(parameters.get('min_length', 30), 10)
        do_sample = parameters.get('do_sample', False)
        
        # Vérifier la longueur du texte (DistilBART limite)
        words = text.split()
        if len(words) > 1024:
            logger.warning(f"Text trop long: {len(words)} mots. Troncature à 1024 mots.")
            text = ' '.join(words[:1024])
        
        # Générer le résumé
        result = summarizer(
            text,
            max_length=max_length,
            min_length=min_length,
            do_sample=do_sample,
            truncation=True
        )
        
        logger.info(f"Résumé généré avec succès. Longueur: {len(result[0]['summary_text'])}")
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Erreur lors du résumé: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=False)