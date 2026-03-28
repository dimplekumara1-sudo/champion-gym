import requests
from dotenv import load_dotenv
import os

load_dotenv()
url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_KEY')

headers = {
    'Authorization': f'Bearer {key}',
    'Content-Type': 'application/json'
}

print('Testing Supabase REST API')
print(f'URL: {url}')
print(f'Key: {key[:50]}...' if key else 'No key')

# Test the connection
test_url = f'{url}/rest/v1/profiles?limit=1'
print(f'Testing: {test_url}')
try:
    resp = requests.get(test_url, headers=headers, timeout=10)
    print(f'Status: {resp.status_code}')
    print(f'Response: {resp.text[:300]}' if resp.text else 'No response body')
except Exception as e:
    print(f'Error: {e}')
