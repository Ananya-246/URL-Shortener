from flask import Flask, request, jsonify, redirect
from flask_cors import CORS
from pymongo import MongoClient
import os
import string
import hashlib
import random
from datetime import datetime 
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
client = MongoClient(MONGO_URI) #connection with mongodb is estb
db = client['url_shortener'] #use or create db named "url_shortener"
urls_collection = db['urls']
analytics_collection = db['analytics']

cache = {} #for easy, faster short url access, bcoz mongodb is slow
CACHE_SIZE = 1000

BASE62 = string.ascii_letters + string.digits #a-zA-Z0-9

def generate_short_code(url, custom_alias= None):
    """Generate a unique short code using Base62 encoding"""

    if custom_alias:
        if urls_collection.find_one({'short_code': custom_alias}):
            return None
        return custom_alias
    
    hash_object = hashlib.md5(url.encode()) #converts URL to MD5 hash code
    hash_hex = hash_object.hexdigest() # conerts hash into human readable hex string (like character 0-9+a-f)

    hash_int = int(hash_hex[:16], 16) #convert hex string to int
    short_code = base62_encode(hash_int)[:7] #convert int to base62 code (7 if u want the URL to be 7 letter only)

    #collision handling (if 2 diff URLs generate same hash)
    counter = 0
    original_code = short_code
    while urls_collection.find_one({'short_code': short_code}):
        counter+=1
        short_code =original_code+base62_encode(counter)[:2] #add extra string to make the URLs unique in case of collision

    return short_code

def base62_encode(num):
    """Encode number to base62 string"""
    if num==0:
        return BASE62[0]
    
    result = []
    while num:
        result.append(BASE62[num%62])
        num//=62
    
    return ''.join(reversed(result))

def update_cache(short_code, original_url):
    if len(cache)>=CACHE_SIZE:
        cache.pop(next(iter(cache))) #remove random item
    cache[short_code] = original_url

@app.route('/api/shorten', methods = ['POST'])
def shorten_url():
    """Create a shortened URL"""
    data = request.get_json()

    if not data or 'url' not in data:
        return jsonify({'error': 'URL is required'}), 400
    
    original_url = data['url']
    custom_alias = data.get('custom_alias') #.get bcoz custom alias is optional

    if not original_url.startswith(('http://', 'https://')):
        original_url = 'https://'+original_url

    existing = urls_collection.find_one({'original_url': original_url})
    if existing and not custom_alias:
        return jsonify({
            'short_code': existing['short_code'],
            'short_url': f"http://localhost:5000/{existing['short_code']}",
            'original_url': original_url
        })
    
    short_code = generate_short_code(original_url, custom_alias)

    if not short_code:
        return jsonify({'error':'custom alias already taken'}), 409
    
    #url_doc is a python dictionary in memory
    url_doc = {
        'short_code':short_code,
        'original_url':original_url,
        'created_at': datetime.utcnow(),
        'click_count': 0
    }

    urls_collection.insert_one(url_doc) #the dict is then stored in db
    update_cache(short_code, original_url)

    return jsonify({
        'short_code': short_code,
        'short_url': f"http://localhost:5000/{short_code}",
        'original_url':original_url
    }), 201

@app.route('/<short_code>', methods=['GET'])
def redirect_url(short_code):
    """redirect to original url"""
    if short_code in cache:
        original_url = cache[short_code]
    else:
        url_doc = urls_collection.find_one({'short_code': short_code})

        if not url_doc:
            return jsonify({'error':'URL not found'}), 404
        
        original_url = url_doc['original_url']
        update_cache(short_code, original_url)

    urls_collection.update_one(
        {'short_code':short_code},
        {'$inc': {'click_count':1}}
    )

    analytics_collection.insert_one({
        'short_code' : short_code,
        'timestamp' : datetime.utcnow(),
        'user_agent' : request.headers.get('User_Agent'),
        'ip_address' : request.remote_addr
    })

    return redirect(original_url)

@app.route('/api/analytics/<short_code>', methods =['GET'])
def get_analytics(short_code):
    """Get analytics for a short URL"""
    url_doc = urls_collection.find_one({'short_code': short_code})

    if not url_doc:
        return jsonify({'error':'URL not found'}), 404
    
    clicks = list(analytics_collection.find(
        {'short_code':short_code},
        {'_id':0,'timestamp':1}
    ).sort('timestamp', -1).limit(100))

    return jsonify({
        'short_code':short_code,
        'original_url':url_doc['original_url'],
        'created_at' : url_doc['created_at'].isoformat(),
        'total_clicks': url_doc['click_count'],
        'recent_clicks': clicks
    })

@app.route('/api/urls', methods=['GET'])
def list_urls():
    """List all shortened URLs"""
    urls = list(urls_collection.find(
        {},
        {'_id': 0, 'short_code': 1, 'original_url': 1, 'created_at': 1, 'click_count': 1}
    ).sort('created_at', -1).limit(50))
    
    for url in urls:
        url['created_at'] = url['created_at'].isoformat()
        url['short_url'] = f"http://localhost:5000/{url['short_code']}"
    
    return jsonify({'urls': urls})

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'cache_size': len(cache),
        'timestamp': datetime.utcnow().isoformat()
    })

if __name__ == '__main__':
    urls_collection.create_index('short_code', unique = True)
    urls_collection.create_index('original_url')
    analytics_collection.create_index('short_code')

    app.run(debug=True, port=5000)